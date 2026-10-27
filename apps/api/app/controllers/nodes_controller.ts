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
import { resolveNodePermission, findNodeWithPermission, canShareNode, hasPermission } from '#services/permissions'
import OrgMember from '#models/org_member'
import User from '#models/user'
import NodeEvent from '#models/node_event'
import ConnectionLog from '#models/connection_log'
import { readReleaseManifest, compareVersions } from '#services/agent_release'
import { recordNodeEvent } from '#services/node_events'
import {
  createNodeValidator,
  updateNodeValidator, transferNodeValidator,
  listNodesValidator,
} from '#validators/node'

async function latestMetricForNodes(nodeIds: string[]): Promise<Record<string, any>> {
  if (!nodeIds.length) return {}
  // One index probe per node on idx_metrics_node_time, newest row first.
  // The previous form numbered every row of every node with ROW_NUMBER() and
  // kept rn = 1: Postgres cannot stop early under a window function, so it
  // read the whole history — 5 s for 558k rows on the Pi, on a query every
  // open dashboard tab repeats every 8 s.
  const result = await db.rawQuery(
    `SELECT n.id AS node_id, m.*
     FROM unnest(?::uuid[]) AS n(id)
     CROSS JOIN LATERAL (
       SELECT latency_ms, cpu_percent, memory_percent, disk_percent, temperature_celsius,
              uptime_seconds, bytes_sent, bytes_received, active_peers,
              cpu_cores, load_avg, mem_total_gb, disk_total_gb
       FROM node_metrics
       WHERE node_id = n.id
       ORDER BY recorded_at DESC
       LIMIT 1
     ) m`,
    [nodeIds]
  )
  const rows: any[] = result.rows ?? []
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
      activePeers:        r.active_peers,
      cpuCores:           r.cpu_cores,
      loadAvg:            r.load_avg,
      memTotalGb:         r.mem_total_gb,
      diskTotalGb:        r.disk_total_gb,
    }
  }
  return map
}

/*
| Chart periods. Each one is cut into roughly 300 buckets: enough for a smooth
| curve at any width, and the same payload whether the period holds an hour of
| heartbeats or a year of them. Returning raw samples instead meant 5000 rows
| (1.6 MB) per call, serialized on the API's only thread — about a second on
| the Pi, during which every other request waited.
*/
// Short periods aggregate raw samples (a day is ~8 600 rows, one index range).
// Longer ones re-bucket the hourly rollup: raw samples for a year took 13 s.
const CHART_PERIODS: Record<string, { span: string; bucket: string; source: 'raw' | 'hourly' }> = {
  '1h': { span: '1 hour', bucket: '15 seconds', source: 'raw' },
  '1d': { span: '1 day', bucket: '5 minutes', source: 'raw' },
  '1w': { span: '7 days', bucket: '1 hour', source: 'hourly' },
  '1m': { span: '1 month', bucket: '2 hours', source: 'hourly' },
  '1y': { span: '1 year', bucket: '1 day', source: 'hourly' },
}

// What the dashboard says about the agent itself. Every value is read from
// somewhere real or left null — the page used to fill these in by hand.
async function agentInfo(node: Node) {
  const manifest = await readReleaseManifest()
  const latestVersion = manifest?.version ?? null

  // The live credential is the most recently consumed one: enroll tokens and
  // agent tokens share the table, and a re-enrolled node has several.
  const token = await AgentToken.query()
    .where('node_id', node.id)
    .whereNotNull('used_at')
    .orderBy('used_at', 'desc')
    .first()

  // The agent does not report its interval, so measure it: the median gap
  // between the last few heartbeats is what it actually does, whatever its
  // config file says.
  const recent = await db
    .from('node_metrics')
    .where('node_id', node.id)
    .orderBy('recorded_at', 'desc')
    .limit(7)
    .select('recorded_at')
  const gaps = recent
    .slice(1)
    .map((r, i) => (new Date(recent[i].recorded_at).getTime() - new Date(r.recorded_at).getTime()) / 1000)
    .filter((g) => g > 0)
    .sort((a, b) => a - b)
  const heartbeatIntervalSeconds = gaps.length ? Math.round(gaps[Math.floor(gaps.length / 2)]) : null

  return {
    latestVersion,
    updateAvailable:
      latestVersion !== null && node.agentVersion !== null && compareVersions(node.agentVersion, latestVersion) < 0,
    tokenExpiresAt: token?.expiresAt.toISO() ?? null,
    heartbeatIntervalSeconds,
    // Whether the agent runs with what the dashboard asks. null: the agent is
    // older than 1.1.0 and cannot receive settings at all.
    settingsApplied:
      node.agentReportedConfig === null
        ? null
        : node.agentReportedConfig.heartbeatIntervalSeconds === node.heartbeatIntervalSeconds &&
          node.agentReportedConfig.autoUpdate === node.autoUpdate,
  }
}

function displayName(user: User | null | undefined): string | null {
  if (!user) return null
  return user.name?.trim() || user.email.split('@')[0] || null
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
        agent: await agentInfo(node),
      },
    }
  }

  async update({ auth, params, request, response }: HttpContext) {
    const node = await findNodeWithPermission(auth.getUserOrFail().id, params.id, 'manage')
    if (!node) return response.notFound({ message: 'Node introuvable' })

    const payload = await request.validateUsing(updateNodeValidator)
    const previousName = node.name
    node.merge(payload)
    await node.save()
    if (node.name !== previousName) {
      await recordNodeEvent(node.id, 'renamed', {
        actorUserId: auth.getUserOrFail().id,
        data: { from: previousName, to: node.name },
      })
    }
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

    let recipient: string | null
    if (orgId) {
      await node.load('ownerOrg', (q) => q.select('id', 'name'))
      recipient = node.ownerOrg?.name ?? null
    } else {
      recipient = displayName(await User.find(targetUserId))
    }
    await recordNodeEvent(node.id, 'transferred', {
      actorUserId: user.id,
      data: { to: recipient, kind: orgId ? 'org' : 'user' },
    })

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

    const period = request.input('period') as string | undefined
    if (period !== undefined) {
      const p = CHART_PERIODS[period]
      if (!p) return response.badRequest({ message: 'Période inconnue' })
      // Averages for gauges. The byte counters are cumulative, so each bucket
      // keeps its last reading and the client derives a rate between buckets.
      // Both sources expose the same columns; only the time column differs.
      const [table, time] = p.source === 'raw' ? ['node_metrics', 'recorded_at'] : ['node_metrics_hourly', 'bucket']
      const result = await db.rawQuery(
        `SELECT time_bucket(?::interval, ${time}) AS bucket,
                avg(cpu_percent)::float          AS cpu_percent,
                avg(memory_percent)::float       AS memory_percent,
                avg(disk_percent)::float         AS disk_percent,
                avg(temperature_celsius)::float  AS temperature_celsius,
                avg(latency_ms)::float           AS latency_ms,
                max(active_peers)                AS active_peers,
                last(bytes_sent, ${time})        AS bytes_sent,
                last(bytes_received, ${time})    AS bytes_received
         FROM ${table}
         WHERE node_id = ? AND ${time} >= now() - ?::interval
         GROUP BY 1
         ORDER BY 1 ASC`,
        [p.bucket, node.id, p.span]
      )
      return {
        period,
        metrics: (result.rows ?? []).map((r: any) => ({
          recordedAt: new Date(r.bucket).toISOString(),
          cpuPercent: r.cpu_percent,
          memoryPercent: r.memory_percent,
          diskPercent: r.disk_percent,
          temperatureCelsius: r.temperature_celsius,
          latencyMs: r.latency_ms,
          activePeers: r.active_peers,
          bytesSent: r.bytes_sent !== null ? Number(r.bytes_sent) : null,
          bytesReceived: r.bytes_received !== null ? Number(r.bytes_received) : null,
        })),
      }
    }

    // Raw samples, newest first — kept for API clients; the dashboard uses periods.
    const since = request.input('since')
    const query = NodeMetric.query()
      .where('node_id', node.id)
      .orderBy('recorded_at', 'desc')
      .limit(Math.min(Number(request.input('limit', 500)), 5000))

    if (since) query.where('recorded_at', '>=', since)

    const rows = await query.exec()
    return { metrics: rows.map((r) => r.serialize()) }
  }

  // GET /nodes/:id/activity — what happened to this node, newest first.
  //
  // Two sources merged: node_events (enrolment, outages, updates, ownership)
  // and connection_logs (who routed through it). Connections are personal:
  // someone who can merely read or use a node sees their own sessions, and
  // only those who manage it see everyone's.
  async activity({ auth, params, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const node = await Node.query().where('id', params.id).whereNull('deleted_at').first()
    const permission = node ? await resolveNodePermission(user.id, node) : null
    if (!node || !hasPermission(permission, 'read')) {
      return response.notFound({ message: 'Node introuvable' })
    }

    const limit = Math.min(Math.max(Number(request.input('limit', 20)) || 20, 1), 100)
    const seesEveryone = hasPermission(permission, 'manage')

    const events = await NodeEvent.query()
      .where('node_id', node.id)
      .preload('actor', (q) => q.select('id', 'name', 'email'))
      .orderBy('created_at', 'desc')
      .limit(limit)

    const connQuery = ConnectionLog.query()
      .where('node_id', node.id)
      .preload('user', (q) => q.select('id', 'name', 'email'))
      .orderBy('connected_at', 'desc')
      .limit(limit)
    if (!seesEveryone) connQuery.where('user_id', user.id)
    const connections = await connQuery

    type Item = { id: string; type: string; at: string; actor: string | null; data: Record<string, unknown> | null }
    const items: Item[] = events.map((e) => ({
      id: e.id,
      type: e.type,
      at: e.createdAt.toISO()!,
      actor: displayName(e.actor),
      data: e.data,
    }))

    for (const c of connections) {
      const actor = displayName(c.user)
      items.push({ id: `${c.id}:in`, type: 'connected', at: c.connectedAt.toISO()!, actor, data: null })
      if (c.disconnectedAt) {
        items.push({
          id: `${c.id}:out`,
          type: 'disconnected',
          at: c.disconnectedAt.toISO()!,
          actor,
          data: {
            durationSeconds: Math.max(0, Math.round(c.disconnectedAt.diff(c.connectedAt, 'seconds').seconds)),
            // Traffic is only known once the session was matched to a device
            // (see connection_traffic.ts). Before that the counters are 0
            // because nobody measured, not because nothing flowed — null says so.
            bytesSent: c.deviceId ? Number(c.bytesSent ?? 0) : null,
            bytesReceived: c.deviceId ? Number(c.bytesReceived ?? 0) : null,
          },
        })
      }
    }

    // The node row predates this history on existing installs; its creation
    // is the one event that is always known.
    items.push({ id: `${node.id}:created`, type: 'created', at: node.createdAt.toISO()!, actor: null, data: null })

    items.sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
    return { events: items.slice(0, limit) }
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
