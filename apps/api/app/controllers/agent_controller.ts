import type { HttpContext } from '@adonisjs/core/http'
import { randomBytes } from 'node:crypto'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import AgentToken from '#models/agent_token'
import Node from '#models/node'
import NodePeerStat from '#models/node_peer_stat'
import { enrollValidator, heartbeatValidator, metricsValidator, peersValidator } from '#validators/agent'
import { hashAgentToken } from '#services/agent_auth'

export default class AgentController {
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

    node.merge({
      hostname: payload.hostname ?? node.hostname,
      wireguardPubkey: payload.wireguardPubkey ?? node.wireguardPubkey,
      hardwareModel: payload.hardwareModel ?? node.hardwareModel,
      osVersion: payload.osVersion ?? node.osVersion,
      agentVersion: payload.agentVersion ?? node.agentVersion,
      ipAddress: payload.ipAddress ?? node.ipAddress,
      countryCode: payload.countryCode ?? node.countryCode,
      city: payload.city ?? node.city,
      latitude: payload.latitude ?? node.latitude,
      longitude: payload.longitude ?? node.longitude,
      status: 'online',
      lastSeenAt: DateTime.now(),
    })
    await node.save()

    // Issue a long-lived agent token and rotate
    const rawAgentToken = `umbra_agent_${randomBytes(32).toString('hex')}`
    agentToken.tokenHash = hashAgentToken(rawAgentToken)
    agentToken.usedAt = DateTime.now()
    agentToken.expiresAt = DateTime.now().plus({ years: 1 })
    await agentToken.save()

    return response.created({
      node: node.serialize(),
      agentToken: rawAgentToken,
      expiresAt: agentToken.expiresAt,
    })
  }

  async heartbeat(ctx: HttpContext) {
    const node = ctx.agentNode
    const payload = await ctx.request.validateUsing(heartbeatValidator)
    node.merge({
      agentVersion: payload.agentVersion ?? node.agentVersion,
      wireguardPubkey: payload.wireguardPubkey ?? node.wireguardPubkey,
      ipAddress: payload.ipAddress ?? node.ipAddress,
      lastSeenAt: DateTime.now(),
      status: node.status === 'offline' ? 'online' : node.status,
    })
    await node.save()
    return { ok: true, nodeId: node.id }
  }

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
          lastHandshakeAt: peer.lastHandshakeAt ? DateTime.fromISO(peer.lastHandshakeAt) : existing.lastHandshakeAt,
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
          lastHandshakeAt: peer.lastHandshakeAt ? DateTime.fromISO(peer.lastHandshakeAt) : null,
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
}
