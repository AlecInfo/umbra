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
      ['agent_updated', 'back_online', 'went_offline', 'enrolled', 'created']
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
