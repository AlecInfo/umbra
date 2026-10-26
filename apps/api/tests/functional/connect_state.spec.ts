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

test.group('Recognising the client machine', (group) => {
  let restore: () => void = () => {}
  group.each.teardown(() => restore())

  // Headscale knows the exit node and one client machine, enrolled long before
  // this session with a key nobody remembers.
  function stubTenant() {
    const proto = Object.getPrototypeOf(headscaleClient)
    const descriptor = Object.getOwnPropertyDescriptor(proto, 'isConfigured')
    // Every method /connect and the resolution can reach is stubbed: with
    // isConfigured forced on, anything left would go to the real HEADSCALE_URL.
    const originals = {
      getNodesByUser: headscaleClient.getNodesByUser,
      getOrCreatePreAuthKey: headscaleClient.getOrCreatePreAuthKey,
      ensureNodeTenant: headscaleClient.ensureNodeTenant,
      enableExitRoutes: headscaleClient.enableExitRoutes,
      ensureUser: headscaleClient.ensureUser,
      syncPolicy: headscaleClient.syncPolicy,
    }
    Object.defineProperty(headscaleClient, 'isConfigured', { get: () => true, configurable: true })
    headscaleClient.ensureNodeTenant = async () => 'ok'
    headscaleClient.enableExitRoutes = async () => ({ found: true, advertised: 2, enabled: 2 })
    headscaleClient.ensureUser = async () => {}
    headscaleClient.syncPolicy = async () => {}
    headscaleClient.getNodesByUser = async () => [
      { id: '1', name: 'exit', ipAddresses: [EXIT_IP], user: { name: 't' } },
      {
        id: '2',
        name: 'alec-zenbook',
        givenName: 'alec-zenbook',
        ipAddresses: [CLIENT_IP],
        user: { name: 't' },
        nodeKey: 'nodekey:zenbook',
        online: true,
        preAuthKey: { key: 'a-key-from-august', id: '1' },
      },
    ]
    headscaleClient.getOrCreatePreAuthKey = async () => 'a-fresh-key-nobody-will-redeem'
    restore = () => {
      Object.assign(headscaleClient, originals)
      delete (headscaleClient as any).isConfigured
      if (descriptor) Object.defineProperty(proto, 'isConfigured', descriptor)
    }
  }

  test('a machine that switched exit node is recognised by the exit node seeing it', async ({
    client,
    assert,
  }) => {
    stubTenant()
    const { token, nodeId } = await setup(client)
    await client.post('/api/v1/connect').headers(auth(token)).json({ nodeId })

    // A long-gone phone left a row on the same IP — Headscale reused it.
    await NodePeerStat.create({
      nodeId,
      peerPubkey: 'nodekey:old-phone',
      peerName: 'S26',
      allowedIps: [CLIENT_IP],
      lastHandshakeAt: DateTime.now().minus({ days: 60 }),
      isActive: false,
    })
    assert.equal((await status(client, token))!.state, 'pending')

    // The user runs `tailscale set --exit-node=…`: the exit node reports a handshake.
    await NodePeerStat.create({
      nodeId,
      peerPubkey: 'nodekey:zenbook',
      peerName: 'alec-zenbook',
      allowedIps: [CLIENT_IP],
      lastHandshakeAt: DateTime.now(),
      isActive: true,
    })
    await new Promise((r) => setTimeout(r, 5_100)) // on-demand resolution is throttled to every 5 s

    const session = await status(client, token)
    assert.equal(session!.state, 'active')
    assert.equal(session!.deviceName, 'alec-zenbook')
  }).timeout(15_000)

  test('a machine already registered to someone else is never taken', async ({ client, assert }) => {
    stubTenant()
    const { token, nodeId } = await setup(client)
    const other = await client.post('/api/v1/auth/register').json({ email: 'colleague@test.io', password: 'supersecret' })
    await Device.create({
      userId: other.body().user.id,
      name: 'their-laptop',
      type: 'desktop',
      headscaleId: '2',
      wireguardIp: CLIENT_IP,
      isActive: true,
    })

    await client.post('/api/v1/connect').headers(auth(token)).json({ nodeId })
    await NodePeerStat.create({
      nodeId,
      peerPubkey: 'nodekey:zenbook',
      allowedIps: [CLIENT_IP],
      lastHandshakeAt: DateTime.now(),
      isActive: true,
    })
    assert.equal((await status(client, token))!.state, 'pending')
  })
})

test.group('Recognising the client machine — existing device rows', (group) => {
  let restore: () => void = () => {}
  group.each.teardown(() => restore())

  function stubOneClient() {
    const proto = Object.getPrototypeOf(headscaleClient)
    const descriptor = Object.getOwnPropertyDescriptor(proto, 'isConfigured')
    const originals = {
      getNodesByUser: headscaleClient.getNodesByUser,
      getOrCreatePreAuthKey: headscaleClient.getOrCreatePreAuthKey,
      ensureNodeTenant: headscaleClient.ensureNodeTenant,
      enableExitRoutes: headscaleClient.enableExitRoutes,
      ensureUser: headscaleClient.ensureUser,
      syncPolicy: headscaleClient.syncPolicy,
    }
    Object.defineProperty(headscaleClient, 'isConfigured', { get: () => true, configurable: true })
    headscaleClient.ensureNodeTenant = async () => 'ok'
    headscaleClient.enableExitRoutes = async () => ({ found: true, advertised: 2, enabled: 2 })
    headscaleClient.ensureUser = async () => {}
    headscaleClient.syncPolicy = async () => {}
    headscaleClient.getOrCreatePreAuthKey = async () => 'unredeemed'
    // Re-registered with `tailscale up --reset`: new Headscale id, same machine key.
    headscaleClient.getNodesByUser = async () => [
      { id: '1', name: 'exit', ipAddresses: [EXIT_IP], user: { name: 't' } },
      { id: '42', name: 'alec-zenbook', nodeKey: 'nodekey:zenbook', ipAddresses: [CLIENT_IP], user: { name: 't' }, online: true },
    ]
    restore = () => {
      Object.assign(headscaleClient, originals)
      delete (headscaleClient as any).isConfigured
      if (descriptor) Object.defineProperty(proto, 'isConfigured', descriptor)
    }
  }

  async function handshakeNow(nodeId: string) {
    await NodePeerStat.create({
      nodeId,
      peerPubkey: 'nodekey:zenbook',
      allowedIps: [CLIENT_IP],
      lastHandshakeAt: DateTime.now(),
      isActive: true,
    })
  }

  test('a machine re-registered under a new Headscale id reuses its device row', async ({ client, assert }) => {
    stubOneClient()
    const { token, userId, nodeId } = await setup(client)
    const old = await Device.create({
      userId,
      name: 'alec-zenbook',
      type: 'desktop',
      headscaleId: '7',
      wireguardPubkey: 'nodekey:zenbook',
      wireguardIp: CLIENT_IP,
      isActive: true,
    })

    await client.post('/api/v1/connect').headers(auth(token)).json({ nodeId })
    await handshakeNow(nodeId)

    assert.equal((await status(client, token))!.state, 'active')
    await old.refresh()
    assert.equal(old.headscaleId, '42')
    assert.lengthOf(await Device.query().where('user_id', userId), 1)
  })

  test('a machine key registered to another account is left alone, without failing', async ({ client, assert }) => {
    stubOneClient()
    const { token, nodeId } = await setup(client)
    const other = await client.post('/api/v1/auth/register').json({ email: 'owner-of-key@test.io', password: 'supersecret' })
    await Device.create({
      userId: other.body().user.id,
      name: 'their-machine',
      type: 'desktop',
      headscaleId: '99',
      wireguardPubkey: 'nodekey:zenbook',
      isActive: true,
    })

    await client.post('/api/v1/connect').headers(auth(token)).json({ nodeId })
    await handshakeNow(nodeId)
    assert.equal((await status(client, token))!.state, 'pending')
  })
})
