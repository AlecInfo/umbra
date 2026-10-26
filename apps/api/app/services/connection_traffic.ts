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

// Handshake timestamps come from the exit node's clock, connectedAt from the
// API's: allow for a little drift between the two machines.
const CLOCK_SLACK_MS = 30_000

/**
 * The exit node's peer row for this VPN IP, freshest first. Headscale reuses
 * the IPs of deleted machines and old rows are never pruned, so the same IP
 * can sit on a long-gone peer and on the live one — .first() alone picked
 * either.
 */
function freshestPeer(nodeId: string, ip: string) {
  return NodePeerStat.query()
    .where('node_id', nodeId)
    .whereRaw('? = ANY(allowed_ips)', [ip])
    .orderByRaw('last_handshake_at DESC NULLS LAST')
    .first()
}

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

interface SweepContext {
  umbraNodeIps: Set<string>
  nodesForTenant: (tenant: string) => Promise<HeadscaleNode[]>
}

async function sweepContext(): Promise<SweepContext> {
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

  return { umbraNodeIps, nodesForTenant }
}

/** Resolve one open session's device and traffic. Returns whether it changed. */
async function syncSession(log: ConnectionLog, ctx: SweepContext): Promise<boolean> {
  if (!log.node) await log.load('node')

  // The client joins the tenant of the node it connects to (see /connect).
  const tenant = tenantForOwner(log.node.ownerUserId, log.node.ownerOrgId)
  const hsNodes = await ctx.nodesForTenant(tenant)
  const clientNodes = hsNodes.filter((n) => !isRegisteredNode(n, ctx.umbraNodeIps))

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

    // A machine enrolled before devices were tracked is known to nobody, and
    // switching exit node redeems no key — so neither rule above can ever name
    // it, and its sessions stayed unattributed forever. The exit node itself
    // can vouch: the one client of this tenant it has exchanged a handshake
    // with since the session began. Never a machine already registered to
    // someone else (org tenants are shared), and only when it is unambiguous.
    if (!hsNode) {
      const since = log.connectedAt.minus({ milliseconds: CLOCK_SLACK_MS })
      const fresh = await NodePeerStat.query()
        .where('node_id', log.nodeId)
        .where('last_handshake_at', '>=', since.toSQL()!)
      const freshIps = new Set(fresh.flatMap((p) => p.allowedIps ?? []))
      const seen = clientNodes.filter((n) => n.ipAddresses.some((ip) => freshIps.has(ip)))
      if (seen.length > 0) {
        const others = await Device.query()
          .whereIn('headscale_id', seen.map((n) => n.id))
          .whereNot('user_id', log.userId)
        const unclaimed = seen.filter((n) => !others.some((d) => d.headscaleId === n.id))
        if (unclaimed.length === 1) hsNode = unclaimed[0]
      }
    }

    if (hsNode) {
      device = await upsertDevice(log.userId, hsNode)
      log.deviceId = device.id
    }
  }

  if (device?.wireguardIp) {
    // The exit node reports this device as one of its peers.
    const peer = await freshestPeer(log.nodeId, device.wireguardIp)

    if (peer) accumulate(log, peer)
  }

  if (!log.$isDirty) return false
  await log.save()
  return true
}

/**
 * Resolve devices and traffic for every session still open.
 * Returns how many sessions were updated — used by the tests and the logs.
 */
export async function syncConnectionTraffic(): Promise<{ updated: number }> {
  if (!headscaleClient.isConfigured) return { updated: 0 }

  const openLogs = await ConnectionLog.query().whereNull('disconnectedAt').preload('node')
  if (openLogs.length === 0) return { updated: 0 }

  const ctx = await sweepContext()
  let updated = 0

  for (const log of openLogs) {
    try {
      if (await syncSession(log, ctx)) updated++
    } catch (err) {
      console.error(`Connection traffic sync failed for session ${log.id}:`, err)
    }
  }

  return { updated }
}

// On-demand resolution costs a Headscale round-trip; the dashboard polls.
const RESOLVE_EVERY_MS = 5_000
const lastResolveAt = new Map<string, number>()

export type SessionState = 'pending' | 'active'

/**
 * Whether a session is real yet.
 *
 * Active means the exit node reports the client machine as a peer it has
 * exchanged a handshake with since the session began — the network's own word
 * that traffic can flow. Until then the session is pending: the command was
 * handed out, nothing says it ran.
 *
 * A session not yet matched to a device is resolved on the spot instead of
 * waiting up to 30 s for the sweep, at most every few seconds.
 */
export async function sessionState(
  log: ConnectionLog
): Promise<{ state: SessionState; device: Device | null }> {
  let device = log.deviceId ? await Device.find(log.deviceId) : null

  if (!device && headscaleClient.isConfigured) {
    const now = Date.now()
    if (now - (lastResolveAt.get(log.id) ?? 0) >= RESOLVE_EVERY_MS) {
      lastResolveAt.set(log.id, now)
      try {
        await syncSession(log, await sweepContext())
        device = log.deviceId ? await Device.find(log.deviceId) : null
      } catch (err) {
        console.error(`Resolving session ${log.id} failed:`, err)
      }
    }
  }

  if (!device?.wireguardIp) return { state: 'pending', device }

  const peer = await freshestPeer(log.nodeId, device.wireguardIp)

  const seen =
    peer?.lastHandshakeAt != null &&
    peer.lastHandshakeAt.toMillis() >= log.connectedAt.toMillis() - CLOCK_SLACK_MS

  return { state: seen ? 'active' : 'pending', device }
}
