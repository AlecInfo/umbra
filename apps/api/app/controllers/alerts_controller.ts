import type { HttpContext } from '@adonisjs/core/http'
import NodeAlert from '#models/node_alert'
import { accessibleNodesQuery, userOrgIds } from '#services/node_scope'

const SEVERITY: Record<string, 'critical' | 'warning' | 'info'> = {
  node_offline:      'critical',
  cpu_high:          'warning',
  memory_high:       'warning',
  disk_high:         'warning',
  temperature_high:  'warning',
  latency_high:      'info',
  peer_disconnected: 'info',
}

export default class AlertsController {
  async index({ auth, request }: HttpContext) {
    const user    = auth.getUserOrFail()
    const orgIds  = await userOrgIds(user.id)
    const nodes   = await accessibleNodesQuery(user.id, orgIds).select('id')
    const nodeIds = nodes.map((n) => n.id)
    if (!nodeIds.length) return { data: [] }

    const severity = request.input('severity') as string | null
    const query    = NodeAlert.query()
      .whereIn('nodeId', nodeIds)
      .preload('node', (q) => q.select('id', 'name'))
      .orderBy('triggeredAt', 'desc')
      .limit(200)

    if (severity) {
      const types = Object.entries(SEVERITY)
        .filter(([, s]) => s === severity)
        .map(([t]) => t)
      query.whereIn('type', types)
    }

    const alerts = await query.exec()
    return {
      data: alerts.map((a) => ({
        id:             a.id,
        type:           a.type,
        severity:       SEVERITY[a.type] ?? 'info',
        node:           a.node.name,
        nodeId:         a.nodeId,
        thresholdValue: a.thresholdValue,
        thresholdUnit:  a.thresholdUnit,
        isActive:       a.isActive,
        triggeredAt:    a.triggeredAt?.toISO() ?? null,
        resolvedAt:     a.resolvedAt?.toISO() ?? null,
        createdAt:      a.createdAt.toISO(),
      })),
    }
  }
}
