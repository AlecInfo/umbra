import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import ConnectionLog from '#models/connection_log'
import { findAccessibleNode } from '#services/node_scope'
import { headscaleClient } from '#services/headscale_client'

export default class ConnectController {
  async connect({ auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const { nodeId } = request.only(['nodeId'])

    if (!nodeId) return response.badRequest({ message: 'nodeId requis' })

    const node = await findAccessibleNode(user.id, nodeId)
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
      const headscaleUser = process.env.HEADSCALE_USER ?? 'umbra'

      // Make sure the exit node's advertised routes are enabled BEFORE handing
      // out the connect command — otherwise `--exit-node` fails client-side.
      try {
        const enabled = await headscaleClient.enableExitRoutes(exitIp, headscaleUser)
        if (!enabled) {
          console.error(`Exit node ${node.id} (${exitIp}) not found in Headscale — routes not enabled`)
        }
      } catch (err) {
        console.error(`enableExitRoutes failed for node ${node.id}:`, err)
      }

      try {
        await headscaleClient.ensureUser(headscaleUser)
        const authKey = await headscaleClient.createPreAuthKey(headscaleUser)
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
