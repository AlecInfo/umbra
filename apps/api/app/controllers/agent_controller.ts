import type { HttpContext } from '@adonisjs/core/http'
import { randomBytes } from 'node:crypto'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import AgentToken from '#models/agent_token'
import Node from '#models/node'
import NodePeerStat from '#models/node_peer_stat'
import User from '#models/user'
import { heartbeatValidator, registerValidator } from '#validators/agent'
import { hashAgentToken } from '#services/agent_auth'
import { headscaleClient, tenantForOwner } from '#services/headscale_client'
import { resolveOfflineAlerts } from '#services/offline_watch'
import { readReleaseManifest } from '#services/agent_release'
import { recordNodeEvent } from '#services/node_events'
import { markExitRoutesVerified } from '#services/exit_routes'
import { publicAddress } from '#services/public_address'
import { ensureDefaultRules, evaluateMetricAlerts } from '#services/alerts'

// Next allowed attempt (epoch ms) of the per-node exit-route self-heal.
// In-memory on purpose: resets on API restart, and the operation is idempotent.
const nextRouteEnsureAt = new Map<string, number>()

export default class AgentController {
  // POST /api/v1/agent/register — Go agent spec format
  // Token in body as "token" + X-Agent-Token header
  async register({ request, response }: HttpContext) {
    const payload = await request.validateUsing(registerValidator)

    // Accept token from body or X-Agent-Token header
    const rawToken = payload.token || request.header('x-agent-token')
    if (!rawToken) {
      return response.unauthorized({ message: "Token d'enrôlement manquant" })
    }

    const enrollHash = hashAgentToken(rawToken)
    const agentToken = await AgentToken.query()
      .where('token_hash', enrollHash)
      .whereNull('used_at')
      .where('expires_at', '>', DateTime.now().toSQL()!)
      .first()

    if (!agentToken) {
      return response.unauthorized({ message: "Token d'enrôlement invalide ou expiré" })
    }

    // Find or create the node
    let node: Node | null = agentToken.nodeId ? await Node.find(agentToken.nodeId) : null

    if (!node) {
      node = await Node.create({
        ownerUserId: agentToken.targetOrgId ? null : agentToken.createdBy,
        ownerOrgId: agentToken.targetOrgId,
        name: agentToken.nodeName ?? payload.hostname ?? 'unnamed-node',
        category: 'other',
        status: 'pending',
        supportsWireguard: true,
        supportsOpenvpn: false,
      })
      agentToken.nodeId = node.id
    }

    node.merge({
      hostname: payload.hostname ?? node.hostname,
      wireguardPubkey: payload.wireguard_pubkey ?? node.wireguardPubkey,
      hardwareModel: payload.hardware_model ?? node.hardwareModel,
      arch: payload.arch ?? node.arch,
      osVersion: payload.os_version ?? node.osVersion,
      agentVersion: payload.agent_version ?? node.agentVersion,
      // What the agent sends is its LAN address; the public one is what we see.
      ipAddress: publicAddress(request.ip()) ?? publicAddress(node.ipAddress),
      status: 'online',
      lastSeenAt: DateTime.now(),
    })
    await node.save()

    // Issue long-lived agent JWT and mark enroll token as used
    const rawAgentToken = `umbra_agent_${randomBytes(32).toString('hex')}`
    agentToken.tokenHash = hashAgentToken(rawAgentToken)
    agentToken.usedAt = DateTime.now()
    agentToken.expiresAt = DateTime.now().plus({ days: 90 })
    await agentToken.save()

    await ensureDefaultRules(node.id, agentToken.createdBy)

    // A personal node starts with its owner's agent defaults.
    if (node.ownerUserId) {
      const owner = await User.find(node.ownerUserId)
      if (owner?.agentDefaults) {
        node.heartbeatIntervalSeconds = owner.agentDefaults.heartbeatIntervalSeconds
        node.autoUpdate = owner.agentDefaults.autoUpdate
        await node.save()
      }
    }
    await recordNodeEvent(node.id, 'enrolled', {
      actorUserId: agentToken.createdBy,
      data: { hostname: node.hostname, agentVersion: node.agentVersion },
    })

    // Create a Headscale pre-auth key for this node (if Headscale is configured).
    // The node joins its owner's tenant user; the regenerated policy keeps
    // tenants isolated from each other at the network level.
    let headscaleAuthKey: string | null = null
    const tenant = tenantForOwner(node.ownerUserId, node.ownerOrgId)
    // Always hand out the public Headscale URL: the agent runs on a remote
    // machine, so internal/docker hostnames are never reachable from there.
    const headscaleExternalURL = process.env.HEADSCALE_EXTERNAL_URL ?? 'http://localhost:8080'
    if (headscaleClient.isConfigured) {
      try {
        await headscaleClient.ensureUser(tenant)
        await headscaleClient.syncPolicy()
        headscaleAuthKey = await headscaleClient.createPreAuthKey(tenant)
      } catch (err) {
        console.error('Headscale pre-auth key creation failed:', err)
      }
    }

    return response.created({
      node_id: node.id,
      auth_token: rawAgentToken,
      headscale_auth_key: headscaleAuthKey,
      headscale_url: headscaleExternalURL,
    })
  }

  // GET /api/v1/agent/version?arch=linux-arm64 — latest release for auto-update.
  // Reads the manifest written by umbra-agent/build-releases.sh; the signature
  // is ed25519 (verified by the agent with its embedded public key).
  async version({ request, response }: HttpContext) {
    const arch = String(request.input('arch', 'linux-amd64'))
    if (!/^linux-(amd64|arm64|armv7)$/.test(arch)) {
      return response.badRequest({ message: 'Unknown arch' })
    }

    const manifest = await readReleaseManifest()
    if (!manifest) return response.notFound({ message: 'No release manifest' })

    const bin = manifest.binaries?.[arch]
    if (!bin) return response.notFound({ message: 'No release for this arch' })

    const base = (process.env.API_PUBLIC_URL ?? 'http://localhost:3333/api/v1').replace(/\/api\/v1\/?$/, '')
    return {
      version: manifest.version,
      url: `${base}/releases/umbra-agent-${arch}`,
      signature: bin.signature,
      sha256: bin.sha256,
    }
  }

  // POST /api/v1/agent/heartbeat — Go agent spec: metrics + peers inline
  async heartbeat(ctx: HttpContext) {
    const node = ctx.agentNode
    const payload = await ctx.request.validateUsing(heartbeatValidator)

    const wasOffline = node.status === 'offline'
    const offlineSince = node.lastSeenAt
    const previousVersion = node.agentVersion
    node.merge({
      agentVersion: payload.agent_version ?? node.agentVersion,
      agentReportedConfig: payload.config
        ? {
            heartbeatIntervalSeconds: payload.config.heartbeat_interval_seconds,
            autoUpdate: payload.config.auto_update,
          }
        : node.agentReportedConfig,
      // Follows the node when its connection changes (new ISP lease, 4G failover).
      ipAddress: publicAddress(ctx.request.ip()) ?? publicAddress(node.ipAddress),
      lastSeenAt: DateTime.now(),
      status: wasOffline ? 'online' : node.status,
    })
    await node.save()

    if (wasOffline) {
      await resolveOfflineAlerts(node.id)
      await recordNodeEvent(node.id, 'back_online', {
        data: { offlineSince: offlineSince?.toISO() ?? null },
      })
    }
    // The agent replaces its own binary, so a new version in the heartbeat is
    // the only sign an update happened.
    if (previousVersion && node.agentVersion && previousVersion !== node.agentVersion) {
      await recordNodeEvent(node.id, 'agent_updated', {
        data: { from: previousVersion, to: node.agentVersion },
      })
    }

    // Insert metrics snapshot if provided
    if (payload.metrics) {
      const m = payload.metrics
      await db.table('node_metrics').insert({
        node_id: node.id,
        recorded_at: payload.timestamp ? new Date(payload.timestamp) : new Date(),
        bytes_sent: m.bytes_sent ?? null,
        bytes_received: m.bytes_received ?? null,
        latency_ms: m.latency_ms ?? null,
        cpu_percent: m.cpu_percent ?? null,
        cpu_cores: m.cpu_cores ?? null,
        load_avg: m.load_avg ?? null,
        memory_percent: m.memory_percent ?? null,
        mem_total_gb: m.mem_total_gb ?? null,
        disk_percent: m.disk_percent ?? null,
        disk_total_gb: m.disk_total_gb ?? null,
        temperature_celsius: m.temperature_celsius ?? null,
        uptime_seconds: m.uptime_seconds ?? null,
        active_peers: m.active_peers ?? 0,
      })
    }

    // A node is 'warning' exactly while one of its metric rules is firing.
    if (payload.metrics) {
      const firing = await evaluateMetricAlerts(node.id)
      const status = firing ? 'warning' : 'online'
      if (node.status !== status && node.status !== 'offline') {
        node.status = status
        await node.save()
      }
    }

    // Upsert peer stats — always process when peers field is present (even if empty)
    if (payload.peers !== undefined) {
      // The agent reports the node's whole netmap, so a peer missing from it is
      // gone — deleted from Headscale, or re-registered under a new key. Those
      // rows used to stay forever, and since Headscale reuses IPs, a long-gone
      // phone could sit on the same address as a live laptop.
      const reported = payload.peers.map((p) => p.public_key)
      const stale = NodePeerStat.query().where('node_id', node.id)
      if (reported.length > 0) stale.whereNotIn('peer_pubkey', reported)
      await stale.delete()

      for (const peer of payload.peers) {
        await NodePeerStat.updateOrCreate(
          { nodeId: node.id, peerPubkey: peer.public_key },
          {
            // Identity, not just counters: peerName and allowedIps are how a
            // peer gets matched to a device, and therefore how a session's
            // traffic gets attributed. They were dropped here until now, which
            // is why both columns were always null.
            peerName: peer.name?.slice(0, 100) ?? null,
            allowedIps: peer.allowed_ips ?? null,
            endpoint: peer.endpoint ?? null,
            lastHandshakeAt: peer.last_handshake_at ? DateTime.fromISO(peer.last_handshake_at) : null,
            bytesSent: peer.bytes_sent ?? 0,
            bytesReceived: peer.bytes_received ?? 0,
            isActive: peer.last_handshake_at
              ? DateTime.fromISO(peer.last_handshake_at) > DateTime.now().minus({ minutes: 3 })
              : false,
          }
        )
      }
    }

    // Check if agent token is close to expiry (< 7 days) and rotate.
    // The hash the agent authenticated with stays valid (previous_token_hash)
    // until the new token is used — a lost response cannot lock the agent out.
    const bearerHash = this.#bearerHash(ctx)
    const agentToken = await this.#resolveAgentToken(bearerHash)
    let newToken: string | null = null
    if (agentToken && bearerHash && agentToken.expiresAt < DateTime.now().plus({ days: 7 })) {
      const rawToken = `umbra_agent_${randomBytes(32).toString('hex')}`
      agentToken.previousTokenHash = bearerHash
      agentToken.tokenHash = hashAgentToken(rawToken)
      agentToken.expiresAt = DateTime.now().plus({ days: 90 })
      await agentToken.save()
      newToken = rawToken
    }

    // Update wireguard_ip from tailscale_ip if the agent reported it
    const tailscaleIp = payload.metrics?.tailscale_ip as string | undefined
    if (tailscaleIp && tailscaleIp !== node.wireguardIp) {
      node.wireguardIp = tailscaleIp
      await node.save()
    }

    // Self-heal: ensure this node's advertised routes are enabled in Headscale.
    // Required because v0.23 autoApprovers do nothing — without this (or the
    // /connect call), an exit node advertises 0.0.0.0/0 but routes no client.
    if (headscaleClient.isConfigured && node.wireguardIp) {
      const now = Date.now()
      if (now >= (nextRouteEnsureAt.get(node.id) ?? 0)) {
        try {
          const tenant = tenantForOwner(node.ownerUserId, node.ownerOrgId)

          // A machine re-enrolled into another account keeps its original
          // Headscale owner, which leaves it unreachable for the new account's
          // clients. Put it back where it belongs before touching its routes —
          // those are looked up within the tenant.
          const tenantState = await headscaleClient.ensureNodeTenant(node.wireguardIp, tenant)
          if (tenantState === 'moved') {
            console.info(`Node ${node.id} (${node.wireguardIp}) moved to tenant ${tenant}`)
            await headscaleClient.syncPolicy()
          }

          const res = await headscaleClient.enableExitRoutes(node.wireguardIp, tenant)
          // Routes confirmed: recheck hourly. Node not joined yet, or nothing
          // advertised (local client, or tailscale up still settling): retry in 1 min.
          const healthy = res.found && res.advertised > 0
          if (healthy) markExitRoutesVerified(node.id)
          nextRouteEnsureAt.set(node.id, now + (healthy ? 60 * 60_000 : 60_000))
        } catch (err) {
          console.error(`enableExitRoutes failed for node ${node.id}:`, err)
          nextRouteEnsureAt.set(node.id, now + 60_000)
        }
      }
    }

    // Resolve exit node: return the Tailscale IP (wireguard_ip after first heartbeat)
    let exitNodeId: string | null = null
    let exitNodeIP: string | null = null
    let exitNodeHostname: string | null = null

    const ownerId = node.ownerUserId
    if (ownerId) {
      const user = await User.find(ownerId)
      if (user?.exitNodeId) {
        exitNodeId = user.exitNodeId
        const exitNode = await Node.find(exitNodeId)
        if (exitNode) {
          exitNodeHostname = exitNode.id
          // wireguard_ip is updated on first heartbeat to the real Tailscale IP
          exitNodeIP = exitNode.wireguardIp ?? null
          // Strip CIDR suffix if present (100.64.0.2/32 → 100.64.0.2)
          if (exitNodeIP?.includes('/')) {
            exitNodeIP = exitNodeIP.split('/')[0]
          }
          // Route enabling happens in /connect and in the per-node self-heal
          // above — no need to re-trigger it from the client's heartbeat.
        }
      }
    }

    return {
      ok: true,
      peers_updated: true,
      new_token: newToken,
      exit_node_id: exitNodeId,
      exit_node_ip: exitNodeIP,
      exit_node_hostname: exitNodeHostname,
      // What the dashboard wants this agent to run with; applied live by agents ≥ 1.1.0.
      config: {
        heartbeat_interval_seconds: node.heartbeatIntervalSeconds,
        auto_update: node.autoUpdate,
      },
    }
  }

  // --- Helpers ---

  #bearerHash(ctx: HttpContext): string | null {
    const bearer = ctx.request.header('authorization', '')
    const [, token] = (bearer ?? '').split(' ')
    return token ? hashAgentToken(token) : null
  }

  async #resolveAgentToken(bearerHash: string | null) {
    if (!bearerHash) return null
    return AgentToken.query()
      .where((q) => q.where('token_hash', bearerHash).orWhere('previous_token_hash', bearerHash))
      .first()
  }
}
