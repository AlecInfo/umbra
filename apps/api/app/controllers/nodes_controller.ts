import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import { randomBytes } from 'node:crypto'
import Node from '#models/node'
import NodeMetric from '#models/node_metric'
import NodePeerStat from '#models/node_peer_stat'
import AgentToken from '#models/agent_token'
import { hashAgentToken } from '#services/agent_auth'
import { userOrgIds, findAccessibleNode, accessibleNodesQuery } from '#services/node_scope'
import {
  createNodeValidator,
  updateNodeValidator,
  listNodesValidator,
} from '#validators/node'

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
    return paginator.toJSON()
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
    return { node: node.serialize() }
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
      installCommand: `curl -fsSL https://get.umbravpn.io/install.sh | sudo bash -s -- --token ${raw}`,
    })
  }

  async peers({ auth, params, response }: HttpContext) {
    const node = await findAccessibleNode(auth.getUserOrFail().id, params.id)
    if (!node) return response.notFound({ message: 'Node introuvable' })

    const peers = await NodePeerStat.query().where('node_id', node.id).orderBy('peer_name', 'asc')
    return { peers: peers.map((p) => p.serialize()) }
  }
}
