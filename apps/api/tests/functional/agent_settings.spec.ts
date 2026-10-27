import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import Node from '#models/node'
import { markStaleNodesOffline } from '#services/offline_watch'

async function register(client: any, email: string) {
  const res = await client.post('/api/v1/auth/register').json({ email, password: 'supersecret' })
  return { token: res.body().token.value as string, id: res.body().user.id as string }
}

async function enrolledNode(client: any, ownerToken: string) {
  const created = await client
    .post('/api/v1/nodes')
    .header('Authorization', `Bearer ${ownerToken}`)
    .json({ name: 'tuned', category: 'sbc' })
  const nodeId = created.body().node.id as string
  const et = await client.post(`/api/v1/nodes/${nodeId}/enroll-token`).header('Authorization', `Bearer ${ownerToken}`)
  const enrolled = await client.post('/api/v1/agent/register').json({ token: et.body().enrollToken, hostname: 'h' })
  return { nodeId, agentToken: enrolled.body().auth_token as string }
}

function heartbeat(client: any, agentToken: string, config?: { heartbeat_interval_seconds: number; auto_update: boolean }) {
  return client
    .post('/api/v1/agent/heartbeat')
    .header('Authorization', `Bearer ${agentToken}`)
    .json({ timestamp: new Date().toISOString(), ...(config ? { config } : {}) })
}

test.group('Agent settings', () => {
  test('every heartbeat tells the agent what to run with, defaults first', async ({ client, assert }) => {
    const owner = await register(client, 'agent-defaults@test.io')
    const { agentToken } = await enrolledNode(client, owner.token)
    const res = await heartbeat(client, agentToken)
    res.assertStatus(200)
    assert.deepEqual(res.body().config, { heartbeat_interval_seconds: 10, auto_update: true })
  })

  test('a setting changed on the node reaches the agent, and the agent reporting it marks it applied', async ({
    client,
    assert,
  }) => {
    const owner = await register(client, 'agent-node@test.io')
    const auth = { Authorization: `Bearer ${owner.token}` }
    const { nodeId, agentToken } = await enrolledNode(client, owner.token)

    // An old agent reports nothing: nobody can tell whether it applies anything.
    await heartbeat(client, agentToken)
    let show = await client.get(`/api/v1/nodes/${nodeId}`).headers(auth)
    assert.isNull(show.body().node.agent.settingsApplied)

    ;(await client.patch(`/api/v1/nodes/${nodeId}`).headers(auth).json({ heartbeatIntervalSeconds: 60, autoUpdate: false })).assertStatus(200)

    // The agent still runs the old values: pending.
    const res = await heartbeat(client, agentToken, { heartbeat_interval_seconds: 10, auto_update: true })
    assert.deepEqual(res.body().config, { heartbeat_interval_seconds: 60, auto_update: false })
    show = await client.get(`/api/v1/nodes/${nodeId}`).headers(auth)
    assert.isFalse(show.body().node.agent.settingsApplied)

    // Next beat, it has applied them.
    await heartbeat(client, agentToken, { heartbeat_interval_seconds: 60, auto_update: false })
    show = await client.get(`/api/v1/nodes/${nodeId}`).headers(auth)
    assert.isTrue(show.body().node.agent.settingsApplied)
    assert.equal(show.body().node.heartbeatIntervalSeconds, 60)
    assert.isFalse(show.body().node.autoUpdate)
  })

  test('the interval stays within 5 s and 5 min', async ({ client }) => {
    const owner = await register(client, 'agent-range@test.io')
    const { nodeId } = await enrolledNode(client, owner.token)
    for (const v of [2, 301, 12.5]) {
      ;(await client
        .patch(`/api/v1/nodes/${nodeId}`)
        .header('Authorization', `Bearer ${owner.token}`)
        .json({ heartbeatIntervalSeconds: v })).assertStatus(422)
    }
  })

  test('account defaults apply to every personal node, and to the ones enrolled later', async ({ client, assert }) => {
    const owner = await register(client, 'agent-account@test.io')
    const auth = { Authorization: `Bearer ${owner.token}` }
    const first = await enrolledNode(client, owner.token)

    ;(await client.patch('/api/v1/auth/me').headers(auth).json({ agentDefaults: { heartbeatIntervalSeconds: 30, autoUpdate: false } })).assertStatus(200)
    const me = await client.get('/api/v1/auth/me').headers(auth)
    assert.deepEqual(me.body().user.agentDefaults, { heartbeatIntervalSeconds: 30, autoUpdate: false })

    const a = await Node.findOrFail(first.nodeId)
    assert.equal(a.heartbeatIntervalSeconds, 30)
    assert.isFalse(a.autoUpdate)

    const later = await enrolledNode(client, owner.token)
    const b = await Node.findOrFail(later.nodeId)
    assert.equal(b.heartbeatIntervalSeconds, 30)
    assert.isFalse(b.autoUpdate)
  })
})

test.group('Offline threshold', () => {
  test('a node on a slow interval is not declared offline between two normal beats', async ({ client, assert }) => {
    const owner = await register(client, 'agent-slow@test.io')
    const { nodeId } = await enrolledNode(client, owner.token)
    const node = await Node.findOrFail(nodeId)
    node.heartbeatIntervalSeconds = 120
    node.lastSeenAt = DateTime.now().minus({ minutes: 3 }) // 1.5 beats late at most
    await node.save()
    assert.notInclude(await markStaleNodesOffline(), nodeId)

    node.lastSeenAt = DateTime.now().minus({ minutes: 7 }) // > 3 beats + 30 s
    await node.save()
    assert.include(await markStaleNodesOffline(), nodeId)
  })
})
