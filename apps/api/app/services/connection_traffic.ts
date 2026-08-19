import { DateTime } from 'luxon'
import ConnectionLog from '#models/connection_log'
import Device from '#models/device'
import Node from '#models/node'
import NodePeerStat from '#models/node_peer_stat'
import { headscaleClient, tenantForOwner, type HeadscaleNode } from '#services/headscale_client'

/*
| Fills in what /connect cannot know yet.
|
| When a user connects, we hand them a command and a pre-auth key — but their
| machine has not joined the mesh at that point, so the session row starts with
| no device and no traffic. Both only become knowable afterwards: Headscale
| reports which node used the key, and the exit node's heartbeat reports that
| node as a peer with byte counters.
|
| This sweep closes that gap for every open session.
*/

// A client machine is any node in the tenant that is not a registered UMBRA
// node — those are the exit nodes themselves, identified by their VPN IP.
function isRegisteredNode(hsNode: HeadscaleNode, umbraNodeIps: Set<string>): boolean {
  return hsNode.ipAddresses.some((ip) => umbraNodeIps.has(ip))
}

async function upsertDevice(userId: string, hsNode: HeadscaleNode): Promise<Device> {
  const ipv4 = hsNode.ipAddresses.find((ip) => ip.includes('.')) ?? hsNode.ipAddresses[0] ?? null

  return Device.updateOrCreate(
    { userId, headscaleId: hsNode.id },
    {
      name: (hsNode.givenName || hsNode.name || 'device').slice(0, 100),
      type: 'other',
      wireguardIp: ipv4,
      wireguardPubkey: hsNode.nodeKey ?? null,
      lastSeenAt: hsNode.lastSeen ? DateTime.fromISO(hsNode.lastSeen) : null,
      isActive: hsNode.online ?? true,
    }
  )
}

/**
 * Accumulate this session's traffic from the peer counters.
 *
 * Counters are cumulative since the peer's tailscaled started, so they can go
 * backwards on a restart. Adding clamped deltas keeps the session total
 * monotonic instead of letting a reset wipe it or turn it negative.
 */
function accumulate(log: ConnectionLog, peer: NodePeerStat): boolean {
  const sent = Number(peer.bytesSent ?? 0)
  const received = Number(peer.bytesReceived ?? 0)

  const prevSent = log.lastPeerBytesSent === null ? null : Number(log.lastPeerBytesSent)
  const prevReceived = log.lastPeerBytesReceived === null ? null : Number(log.lastPeerBytesReceived)

  // First observation only establishes the baseline: traffic from before this
  // session started is not ours to count.
  if (prevSent !== null) log.bytesSent = Number(log.bytesSent) + Math.max(0, sent - prevSent)
  if (prevReceived !== null) {
    log.bytesReceived = Number(log.bytesReceived) + Math.max(0, received - prevReceived)
  }

  const changed = prevSent !== sent || prevReceived !== received
  log.lastPeerBytesSent = sent
  log.lastPeerBytesReceived = received
  return changed
}

/**
 * Resolve devices and traffic for every session still open.
 * Returns how many sessions were updated — used by the tests and the logs.
 */
export async function syncConnectionTraffic(): Promise<{ updated: number }> {
  if (!headscaleClient.isConfigured) return { updated: 0 }

  const openLogs = await ConnectionLog.query().whereNull('disconnectedAt').preload('node')
  if (openLogs.length === 0) return { updated: 0 }

  // Every registered node's VPN IP, to tell exit nodes from client machines.
  const umbraNodes = await Node.query().whereNotNull('wireguardIp').select('wireguard_ip')
  const umbraNodeIps = new Set(
    umbraNodes.map((n) => n.wireguardIp!.split('/')[0]!).filter(Boolean)
  )

  // One Headscale round-trip per tenant, not per session.
  const tenantNodes = new Map<string, HeadscaleNode[]>()
  async function nodesForTenant(tenant: string): Promise<HeadscaleNode[]> {
    if (!tenantNodes.has(tenant)) {
      tenantNodes.set(tenant, await headscaleClient.getNodesByUser(tenant))
    }
    return tenantNodes.get(tenant)!
  }

  let updated = 0

  for (const log of openLogs) {
    try {
      // The client joins the tenant of the node it connects to (see /connect).
      const tenant = tenantForOwner(log.node.ownerUserId, log.node.ownerOrgId)
      const hsNodes = await nodesForTenant(tenant)
      const clientNodes = hsNodes.filter((n) => !isRegisteredNode(n, umbraNodeIps))

      let device = log.deviceId ? await Device.find(log.deviceId) : null

      if (!device) {
        // Exact match: the machine that redeemed the key we handed out.
        let hsNode = log.headscalePreauthKey
          ? clientNodes.find((n) => n.preAuthKey?.key === log.headscalePreauthKey)
          : undefined

        // A client that reused an existing enrollment never redeemed a key. Fall
        // back to a known device of this user that the exit node currently sees
        // as a peer — but only when it is unambiguous.
        if (!hsNode) {
          const known = await Device.query().where('user_id', log.userId).whereNull('deleted_at')
          const candidates = clientNodes.filter((n) =>
            known.some((d) => d.headscaleId === n.id)
          )
          if (candidates.length === 1) hsNode = candidates[0]
        }

        if (hsNode) {
          device = await upsertDevice(log.userId, hsNode)
          log.deviceId = device.id
        }
      }

      if (!device?.wireguardIp) continue

      // The exit node reports this device as one of its peers.
      const peer = await NodePeerStat.query()
        .where('node_id', log.nodeId)
        .whereRaw('? = ANY(allowed_ips)', [device.wireguardIp])
        .first()

      if (peer) accumulate(log, peer)

      if (log.$isDirty) {
        await log.save()
        updated++
      }
    } catch (err) {
      console.error(`Connection traffic sync failed for session ${log.id}:`, err)
    }
  }

  return { updated }
}