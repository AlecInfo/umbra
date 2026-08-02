import type { HttpContext } from '@adonisjs/core/http'
import { randomBytes } from 'node:crypto'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import AgentToken from '#models/agent_token'
import Node from '#models/node'
import NodePeerStat from '#models/node_peer_stat'
import User from '#models/user'
import { enrollValidator, heartbeatValidator, metricsValidator, peersValidator, registerValidator } from '#validators/agent'
import { hashAgentToken } from '#services/agent_auth'
import { allocateWireguardIp } from '#services/ip_allocator'
import { headscaleClient } from '#services/headscale_client'

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

    // Allocate WireGuard IP if not already assigned
    if (!node.wireguardIp) {
      node.wireguardIp = await allocateWireguardIp()
    }

    node.merge({
      hostname: payload.hostname ?? node.hostname,
      wireguardPubkey: payload.wireguard_pubkey ?? node.wireguardPubkey,
      hardwareModel: payload.hardware_model ?? node.hardwareModel,
      arch: payload.arch ?? node.arch,
      osVersion: payload.os_version ?? node.osVersion,
      agentVersion: payload.agent_version ?? node.agentVersion,
      ipAddress: payload.ip_address ?? node.ipAddress,
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

    // Create a Headscale pre-auth key for this node (if Headscale is configured)
    let headscaleAuthKey: string | null = null
    const headscaleUser = process.env.HEADSCALE_USER ?? 'umbra'
    // Always hand out the public Headscale URL: the agent runs on a remote
    // machine, so internal/docker hostnames are never reachable from there.
    const headscaleExternalURL = process.env.HEADSCALE_EXTERNAL_URL ?? 'http://localhost:8080'
    if (headscaleClient.isConfigured) {
      try {
        await headscaleClient.ensureUser(headscaleUser)
        headscaleAuthKey = await headscaleClient.createPreAuthKey(headscaleUser)
      } catch (err) {
        console.error('Headscale pre-auth key creation failed:', err)
      }
    }

    return response.created({
      node_id: node.id,
      auth_token: rawAgentToken,
      headscale_auth_key: headscaleAuthKey,
      headscale_url: headscaleExternalURL,
      // Legacy WireGuard fields kept for backward-compat with old agents
      wireguard: {
        interface: 'umbra0',
        address: node.wireguardIp,
        listen_port: node.wireguardPort ?? 51820,
        peers: [],
      },
    })
  }

  // POST /api/v1/agent/enroll — legacy format (enrollToken in body)
  async enroll({ request, response }: HttpContext) {
    const payload = await request.validateUsing(enrollValidator)

    const enrollHash = hashAgentToken(payload.enrollToken)
    const agentToken = await AgentToken.query()
      .where('token_hash', enrollHash)
      .whereNull('used_at')
      .where('expires_at', '>', DateTime.now().toSQL()!)
      .first()

    if (!agentToken) {
      return response.unauthorized({ message: "Token d'enrôlement invalide ou expiré" })
    }

    let node: Node | null = null
    if (agentToken.nodeId) {
      node = await Node.find(agentToken.nodeId)
    }

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

    if (!node.wireguardIp) {
      node.wireguardIp = await allocateWireguardIp()
    }

    node.merge({
      hostname: payload.hostname ?? node.hostname,
      wireguardPubkey: payload.wireguardPubkey ?? node.wireguardPubkey,
      hardwareModel: payload.hardwareModel ?? node.hardwareModel,
      osVersion: payload.osVersion ?? node.osVersion,
      agentVersion: payload.agentVersion ?? node.agentVersion,
      ipAddress: payload.ipAddress ?? node.ipAddress,
      status: 'online',
      lastSeenAt: DateTime.now(),
    })
    await node.save()

    const rawAgentToken = `umbra_agent_${randomBytes(32).toString('hex')}`
    agentToken.tokenHash = hashAgentToken(rawAgentToken)
    agentToken.usedAt = DateTime.now()
    agentToken.expiresAt = DateTime.now().plus({ days: 90 })
    await agentToken.save()

    return response.created({
      node: node.serialize(),
      agentToken: rawAgentToken,
      expiresAt: agentToken.expiresAt,
    })
  }

  // POST /api/v1/agent/heartbeat — Go agent spec: metrics + peers inline
  async heartbeat(ctx: HttpContext) {
    const node = ctx.agentNode
    const payload = await ctx.request.validateUsing(heartbeatValidator)

    node.merge({
      agentVersion: payload.agent_version ?? node.agentVersion,
      lastSeenAt: DateTime.now(),
      status: node.status === 'offline' ? 'online' : node.status,
    })
    await node.save()

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

    // Upsert peer stats — always process when peers field is present (even if empty)
    if (payload.peers !== undefined) {
      // Mark all existing peers inactive first; active ones will be re-set below
      await NodePeerStat.query().where('node_id', node.id).update({ isActive: false })

      for (const peer of payload.peers) {
        await NodePeerStat.updateOrCreate(
          { nodeId: node.id, peerPubkey: peer.public_key },
          {
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

    // Check if agent token is close to expiry (< 7 days) and rotate
    const agentToken = await this.#resolveAgentToken(ctx)
    let newToken: string | null = null
    if (agentToken && agentToken.expiresAt < DateTime.now().plus({ days: 7 })) {
      const rawToken = `umbra_agent_${randomBytes(32).toString('hex')}`
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
    const headscaleUser = process.env.HEADSCALE_USER ?? 'umbra'
    if (headscaleClient.isConfigured && node.wireguardIp) {
      const now = Date.now()
      if (now >= (nextRouteEnsureAt.get(node.id) ?? 0)) {
        try {
          const res = await headscaleClient.enableExitRoutes(node.wireguardIp, headscaleUser)
          // Routes confirmed: recheck hourly. Node not joined yet, or nothing
          // advertised (local client, or tailscale up still settling): retry in 1 min.
          const delay = res.found && res.advertised > 0 ? 60 * 60_000 : 60_000
          nextRouteEnsureAt.set(node.id, now + delay)
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
    }
  }

  // GET /api/v1/agent/peers — WireGuard peers authorized for this node
  async getPeers(ctx: HttpContext) {
    const node = ctx.agentNode
    const peers = await this.#buildPeerList(node)
    return { peers }
  }

  // POST /api/v1/agent/metrics — legacy batch endpoint
  async metrics(ctx: HttpContext) {
    const node = ctx.agentNode
    const { samples } = await ctx.request.validateUsing(metricsValidator)
    const rows = samples.map((s) => ({
      node_id: node.id,
      recorded_at: s.recordedAt ? new Date(s.recordedAt) : new Date(),
      bytes_sent: s.bytesSent ?? null,
      bytes_received: s.bytesReceived ?? null,
      latency_ms: s.latencyMs ?? null,
      cpu_percent: s.cpuPercent ?? null,
      memory_percent: s.memoryPercent ?? null,
      disk_percent: s.diskPercent ?? null,
      temperature_celsius: s.temperatureCelsius ?? null,
      uptime_seconds: s.uptimeSeconds ?? null,
      active_peers: s.activePeers ?? 0,
    }))

    await db.table('node_metrics').multiInsert(rows)

    node.lastSeenAt = DateTime.now()
    if (node.status === 'offline') node.status = 'online'
    await node.save()

    return ctx.response.created({ inserted: rows.length })
  }

  // POST /api/v1/agent/peers — legacy peer update endpoint
  async peers(ctx: HttpContext) {
    const node = ctx.agentNode
    const { peers } = await ctx.request.validateUsing(peersValidator)

    for (const peer of peers) {
      const existing = await NodePeerStat.query()
        .where('node_id', node.id)
        .where('peer_pubkey', peer.pubkey)
        .first()

      if (existing) {
        existing.merge({
          peerName: peer.name ?? existing.peerName,
          allowedIps: peer.allowedIps ?? existing.allowedIps,
          endpoint: peer.endpoint ?? existing.endpoint,
          lastHandshakeAt: peer.lastHandshakeAt
            ? DateTime.fromISO(peer.lastHandshakeAt)
            : existing.lastHandshakeAt,
          bytesSent: peer.bytesSent ?? existing.bytesSent,
          bytesReceived: peer.bytesReceived ?? existing.bytesReceived,
          isActive: true,
        })
        await existing.save()
      } else {
        await NodePeerStat.create({
          nodeId: node.id,
          peerPubkey: peer.pubkey,
          peerName: peer.name ?? null,
          allowedIps: peer.allowedIps ?? null,
          endpoint: peer.endpoint ?? null,
          lastHandshakeAt: peer.lastHandshakeAt
            ? DateTime.fromISO(peer.lastHandshakeAt)
            : null,
          bytesSent: peer.bytesSent ?? 0,
          bytesReceived: peer.bytesReceived ?? 0,
          isActive: true,
        })
      }
    }

    node.lastSeenAt = DateTime.now()
    await node.save()
    return { updated: peers.length }
  }

  // --- Helpers ---

  async #buildPeerList(node: Node) {
    // Return other online nodes of the same owner that have WG keys and IPs assigned
    const query = Node.query()
      .whereNotNull('wireguard_pubkey')
      .whereNotNull('wireguard_ip')
      .whereNull('deleted_at')
      .whereNot('id', node.id)
      .whereIn('status', ['online', 'warning'])

    if (node.ownerUserId) {
      query.where('owner_user_id', node.ownerUserId)
    } else if (node.ownerOrgId) {
      query.where('owner_org_id', node.ownerOrgId)
    }

    const peers = await query
      .select('wireguard_pubkey', 'wireguard_ip', 'ip_address', 'wireguard_port', 'last_seen_at')
      .orderBy('last_seen_at', 'desc')

    // Deduplicate by pubkey — keep the most recently seen node
    const seen = new Map<string, typeof peers[number]>()
    for (const p of peers) {
      if (!seen.has(p.wireguardPubkey!)) seen.set(p.wireguardPubkey!, p)
    }

    return [...seen.values()].map((p) => ({
      public_key: p.wireguardPubkey!,
      allowed_ips: [p.wireguardIp!.includes('/') ? p.wireguardIp! : `${p.wireguardIp}/32`],
      endpoint: p.ipAddress ? `${p.ipAddress}:${p.wireguardPort ?? 51820}` : '',
    }))
  }

  async #resolveAgentToken(ctx: HttpContext) {
    const bearer = ctx.request.header('authorization', '')
    const [, token] = (bearer ?? '').split(' ')
    if (!token) return null
    return AgentToken.query().where('token_hash', hashAgentToken(token)).first()
  }
}
