import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import { randomBytes } from 'node:crypto'
import db from '@adonisjs/lucid/services/db'
import Node from '#models/node'
import NodeMetric from '#models/node_metric'
import NodePeerStat from '#models/node_peer_stat'
import AgentToken from '#models/agent_token'
import { hashAgentToken } from '#services/agent_auth'
import { headscaleClient, tenantForOwner } from '#services/headscale_client'
import { userOrgIds, findAccessibleNode, accessibleNodesQuery } from '#services/node_scope'
import {
  createNodeValidator,
  updateNodeValidator,
  listNodesValidator,
} from '#validators/node'

async function latestMetricForNodes(nodeIds: string[]): Promise<Record<string, any>> {
  if (!nodeIds.length) return {}
  const ranked = db.from('node_metrics')
    .select('node_id', 'latency_ms', 'cpu_percent', 'memory_percent', 'disk_percent', 'temperature_celsius', 'uptime_seconds', 'bytes_sent', 'bytes_received')
    .select(db.raw('ROW_NUMBER() OVER (PARTITION BY node_id ORDER BY recorded_at DESC) as rn'))
    .whereIn('node_id', nodeIds)
    .as('ranked')
  const rows = await db.from(ranked).where('rn', 1)
  const map: Record<string, any> = {}
  for (const r of rows) {
    map[r.node_id] = {
      latencyMs:          r.latency_ms,
      cpuPercent:         r.cpu_percent         !== null ? Number(r.cpu_percent)         : null,
      memoryPercent:      r.memory_percent      !== null ? Number(r.memory_percent)      : null,
      diskPercent:        r.disk_percent        !== null ? Number(r.disk_percent)        : null,
      temperatureCelsius: r.temperature_celsius !== null ? Number(r.temperature_celsius) : null,
      uptimeSeconds:      r.uptime_seconds,
      bytesSent:          r.bytes_sent          !== null ? Number(r.bytes_sent)          : null,
      bytesReceived:      r.bytes_received      !== null ? Number(r.bytes_received)      : null,
    }
  }
  return map
}

export default class NodesController {
  async index({ auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const filters = await request.validateUsing(listNodesValidator)

    if (filters.orgId) {
      const orgIds = await userOrgIds(user.id)
      if (!orgIds.includes(filters.orgId)) {
        return response.forbidden({ message: 'Accès refusé à cette organisation' })
      }
    }

    const orgIds = await userOrgIds(user.id)
    const query = accessibleNodesQuery(user.id, orgIds)

    if (filters.orgId) query.where('owner_org_id', filters.orgId)
    if (filters.status) query.where('status', filters.status)
    if (filters.category) query.where('category', filters.category)

    const page = filters.page ?? 1
    const perPage = filters.perPage ?? 50
    const paginator = await query.orderBy('created_at', 'desc').paginate(page, perPage)
    const nodes = paginator.all()
    const nodeIds = nodes.map((n) => n.id)
    const metricMap = await latestMetricForNodes(nodeIds)
    return {
      meta: paginator.getMeta(),
      data: nodes.map((n) => ({ ...n.serialize(), latestMetric: metricMap[n.id] ?? null })),
    }
  }

  async store({ auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const payload = await request.validateUsing(createNodeValidator)

    if (payload.orgId) {
      const orgIds = await userOrgIds(user.id)
      if (!orgIds.includes(payload.orgId)) {
        return response.forbidden({ message: 'Accès refusé à cette organisation' })
      }
    }

    const node = await Node.create({
      ownerUserId: payload.orgId ? null : user.id,
      ownerOrgId: payload.orgId ?? null,
      name: payload.name,
      category: payload.category ?? 'other',
      hostname: payload.hostname ?? null,
      countryCode: payload.countryCode ?? null,
      city: payload.city ?? null,
      latitude: payload.latitude ?? null,
      longitude: payload.longitude ?? null,
      hardwareModel: payload.hardwareModel ?? null,
      osVersion: payload.osVersion ?? null,
      status: 'pending',
      supportsWireguard: true,
      supportsOpenvpn: false,
    })

    return response.created({ node: node.serialize() })
  }

  async show({ auth, params, response }: HttpContext) {
    const node = await findAccessibleNode(auth.getUserOrFail().id, params.id)
    if (!node) return response.notFound({ message: 'Node introuvable' })
    const metricMap = await latestMetricForNodes([node.id])
    return { node: { ...node.serialize(), latestMetric: metricMap[node.id] ?? null } }
  }

  async update({ auth, params, request, response }: HttpContext) {
    const node = await findAccessibleNode(auth.getUserOrFail().id, params.id)
    if (!node) return response.notFound({ message: 'Node introuvable' })

    const payload = await request.validateUsing(updateNodeValidator)
    node.merge(payload)
    await node.save()
    return { node: node.serialize() }
  }

  async destroy({ auth, params, response }: HttpContext) {
    const node = await findAccessibleNode(auth.getUserOrFail().id, params.id)
    if (!node) return response.notFound({ message: 'Node introuvable' })

    // Revocation must reach the network: remove the node from the Headscale
    // mesh, not only from the UMBRA database. Best-effort — the soft-delete
    // proceeds even if Headscale is unreachable.
    if (headscaleClient.isConfigured && node.wireguardIp) {
      try {
        const tenant = tenantForOwner(node.ownerUserId, node.ownerOrgId)
        const removed = await headscaleClient.deleteNodeByIp(node.wireguardIp, tenant)
        if (!removed) {
          console.error(`Node ${node.id} (${node.wireguardIp}) not found in Headscale during delete`)
        }
      } catch (err) {
        console.error(`Headscale node removal failed for ${node.id}:`, err)
      }
    }

    node.deletedAt = DateTime.now()
    await node.save()
    return response.noContent()
  }

  async metrics({ auth, params, request, response }: HttpContext) {
    const node = await findAccessibleNode(auth.getUserOrFail().id, params.id)
    if (!node) return response.notFound({ message: 'Node introuvable' })

    const since = request.input('since')
    const query = NodeMetric.query()
      .where('node_id', node.id)
      .orderBy('recorded_at', 'desc')
      .limit(Math.min(Number(request.input('limit', 500)), 5000))

    if (since) query.where('recorded_at', '>=', since)

    const rows = await query.exec()
    return { metrics: rows.map((r) => r.serialize()) }
  }

  async enrollToken({ auth, params, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const node = await findAccessibleNode(user.id, params.id)
    if (!node) return response.notFound({ message: 'Node introuvable' })

    const raw = `umbra_enroll_${randomBytes(24).toString('hex')}`
    const token = await AgentToken.create({
      nodeId: node.id,
      targetOrgId: node.ownerOrgId,
      nodeName: node.name,
      tokenHash: hashAgentToken(raw),
      createdBy: user.id,
      expiresAt: DateTime.now().plus({ hours: 1 }),
    })

    return response.created({
      enrollToken: raw,
      expiresAt: token.expiresAt,
      installCommand: `curl -sSL ${(process.env.API_PUBLIC_URL ?? 'http://localhost:3333/api/v1').replace(/\/api\/v1\/?$/, '')}/install.sh | bash -s -- --name=${node.name} --category=${node.category} --token=${raw}`,
    })
  }

  async peers({ auth, params, response }: HttpContext) {
    const node = await findAccessibleNode(auth.getUserOrFail().id, params.id)
    if (!node) return response.notFound({ message: 'Node introuvable' })

    const now = DateTime.now()
    const peers = await NodePeerStat.query().where('node_id', node.id).orderBy('peer_name', 'asc')
    return {
      peers: peers.map((p) => ({
        ...p.serialize(),
        isActive: p.lastHandshakeAt ? p.lastHandshakeAt > now.minus({ minutes: 3 }) : false,
      })),
    }
  }
}
