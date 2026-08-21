import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import { randomBytes } from 'node:crypto'
import db from '@adonisjs/lucid/services/db'
import Node from '#models/node'
import NodeMetric from '#models/node_metric'
import NodePeerStat from '#models/node_peer_stat'
import AgentToken from '#models/agent_token'
import { hashAgentToken } from '#services/agent_auth'
import { resolveOrgRole } from '#services/organizations'
import { headscaleClient, tenantForOwner } from '#services/headscale_client'
import { userOrgIds, accessibleNodesQuery } from '#services/node_scope'
import { resolveNodePermission, findNodeWithPermission, canShareNode } from '#services/permissions'
import OrgMember from '#models/org_member'
import User from '#models/user'
import {
  createNodeValidator,
  updateNodeValidator, transferNodeValidator,
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
    // The owning org travels with the node: the dashboard has to distinguish
    // a personal node from a shared one, and it only has ids otherwise.
    query.preload('ownerOrg', (q) => q.select('id', 'name'))
    const paginator = await query.orderBy('created_at', 'desc').paginate(page, perPage)
    const nodes = paginator.all()
    const nodeIds = nodes.map((n) => n.id)
    const metricMap = await latestMetricForNodes(nodeIds)
    // What the caller may do with each node, so the dashboard can hide actions
    // the API would refuse instead of offering buttons that return 404.
    const permissions = await Promise.all(nodes.map((n) => resolveNodePermission(user.id, n)))
    return {
      meta: paginator.getMeta(),
      data: nodes.map((n, i) => ({
        ...n.serialize(),
        org: n.ownerOrg ? { id: n.ownerOrg.id, name: n.ownerOrg.name } : null,
        permission: permissions[i],
        latestMetric: metricMap[n.id] ?? null,
      })),
    }
  }

  async store({ auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const payload = await request.validateUsing(createNodeValidator)

    if (payload.orgId) {
      // Creating an org node requires an owner/admin role, not mere membership.
      const membership = await OrgMember.query()
        .where('user_id', user.id)
        .where('org_id', payload.orgId)
        .first()
      if (!membership || membership.role === 'member') {
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
    const node = await findNodeWithPermission(auth.getUserOrFail().id, params.id, 'read')
    if (!node) return response.notFound({ message: 'Node introuvable' })
    const metricMap = await latestMetricForNodes([node.id])
    if (node.ownerOrgId) await node.load('ownerOrg', (q) => q.select('id', 'name'))
    return {
      node: {
        ...node.serialize(),
        org: node.ownerOrg ? { id: node.ownerOrg.id, name: node.ownerOrg.name } : null,
        permission: await resolveNodePermission(auth.getUserOrFail().id, node),
        latestMetric: metricMap[node.id] ?? null,
      },
    }
  }

  async update({ auth, params, request, response }: HttpContext) {
    const node = await findNodeWithPermission(auth.getUserOrFail().id, params.id, 'manage')
    if (!node) return response.notFound({ message: 'Node introuvable' })

    const payload = await request.validateUsing(updateNodeValidator)
    node.merge(payload)
    await node.save()
    return { node: node.serialize() }
  }

  // POST /nodes/:id/transfer — move a node between personal and org ownership
  //
  // This is not a cosmetic field: ownership decides the Headscale tenant, and
  // therefore who can reach the machine at all. Doing it through the generic
  // PATCH would hide that behind a field update.
  async transfer({ auth, params, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const node = await findNodeWithPermission(user.id, params.id, 'admin')
    if (!node) return response.notFound({ message: 'Node introuvable' })

    // Giving a node away is an act of ownership, not of administration — the
    // same line drawn for sharing. Being granted admin on someone's machine
    // lets you run it, not hand it to a third party behind their back.
    if (!(await canShareNode(user.id, node))) {
      return response.forbidden({ message: "Seul le propriétaire peut céder ce noeud" })
    }

    const { orgId, userId } = await request.validateUsing(transferNodeValidator)

    if (orgId && userId) {
      return response.badRequest({ message: 'Indiquez une organisation ou une personne, pas les deux' })
    }

    if (orgId) {
      // You cannot hand a node to an org you do not administer.
      const role = await resolveOrgRole(user.id, orgId)
      if (role !== 'owner' && role !== 'admin') {
        return response.forbidden({ message: "Vous n'administrez pas cette organisation" })
      }
    }

    let targetUserId = user.id
    if (userId && userId !== user.id) {
      // Handing a node to someone means giving it away: they become its owner
      // and the caller keeps whatever access their org role or a share grants,
      // which may be none. Restricted to people the caller already shares an
      // organisation with, so a node cannot be pushed onto a stranger.
      const target = await User.query().where('id', userId).whereNull('deleted_at').first()
      if (!target) return response.notFound({ message: 'Compte introuvable' })

      const mine = await OrgMember.query().where('user_id', user.id).select('org_id')
      const theirs = await OrgMember.query().where('user_id', target.id).select('org_id')
      const shared = mine.some((m) => theirs.some((o) => o.orgId === m.orgId))
      if (!shared) {
        return response.forbidden({
          message: 'Vous ne partagez aucune organisation avec cette personne',
        })
      }
      targetUserId = target.id
    }

    const sameOwner =
      (node.ownerOrgId ?? null) === (orgId ?? null) &&
      (orgId ? true : node.ownerUserId === targetUserId)
    if (sameOwner) return { node: node.serialize(), moved: false }

    node.ownerUserId = orgId ? null : targetUserId
    node.ownerOrgId = orgId ?? null
    await node.save()

    // Move it in Headscale straight away. The heartbeat self-heal would get
    // there eventually, but its throttle can be an hour out — and until then
    // the new owners cannot reach a node the dashboard shows as theirs.
    let moved = false
    if (headscaleClient.isConfigured && node.wireguardIp) {
      const tenant = tenantForOwner(node.ownerUserId, node.ownerOrgId)
      try {
        await headscaleClient.ensureUser(tenant)
        moved = (await headscaleClient.ensureNodeTenant(node.wireguardIp, tenant)) === 'moved'
        await headscaleClient.syncPolicy()
        await headscaleClient.enableExitRoutes(node.wireguardIp, tenant)
      } catch (err) {
        console.error(`Moving node ${node.id} to tenant ${tenant} failed:`, err)
      }
    }

    if (node.ownerOrgId) await node.load('ownerOrg', (q) => q.select('id', 'name'))
    return {
      node: {
        ...node.serialize(),
        org: node.ownerOrg ? { id: node.ownerOrg.id, name: node.ownerOrg.name } : null,
      },
      moved,
    }
  }

  async destroy({ auth, params, response }: HttpContext) {
    const node = await findNodeWithPermission(auth.getUserOrFail().id, params.id, 'admin')
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
    const node = await findNodeWithPermission(auth.getUserOrFail().id, params.id, 'read')
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
    const node = await findNodeWithPermission(user.id, params.id, 'manage')
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
    const node = await findNodeWithPermission(auth.getUserOrFail().id, params.id, 'read')
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
