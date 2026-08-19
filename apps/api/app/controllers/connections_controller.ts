import type { HttpContext } from '@adonisjs/core/http'
import ConnectionLog from '#models/connection_log'
import { accessibleNodesQuery, userOrgIds } from '#services/node_scope'

function fmtBytes(n: number): string {
  if (n >= 1_073_741_824) return `${(n / 1_073_741_824).toFixed(1)} GB`
  if (n >= 1_048_576)     return `${(n / 1_048_576).toFixed(0)} MB`
  return `${(n / 1024).toFixed(0)} KB`
}

export default class ConnectionsController {
  async index({ auth, request }: HttpContext) {
    const user    = auth.getUserOrFail()
    const orgIds  = await userOrgIds(user.id)
    const nodes   = await accessibleNodesQuery(user.id, orgIds).select('id')
    const nodeIds = nodes.map((n) => n.id)
    if (!nodeIds.length) return { data: [] }

    const status = request.input('status') as string | null
    const query  = ConnectionLog.query()
      .whereIn('nodeId', nodeIds)
      .preload('node',   (q) => q.select('id', 'name', 'category', 'city', 'country_code'))
      .preload('user',   (q) => q.select('id', 'name', 'email'))
      .preload('device', (q) => q.select('id', 'name'))
      .orderBy('connectedAt', 'desc')
      .limit(200)

    if (status === 'active') query.whereNull('disconnectedAt')
    if (status === 'ended')  query.whereNotNull('disconnectedAt')

    const logs = await query.exec()
    return {
      data: logs.map((c) => ({
        id:              c.id,
        user:            c.user.name ?? c.user.email,
        device:          c.device?.name ?? null,
        node:            c.node.name,
        nodeId:          c.nodeId,
        location:        [c.node.city, c.node.countryCode].filter(Boolean).join(', '),
        category:        c.node.category,
        connectedAt:     c.connectedAt.toISO(),
        disconnectedAt:  c.disconnectedAt?.toISO() ?? null,
        upload:          fmtBytes(Number(c.bytesSent)),
        download:        fmtBytes(Number(c.bytesReceived)),
        // Raw counts too: the dashboard aggregates them across sessions, which
        // it cannot do from the formatted strings.
        bytesSent:       Number(c.bytesSent),
        bytesReceived:   Number(c.bytesReceived),
        clientIp:        c.clientIp ?? null,
        status:          c.disconnectedAt ? 'ended' : 'active',
      })),
    }
  }
}
