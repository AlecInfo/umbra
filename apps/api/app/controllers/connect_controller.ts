import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import ConnectionLog from '#models/connection_log'
import { findNodeWithPermission } from '#services/permissions'
import { headscaleClient, tenantForOwner } from '#services/headscale_client'
import { exitRoutesVerifiedRecently, markExitRoutesVerified } from '#services/exit_routes'
import { sessionState } from '#services/connection_traffic'

export default class ConnectController {
  async connect({ auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const { nodeId } = request.only(['nodeId'])

    if (!nodeId) return response.badRequest({ message: 'nodeId requis' })

    const node = await findNodeWithPermission(user.id, nodeId, 'connect')
    if (!node) return response.notFound({ message: 'Node introuvable' })

    await ConnectionLog.query()
      .where('user_id', user.id)
      .whereNull('disconnected_at')
      .update({ disconnected_at: DateTime.now().toSQL() })

    const log = await ConnectionLog.create({
      nodeId: node.id,
      userId: user.id,
      // deviceId and the byte counters are filled in later, once the exit node
      // reports a peer that matches one of this account's devices — the client
      // has not joined the mesh yet at this point (it is about to run the
      // command we are returning). See services/connection_traffic.ts.
      deviceId: null,
      bytesSent: 0,
      bytesReceived: 0,
      clientIp: request.ip(),
      protocol: 'wireguard',
    })

    user.exitNodeId = node.id
    await user.save()

    // Build client-side tailscale commands (no local agent needed)
    const exitIp = node.wireguardIp?.split('/')[0] ?? null
    const headscaleURL = process.env.HEADSCALE_EXTERNAL_URL ?? 'http://localhost:8080'
    let connectCommand: string | null = null
    // Returned alongside the command string for clients that run tailscale
    // themselves — the desktop app invokes it directly rather than asking the
    // user to paste a line, and parsing the key back out of the shell command
    // would be a needless second source of truth.
    let authKey: string | null = null

    if (exitIp && headscaleClient.isConfigured) {
      // The client machine joins the tenant of the node it connects to
      // (own account for personal nodes, the org tenant for org nodes) —
      // the generated policy isolates tenants from each other.
      const tenant = tenantForOwner(node.ownerUserId, node.ownerOrgId)

      // When the node's heartbeat confirmed its Headscale state within the
      // hour, the tenant, the policy and the routes are known good and the
      // only work left is the key. Otherwise do the full check — both halves
      // in parallel, since neither depends on the other.
      const verified = exitRoutesVerifiedRecently(node.id)

      const ensureRoutes = async () => {
        if (verified) return
        // Make sure the exit node's advertised routes are enabled BEFORE handing
        // out the connect command — otherwise `--exit-node` fails client-side.
        // (v0.23 autoApprovers do nothing: this call is the real activation.)
        try {
          // A node sitting in the wrong tenant is invisible to this account's
          // clients, and its routes cannot even be looked up.
          await headscaleClient.ensureNodeTenant(exitIp, tenant)

          const res = await headscaleClient.enableExitRoutes(exitIp, tenant)
          if (!res.found) {
            console.error(`Exit node ${node.id} (${exitIp}) not found in Headscale — routes not enabled`)
          } else if (res.advertised === 0) {
            console.error(`Exit node ${node.id} (${exitIp}) advertises no exit routes — did the agent run tailscale up with --advertise-exit-node?`)
          } else {
            markExitRoutesVerified(node.id)
          }
        } catch (err) {
          console.error(`enableExitRoutes failed for node ${node.id}:`, err)
        }
      }

      const issueKey = async () => {
        try {
          if (!verified) {
            await headscaleClient.ensureUser(tenant)
            await headscaleClient.syncPolicy()
          }
          // Reuses the tenant's outstanding key rather than minting one per
          // click, and expires the stale ones on the way through.
          authKey = await headscaleClient.getOrCreatePreAuthKey(tenant)
          // --exit-node-allow-lan-access: without it tailscale also pulls the
          // client's own LAN into the tunnel. The printer and the router UI
          // vanish, and with --accept-dns=false the resolver is that router —
          // so name resolution either dies or, when both LANs share a range,
          // silently detours through the exit node.
          connectCommand = `sudo tailscale up --login-server=${headscaleURL} --authkey=${authKey} --exit-node=${exitIp} --exit-node-allow-lan-access --accept-routes --accept-dns=false --reset`

          // Remember which key this session handed out: Headscale reports it back
          // on whichever machine redeems it, which identifies the device exactly.
          log.headscalePreauthKey = authKey
          await log.save()
        } catch (err) {
          console.error('Failed to create pre-auth key for connect:', err)
        }
      }

      await Promise.all([ensureRoutes(), issueKey()])
    }

    return {
      ok: true,
      nodeId: node.id,
      nodeName: node.name,
      exitNodeIp: exitIp,
      // Run on ANY machine — no umbra-agent needed
      connectCommand,                                                              // first time: joins headscale + sets exit node
      switchCommand: exitIp ? `sudo tailscale set --exit-node=${exitIp} --exit-node-allow-lan-access` : null,   // already joined: just switch exit node
      disconnectCommand: 'sudo tailscale set --exit-node=',
      headscaleUrl: headscaleURL,
      authKey,
    }
  }

  // GET /connect — the account's open session, as the network sees it.
  //
  // 'pending' until the exit node reports the client machine as a peer that
  // has exchanged traffic since the session began, 'active' from then on.
  // The dashboard used to declare a connection the moment it handed out the
  // command — before anyone had run it, and even when the request failed.
  async status({ auth }: HttpContext) {
    const user = auth.getUserOrFail()
    const log = await ConnectionLog.query()
      .where('user_id', user.id)
      .whereNull('disconnected_at')
      .preload('node')
      .orderBy('connected_at', 'desc')
      .first()
    if (!log || log.node.deletedAt) return { session: null }

    const { state, device } = await sessionState(log)
    return {
      session: {
        id: log.id,
        nodeId: log.nodeId,
        nodeName: log.node.name,
        state,
        connectedAt: log.connectedAt.toISO(),
        deviceName: device?.name ?? null,
      },
    }
  }

  async disconnect({ auth }: HttpContext) {
    const user = auth.getUserOrFail()

    await ConnectionLog.query()
      .where('user_id', user.id)
      .whereNull('disconnected_at')
      .update({ disconnected_at: DateTime.now().toSQL() })

    user.exitNodeId = null
    await user.save()

    return { ok: true, disconnectCommand: 'sudo tailscale set --exit-node=' }
  }
}
