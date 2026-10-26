import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import Node from '#models/node'
import Device from '#models/device'
import ConnectionLog from '#models/connection_log'
import NodePeerStat from '#models/node_peer_stat'
import { headscaleClient } from '#services/headscale_client'
import { markExitRoutesVerified, resetExitRoutesCache } from '#services/exit_routes'

const EXIT_IP = '100.64.0.1'
const CLIENT_IP = '100.64.0.2'

async function setup(client: any) {
  const reg = await client.post('/api/v1/auth/register').json({
    email: 'connect-state@test.io',
    password: 'supersecret',
  })
  const token = reg.body().token.value as string
  const userId = reg.body().user.id as string
  const created = await client
    .post('/api/v1/nodes')
    .header('Authorization', `Bearer ${token}`)
    .json({ name: 'exit', category: 'vps' })
  const nodeId = created.body().node.id as string
  const node = await Node.findOrFail(nodeId)
  node.wireguardIp = EXIT_IP
  node.status = 'online'
  await node.save()
  return { token, userId, nodeId }
}

const auth = (token: string) => ({ Authorization: `Bearer ${token}` })

async function status(client: any, token: string) {
  const res = await client.get('/api/v1/connect').headers(auth(token))
  res.assertStatus(200)
  return res.body().session as { nodeId: string; state: string; deviceName: string | null } | null
}

/** The exit node reports the client as a peer, with a handshake at `at`. */
async function clientSeen(userId: string, nodeId: string, at: DateTime) {
  const device = await Device.create({
    userId,
    name: 'laptop',
    type: 'desktop',
    wireguardIp: CLIENT_IP,
    isActive: true,
  })
  const log = await ConnectionLog.query().where('user_id', userId).whereNull('disconnected_at').firstOrFail()
  log.deviceId = device.id
  await log.save()
  await NodePeerStat.create({
    nodeId,
    peerPubkey: 'nodekey:laptop',
    allowedIps: [CLIENT_IP],
    lastHandshakeAt: at,
    isActive: true,
  })
}

test.group('Connection state', () => {
  test('no session, then pending once the command is handed out, then active once the exit node sees the client', async ({
    client,
    assert,
  }) => {
    const { token, userId, nodeId } = await setup(client)
    assert.isNull(await status(client, token))

    ;(await client.post('/api/v1/connect').headers(auth(token)).json({ nodeId })).assertStatus(200)

    // Handing out a command proves nothing: nobody has run it yet.
    const pending = await status(client, token)
    assert.equal(pending!.nodeId, nodeId)
    assert.equal(pending!.state, 'pending')

    await clientSeen(userId, nodeId, DateTime.now())
    const active = await status(client, token)
    assert.equal(active!.state, 'active')
    assert.equal(active!.deviceName, 'laptop')

    ;(await client.delete('/api/v1/connect').headers(auth(token))).assertStatus(200)
    assert.isNull(await status(client, token))
  })

  test('a handshake from before the session does not confirm it', async ({ client, assert }) => {
    const { token, userId, nodeId } = await setup(client)
    await client.post('/api/v1/connect').headers(auth(token)).json({ nodeId })

    await clientSeen(userId, nodeId, DateTime.now().minus({ minutes: 10 }))
    assert.equal((await status(client, token))!.state, 'pending')
  })

  test('a node you cannot use cannot be connected to', async ({ client, assert }) => {
    const { nodeId } = await setup(client)
    const other = await client.post('/api/v1/auth/register').json({
      email: 'someone-else@test.io',
      password: 'supersecret',
    })
    const token = other.body().token.value
    ;(await client.post('/api/v1/connect').headers(auth(token)).json({ nodeId })).assertStatus(404)
    assert.isNull(await status(client, token))
  })
})

test.group('Connect speed', (group) => {
  // Count the Headscale calls /connect makes, with every one stubbed.
  let calls: string[] = []
  let restore: () => void = () => {}

  group.each.setup(() => {
    resetExitRoutesCache()
    calls = []
    const proto = Object.getPrototypeOf(headscaleClient)
    const descriptor = Object.getOwnPropertyDescriptor(proto, 'isConfigured')
    Object.defineProperty(headscaleClient, 'isConfigured', { get: () => true, configurable: true })

    const stubs: Record<string, (...args: any[]) => Promise<any>> = {
      ensureNodeTenant: async () => 'ok',
      enableExitRoutes: async () => ({ found: true, advertised: 2, enabled: 2 }),
      ensureUser: async () => {},
      syncPolicy: async () => {},
      getOrCreatePreAuthKey: async () => 'key-123',
    }
    const originals: Record<string, any> = {}
    for (const [name, fn] of Object.entries(stubs)) {
      originals[name] = (headscaleClient as any)[name]
      ;(headscaleClient as any)[name] = async (...args: any[]) => {
        calls.push(name)
        return fn(...args)
      }
    }

    restore = () => {
      for (const [name, fn] of Object.entries(originals)) (headscaleClient as any)[name] = fn
      delete (headscaleClient as any).isConfigured
      if (descriptor) Object.defineProperty(proto, 'isConfigured', descriptor)
    }
    return () => restore()
  })

  test('a cold node gets the full check, and is then remembered as verified', async ({ client, assert }) => {
    const { token, nodeId } = await setup(client)
    const res = await client.post('/api/v1/connect').headers(auth(token)).json({ nodeId })
    res.assertStatus(200)
    assert.includeMembers(calls, ['ensureNodeTenant', 'enableExitRoutes', 'ensureUser', 'syncPolicy', 'getOrCreatePreAuthKey'])
    assert.include(res.body().connectCommand, '--exit-node-allow-lan-access')

    calls = []
    await client.post('/api/v1/connect').headers(auth(token)).json({ nodeId })
    assert.deepEqual(calls, ['getOrCreatePreAuthKey'])
  })

  test('a node the heartbeat recently confirmed only needs a key', async ({ client, assert }) => {
    const { token, nodeId } = await setup(client)
    markExitRoutesVerified(nodeId)
    const res = await client.post('/api/v1/connect').headers(auth(token)).json({ nodeId })
    res.assertStatus(200)
    assert.deepEqual(calls, ['getOrCreatePreAuthKey'])
    assert.equal(res.body().authKey, 'key-123')
  })
})
