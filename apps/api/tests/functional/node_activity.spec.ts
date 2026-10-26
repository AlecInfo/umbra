import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import Node from '#models/node'
import ConnectionLog from '#models/connection_log'
import Device from '#models/device'
import { markStaleNodesOffline } from '#services/offline_watch'
import { compareVersions } from '#services/agent_release'

async function register(client: any, email: string) {
  const res = await client.post('/api/v1/auth/register').json({ email, password: 'supersecret' })
  return { token: res.body().token.value as string, id: res.body().user.id as string }
}

async function enrolledNode(client: any, ownerToken: string, agentVersion = '1.0.0') {
  const created = await client
    .post('/api/v1/nodes')
    .header('Authorization', `Bearer ${ownerToken}`)
    .json({ name: 'history-node', category: 'sbc' })
  const nodeId = created.body().node.id as string
  const et = await client
    .post(`/api/v1/nodes/${nodeId}/enroll-token`)
    .header('Authorization', `Bearer ${ownerToken}`)
  const enrolled = await client.post('/api/v1/agent/register').json({
    token: et.body().enrollToken,
    hostname: 'history-host',
    agent_version: agentVersion,
  })
  return { nodeId, agentToken: enrolled.body().auth_token as string }
}

function heartbeat(client: any, agentToken: string, body: Record<string, unknown> = {}) {
  return client
    .post('/api/v1/agent/heartbeat')
    .header('Authorization', `Bearer ${agentToken}`)
    .json({ timestamp: new Date().toISOString(), ...body })
}

async function activity(client: any, token: string, nodeId: string) {
  const res = await client.get(`/api/v1/nodes/${nodeId}/activity`).header('Authorization', `Bearer ${token}`)
  res.assertStatus(200)
  return res.body().events as { type: string; actor: string | null; data: any; at: string }[]
}

test.group('Node activity', () => {
  test('enrolment, outage, recovery and agent update are recorded in order', async ({ client, assert }) => {
    const owner = await register(client, 'history-owner@test.io')
    const { nodeId, agentToken } = await enrolledNode(client, owner.token)

    // Enrolled an hour ago, silent for the last five minutes.
    const enrolledAt = DateTime.now().minus({ hours: 1 }).toJSDate()
    await db.from('nodes').where('id', nodeId).update({ created_at: enrolledAt })
    await db.from('node_events').where('node_id', nodeId).update({ created_at: enrolledAt })

    const node = await Node.findOrFail(nodeId)
    const lastSeen = DateTime.now().minus({ minutes: 5 })
    node.lastSeenAt = lastSeen
    await node.save()
    await markStaleNodesOffline()

    ;(await heartbeat(client, agentToken)).assertStatus(200)
    ;(await heartbeat(client, agentToken, { agent_version: '1.1.0' })).assertStatus(200)

    const events = await activity(client, owner.token, nodeId)
    assert.deepEqual(
      events.map((e) => e.type),
      [
        'agent_updated',
        'back_online',
        'alert_resolved', // the node_offline rule every enrolled node gets
        'alert_triggered',
        'went_offline',
        'enrolled',
        'created',
      ]
    )

    const enrolled = events.find((e) => e.type === 'enrolled')!
    assert.equal(enrolled.actor, 'history-owner')

    // An outage is dated when the heartbeats stopped, not when the sweep ran.
    const offline = events.find((e) => e.type === 'went_offline')!
    assert.approximately(Date.parse(offline.at), lastSeen.toMillis(), 1000)

    assert.deepEqual(events.find((e) => e.type === 'agent_updated')!.data, { from: '1.0.0', to: '1.1.0' })
  })

  test('a heartbeat that changes nothing records nothing', async ({ client, assert }) => {
    const owner = await register(client, 'quiet-owner@test.io')
    const { nodeId, agentToken } = await enrolledNode(client, owner.token)

    ;(await heartbeat(client, agentToken, { agent_version: '1.0.0' })).assertStatus(200)
    ;(await heartbeat(client, agentToken, { agent_version: '1.0.0' })).assertStatus(200)

    const events = await activity(client, owner.token, nodeId)
    assert.deepEqual(events.map((e) => e.type), ['enrolled', 'created'])
  })

  test('connections are merged in, and only managers see other people’s sessions', async ({
    client,
    assert,
  }) => {
    const owner = await register(client, 'conn-owner@test.io')
    const guest = await register(client, 'conn-guest@test.io')
    const { nodeId } = await enrolledNode(client, owner.token)

    await client
      .post(`/api/v1/nodes/${nodeId}/members`)
      .header('Authorization', `Bearer ${owner.token}`)
      .json({ email: 'conn-guest@test.io', permission: 'connect' })

    const laptop = await Device.create({ userId: owner.id, name: 'laptop', type: 'desktop', isActive: true })
    const start = DateTime.now().minus({ hours: 2 })
    await ConnectionLog.createMany([
      {
        nodeId,
        userId: owner.id,
        deviceId: laptop.id,
        connectedAt: start,
        disconnectedAt: start.plus({ minutes: 30 }),
        bytesSent: 1000,
        bytesReceived: 5000,
        protocol: 'wireguard',
      },
      { nodeId, userId: guest.id, connectedAt: start.plus({ hours: 1 }), protocol: 'wireguard' },
    ])

    const ownerView = await activity(client, owner.token, nodeId)
    assert.includeMembers(
      ownerView.filter((e) => e.type === 'connected').map((e) => e.actor),
      ['conn-owner', 'conn-guest']
    )
    const out = ownerView.find((e) => e.type === 'disconnected')!
    assert.equal(out.data.durationSeconds, 1800)
    assert.equal(out.data.bytesReceived, 5000)

    // A session never matched to a device has unknown traffic, not zero.
    await ConnectionLog.create({
      nodeId,
      userId: owner.id,
      connectedAt: start.minus({ hours: 3 }),
      disconnectedAt: start.minus({ hours: 2 }),
      protocol: 'wireguard',
    })
    const unmatched = (await activity(client, owner.token, nodeId)).filter((e) => e.type === 'disconnected')
    assert.lengthOf(unmatched, 2)
    assert.isNull(unmatched[1].data.bytesSent)
    assert.isNull(unmatched[1].data.bytesReceived)

    const guestView = await activity(client, guest.token, nodeId)
    const guestActors = guestView.filter((e) => e.type === 'connected').map((e) => e.actor)
    assert.deepEqual(guestActors, ['conn-guest'])
  })

  test('a node you cannot read has no activity', async ({ client }) => {
    const owner = await register(client, 'private-owner@test.io')
    const stranger = await register(client, 'stranger@test.io')
    const { nodeId } = await enrolledNode(client, owner.token)

    const res = await client
      .get(`/api/v1/nodes/${nodeId}/activity`)
      .header('Authorization', `Bearer ${stranger.token}`)
    res.assertStatus(404)
  })

  test('renaming and transferring are attributed to whoever did it', async ({ client, assert }) => {
    const owner = await register(client, 'rename-owner@test.io')
    const { nodeId } = await enrolledNode(client, owner.token)

    await client
      .patch(`/api/v1/nodes/${nodeId}`)
      .header('Authorization', `Bearer ${owner.token}`)
      .json({ name: 'renamed-node' })

    const org = await client
      .post('/api/v1/orgs')
      .header('Authorization', `Bearer ${owner.token}`)
      .json({ name: 'Home Lab' })
    ;(
      await client
        .post(`/api/v1/nodes/${nodeId}/transfer`)
        .header('Authorization', `Bearer ${owner.token}`)
        .json({ orgId: org.body().org.id })
    ).assertStatus(200)

    const events = await activity(client, owner.token, nodeId)
    const renamed = events.find((e) => e.type === 'renamed')!
    assert.deepEqual(renamed.data, { from: 'history-node', to: 'renamed-node' })
    assert.equal(renamed.actor, 'rename-owner')
    assert.deepEqual(events.find((e) => e.type === 'transferred')!.data, { to: 'Home Lab', kind: 'org' })
  })
})

test.group('Node agent info', () => {
  test('reports the live token expiry and the measured heartbeat interval', async ({ client, assert }) => {
    const owner = await register(client, 'agent-info@test.io')
    const { nodeId } = await enrolledNode(client, owner.token)

    const base = Date.now()
    await db.table('node_metrics').multiInsert(
      [0, 10, 20, 30, 40].map((s) => ({ node_id: nodeId, recorded_at: new Date(base - s * 1000) }))
    )

    const res = await client.get(`/api/v1/nodes/${nodeId}`).header('Authorization', `Bearer ${owner.token}`)
    res.assertStatus(200)
    const agent = res.body().node.agent

    assert.equal(agent.heartbeatIntervalSeconds, 10)
    const days = (Date.parse(agent.tokenExpiresAt) - Date.now()) / 86_400_000
    assert.approximately(days, 90, 1)
  })

  test('without heartbeats there is no interval to report', async ({ client, assert }) => {
    const owner = await register(client, 'agent-info-new@test.io')
    const { nodeId } = await enrolledNode(client, owner.token)
    const res = await client.get(`/api/v1/nodes/${nodeId}`).header('Authorization', `Bearer ${owner.token}`)
    assert.isNull(res.body().node.agent.heartbeatIntervalSeconds)
  })

  test('versions compare numerically', ({ assert }) => {
    assert.equal(compareVersions('1.9.0', '1.10.0'), -1)
    assert.equal(compareVersions('v1.0.1', '1.0.1'), 0)
    assert.equal(compareVersions('2.0', '1.9.9'), 1)
  })
})

test.group('Latest metric', () => {
  test('each node gets its own newest sample, and a node without samples gets none', async ({
    client,
    assert,
  }) => {
    const owner = await register(client, 'latest-metric@test.io')
    const a = await enrolledNode(client, owner.token)
    const b = await enrolledNode(client, owner.token)
    const silent = await enrolledNode(client, owner.token)

    const now = Date.now()
    await db.table('node_metrics').multiInsert([
      { node_id: a.nodeId, recorded_at: new Date(now - 60_000), cpu_percent: 10 },
      { node_id: a.nodeId, recorded_at: new Date(now), cpu_percent: 42 },
      { node_id: a.nodeId, recorded_at: new Date(now - 30_000), cpu_percent: 20 },
      { node_id: b.nodeId, recorded_at: new Date(now - 5_000), cpu_percent: 77, bytes_sent: 1234 },
    ])

    const res = await client.get('/api/v1/nodes').header('Authorization', `Bearer ${owner.token}`)
    res.assertStatus(200)
    const byId = Object.fromEntries(res.body().data.map((n: any) => [n.id, n.latestMetric]))

    assert.equal(byId[a.nodeId].cpuPercent, 42)
    assert.equal(byId[b.nodeId].cpuPercent, 77)
    assert.equal(byId[b.nodeId].bytesSent, 1234)
    assert.isNull(byId[silent.nodeId])

    const show = await client.get(`/api/v1/nodes/${a.nodeId}`).header('Authorization', `Bearer ${owner.token}`)
    assert.equal(show.body().node.latestMetric.cpuPercent, 42)
  })
})

test.group('Chart periods', () => {
  test('samples are averaged per bucket, counters keep their last reading, and the window is the period', async ({
    client,
    assert,
  }) => {
    const owner = await register(client, 'periods@test.io')
    const { nodeId } = await enrolledNode(client, owner.token)

    // Two samples in the same 5-minute bucket, one 3 days old.
    const bucketStart = Math.floor((Date.now() - 3_600_000) / 300_000) * 300_000
    await db.table('node_metrics').multiInsert([
      { node_id: nodeId, recorded_at: new Date(bucketStart + 10_000), cpu_percent: 10, bytes_sent: 100 },
      { node_id: nodeId, recorded_at: new Date(bucketStart + 20_000), cpu_percent: 30, bytes_sent: 500 },
      { node_id: nodeId, recorded_at: new Date(Date.now() - 3 * 86_400_000), cpu_percent: 99, bytes_sent: 1 },
    ])

    const get = (period: string) =>
      client
        .get(`/api/v1/nodes/${nodeId}/metrics`)
        .qs({ period })
        .header('Authorization', `Bearer ${owner.token}`)

    const day = await get('1d')
    day.assertStatus(200)
    const points = day.body().metrics
    assert.lengthOf(points, 1)
    assert.equal(points[0].cpuPercent, 20)
    assert.equal(points[0].bytesSent, 500)
    assert.equal(Date.parse(points[0].recordedAt), bucketStart)

    const week = (await get('1w')).body().metrics
    assert.lengthOf(week, 2)
    assert.isBelow(Date.parse(week[0].recordedAt), Date.parse(week[1].recordedAt))

    // Same answer once TimescaleDB has materialized the hourly rollup — the
    // path every chart older than an hour or two takes in production.
    await db.rawQuery(`CALL refresh_continuous_aggregate('node_metrics_hourly', NULL, now())`)
    const materialized = (await get('1w')).body().metrics
    assert.deepEqual(materialized, week)
    assert.equal(materialized[1].cpuPercent, 20)
    assert.equal(materialized[1].bytesSent, 500)

    ;(await get('forever')).assertStatus(400)
  })
})

test.group('Peers', () => {
  test('a peer missing from the latest heartbeat is gone, and an empty list clears them all', async ({
    client,
    assert,
  }) => {
    const owner = await register(client, 'peers@test.io')
    const { nodeId, agentToken } = await enrolledNode(client, owner.token)
    const peer = (key: string, ip: string) => ({
      public_key: key,
      name: key,
      allowed_ips: [ip],
      last_handshake_at: new Date().toISOString(),
      bytes_sent: 1,
      bytes_received: 1,
    })
    const names = async () =>
      (await db.from('node_peer_stats').where('node_id', nodeId).select('peer_pubkey')).map((r) => r.peer_pubkey).sort()

    ;(await heartbeat(client, agentToken, { peers: [peer('laptop', '100.64.0.2'), peer('phone', '100.64.0.3')] })).assertStatus(200)
    assert.deepEqual(await names(), ['laptop', 'phone'])

    ;(await heartbeat(client, agentToken, { peers: [peer('laptop', '100.64.0.2')] })).assertStatus(200)
    assert.deepEqual(await names(), ['laptop'])

    // No peers field at all (the agent could not read them): leave the rows alone.
    ;(await heartbeat(client, agentToken)).assertStatus(200)
    assert.deepEqual(await names(), ['laptop'])

    ;(await heartbeat(client, agentToken, { peers: [] })).assertStatus(200)
    assert.deepEqual(await names(), [])
  })
})

test.group('Public address', () => {
  test('the public IP is the one the API sees, never the LAN address the agent reports', async ({
    client,
    assert,
  }) => {
    const owner = await register(client, 'public-ip@test.io')
    const created = await client
      .post('/api/v1/nodes')
      .header('Authorization', `Bearer ${owner.token}`)
      .json({ name: 'behind-a-box', category: 'sbc' })
    const nodeId = created.body().node.id
    const et = await client
      .post(`/api/v1/nodes/${nodeId}/enroll-token`)
      .header('Authorization', `Bearer ${owner.token}`)

    // Arrives through the tunnel: the proxy chain carries the visitor's address.
    const enrolled = await client
      .post('/api/v1/agent/register')
      .header('X-Forwarded-For', '203.0.113.7')
      .json({ token: et.body().enrollToken, hostname: 'pi', ip_address: '192.168.1.207' })
    enrolled.assertStatus(201)
    const agentToken = enrolled.body().auth_token
    assert.equal((await Node.findOrFail(nodeId)).ipAddress, '203.0.113.7')

    // The box gets a new lease.
    await client
      .post('/api/v1/agent/heartbeat')
      .header('Authorization', `Bearer ${agentToken}`)
      .header('X-Forwarded-For', '198.51.100.9')
      .json({ timestamp: new Date().toISOString() })
    assert.equal((await Node.findOrFail(nodeId)).ipAddress, '198.51.100.9')

    // Reached over a private network: nothing public to learn, keep what we had.
    await heartbeat(client, agentToken)
    assert.equal((await Node.findOrFail(nodeId)).ipAddress, '198.51.100.9')

    // A LAN address stored by an older version is dropped rather than shown as public.
    await db.from('nodes').where('id', nodeId).update({ ip_address: '192.168.1.207' })
    await heartbeat(client, agentToken)
    assert.isNull((await Node.findOrFail(nodeId)).ipAddress)
  })
})
