import { test } from '@japa/runner'
import ConnectionLog from '#models/connection_log'
import Node from '#models/node'
import NodePeerStat from '#models/node_peer_stat'
import { headscaleClient, type HeadscaleNode } from '#services/headscale_client'
import { syncConnectionTraffic } from '#services/connection_traffic'

const EXIT_IP = '100.64.0.1'
const CLIENT_IP = '100.64.0.2'
const PREAUTH_KEY = 'preauth-key-handed-to-the-client'

/**
 * The sweep talks to Headscale, which is not available in tests. Stub the two
 * things it asks for and restore them afterwards.
 */
function stubHeadscale(nodes: HeadscaleNode[]) {
  const originalGet = headscaleClient.getNodesByUser
  const descriptor = Object.getOwnPropertyDescriptor(
    Object.getPrototypeOf(headscaleClient),
    'isConfigured'
  )

  Object.defineProperty(headscaleClient, 'isConfigured', { get: () => true, configurable: true })
  headscaleClient.getNodesByUser = async () => nodes

  return () => {
    headscaleClient.getNodesByUser = originalGet
    delete (headscaleClient as any).isConfigured
    if (descriptor) {
      Object.defineProperty(Object.getPrototypeOf(headscaleClient), 'isConfigured', descriptor)
    }
  }
}

function headscaleNodes(): HeadscaleNode[] {
  return [
    // The exit node itself — must never be mistaken for a client device.
    {
      id: '1',
      name: 'exit-node',
      ipAddresses: [EXIT_IP],
      user: { name: 'tenant' },
    },
    // The machine that redeemed the key we issued at /connect.
    {
      id: '2',
      name: 'laptop-de-alec',
      givenName: 'laptop-de-alec',
      nodeKey: 'nodekey:abc',
      ipAddresses: [CLIENT_IP],
      user: { name: 'tenant' },
      online: true,
      preAuthKey: { key: PREAUTH_KEY, id: '7' },
    },
  ]
}

async function setupSession(client: any) {
  const reg = await client.post('/api/v1/auth/register').json({
    email: 'traffic-owner@test.io',
    password: 'supersecret',
  })
  const userToken = reg.body().token.value
  const userId = reg.body().user.id

  const created = await client
    .post('/api/v1/nodes')
    .header('Authorization', `Bearer ${userToken}`)
    .json({ name: 'traffic-node', category: 'sbc' })
  const nodeId = created.body().node.id

  // The exit node knows its VPN IP once the agent has reported it.
  const node = await Node.findOrFail(nodeId)
  node.wireguardIp = EXIT_IP
  await node.save()

  const log = await ConnectionLog.create({
    nodeId,
    userId,
    deviceId: null,
    bytesSent: 0,
    bytesReceived: 0,
    clientIp: '203.0.113.9',
    protocol: 'wireguard',
    headscalePreauthKey: PREAUTH_KEY,
  })

  return { nodeId, userId, log }
}

async function reportPeer(nodeId: string, sent: number, received: number) {
  await NodePeerStat.updateOrCreate(
    { nodeId, peerPubkey: 'nodekey:abc' },
    {
      peerName: 'laptop-de-alec',
      allowedIps: [CLIENT_IP],
      endpoint: 'derp:umbra-embedded',
      bytesSent: sent,
      bytesReceived: received,
      isActive: true,
    }
  )
}

test.group('Connection traffic', () => {
  test('attributes a session to the device that redeemed its key and accumulates traffic', async ({
    client,
    assert,
  }) => {
    const restore = stubHeadscale(headscaleNodes())
    try {
      const { nodeId, log } = await setupSession(client)

      // First sweep: the device is identified, but the counters seen so far
      // predate the session and must not be credited to it.
      await reportPeer(nodeId, 1_000, 5_000)
      await syncConnectionTraffic()
      await log.refresh()

      assert.isNotNull(log.deviceId)
      await log.load('device')
      assert.equal(log.device.name, 'laptop-de-alec')
      assert.equal(log.device.wireguardIp, CLIENT_IP)
      assert.equal(Number(log.bytesSent), 0)
      assert.equal(Number(log.bytesReceived), 0)

      // Second sweep: only the delta counts.
      await reportPeer(nodeId, 1_500, 9_000)
      await syncConnectionTraffic()
      await log.refresh()

      assert.equal(Number(log.bytesSent), 500)
      assert.equal(Number(log.bytesReceived), 4_000)

      // The peer's tailscaled restarts and its counters go back to zero. The
      // session total must hold rather than go negative or reset.
      await reportPeer(nodeId, 20, 40)
      await syncConnectionTraffic()
      await log.refresh()

      assert.equal(Number(log.bytesSent), 500)
      assert.equal(Number(log.bytesReceived), 4_000)

      // Counting resumes from the new baseline.
      await reportPeer(nodeId, 120, 240)
      await syncConnectionTraffic()
      await log.refresh()

      assert.equal(Number(log.bytesSent), 600)
      assert.equal(Number(log.bytesReceived), 4_200)
    } finally {
      restore()
    }
  })

  test('a closed session is left alone', async ({ client, assert }) => {
    const restore = stubHeadscale(headscaleNodes())
    try {
      const { nodeId, log } = await setupSession(client)
      await reportPeer(nodeId, 1_000, 1_000)

      log.disconnectedAt = log.connectedAt
      await log.save()

      await syncConnectionTraffic()
      await log.refresh()

      assert.isNull(log.deviceId)
      assert.equal(Number(log.bytesSent), 0)
    } finally {
      restore()
    }
  })
})