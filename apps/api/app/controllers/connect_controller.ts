import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import ConnectionLog from '#models/connection_log'
import { findNodeWithPermission } from '#services/permissions'
import { headscaleClient, tenantForOwner } from '#services/headscale_client'

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

    await ConnectionLog.create({
      nodeId: node.id,
      userId: user.id,
      deviceId: null,
      bytesSent: 0,
      bytesReceived: 0,
      clientIp: null,
      protocol: 'wireguard',
    })

    user.exitNodeId = node.id
    await user.save()

    // Build client-side tailscale commands (no local agent needed)
    const exitIp = node.wireguardIp?.split('/')[0] ?? null
    const headscaleURL = process.env.HEADSCALE_EXTERNAL_URL ?? 'http://localhost:8080'
    let connectCommand: string | null = null

    if (exitIp && headscaleClient.isConfigured) {
      // The client machine joins the tenant of the node it connects to
      // (own account for personal nodes, the org tenant for org nodes) —
      // the generated policy isolates tenants from each other.
      const tenant = tenantForOwner(node.ownerUserId, node.ownerOrgId)

      // Make sure the exit node's advertised routes are enabled BEFORE handing
      // out the connect command — otherwise `--exit-node` fails client-side.
      // (v0.23 autoApprovers do nothing: this call is the real activation.)
      try {
        const res = await headscaleClient.enableExitRoutes(exitIp, tenant)
        if (!res.found) {
          console.error(`Exit node ${node.id} (${exitIp}) not found in Headscale — routes not enabled`)
        } else if (res.advertised === 0) {
          console.error(`Exit node ${node.id} (${exitIp}) advertises no exit routes — did the agent run tailscale up with --advertise-exit-node?`)
        }
      } catch (err) {
        console.error(`enableExitRoutes failed for node ${node.id}:`, err)
      }

      try {
        await headscaleClient.ensureUser(tenant)
        await headscaleClient.syncPolicy()
        const authKey = await headscaleClient.createPreAuthKey(tenant)
        connectCommand = `sudo tailscale up --login-server=${headscaleURL} --authkey=${authKey} --exit-node=${exitIp} --accept-routes --accept-dns=false --reset`
      } catch (err) {
        console.error('Failed to create pre-auth key for connect:', err)
      }
    }

    return {
      ok: true,
      nodeId: node.id,
      nodeName: node.name,
      exitNodeIp: exitIp,
      // Run on ANY machine — no umbra-agent needed
      connectCommand,                                                              // first time: joins headscale + sets exit node
      switchCommand: exitIp ? `sudo tailscale set --exit-node=${exitIp}` : null,   // already joined: just switch exit node
      disconnectCommand: 'sudo tailscale set --exit-node=',
      headscaleUrl: headscaleURL,
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
