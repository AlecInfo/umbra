import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import Node from '#models/node'
import NodeAlert from '#models/node_alert'
import { markStaleNodesOffline } from '#services/offline_watch'
import { alertRecipients } from '#services/alerts'

async function register(client: any, email: string) {
  const res = await client.post('/api/v1/auth/register').json({ email, password: 'supersecret' })
  return { token: res.body().token.value as string, id: res.body().user.id as string }
}

async function enrolledNode(client: any, ownerToken: string, body: Record<string, unknown> = {}) {
  const created = await client
    .post('/api/v1/nodes')
    .header('Authorization', `Bearer ${ownerToken}`)
    .json({ name: 'watched', category: 'sbc', ...body })
  const nodeId = created.body().node.id as string
  const et = await client.post(`/api/v1/nodes/${nodeId}/enroll-token`).header('Authorization', `Bearer ${ownerToken}`)
  const enrolled = await client.post('/api/v1/agent/register').json({ token: et.body().enrollToken, hostname: 'h' })
  return { nodeId, agentToken: enrolled.body().auth_token as string }
}

/** `count` older samples, then a heartbeat carrying one more: the last minute. */
async function lastMinute(client: any, nodeId: string, agentToken: string, older: number[], latest: number) {
  const now = Date.now()
  if (older.length) {
    await db.table('node_metrics').multiInsert(
      older.map((cpu, i) => ({ node_id: nodeId, recorded_at: new Date(now - (older.length - i) * 10_000), cpu_percent: cpu }))
    )
  }
  const res = await client
    .post('/api/v1/agent/heartbeat')
    .header('Authorization', `Bearer ${agentToken}`)
    .json({ timestamp: new Date(now).toISOString(), metrics: { cpu_percent: latest } })
  res.assertStatus(200)
}

const rule = (nodeId: string, type: string) =>
  NodeAlert.query().where('node_id', nodeId).where('type', type).firstOrFail()

async function events(nodeId: string) {
  const rows = await db.from('node_events').where('node_id', nodeId).orderBy('created_at', 'asc')
  return rows.map((r) => `${r.type}:${r.data?.type ?? ''}`)
}

test.group('Alert rules', () => {
  test('enrolling a node gives it the default rules', async ({ client, assert }) => {
    const owner = await register(client, 'rules@test.io')
    const { nodeId } = await enrolledNode(client, owner.token)
    const rules = await NodeAlert.query().where('node_id', nodeId).orderBy('type')
    assert.deepEqual(
      rules.map((r) => [r.type, r.thresholdValue]),
      [['cpu_high', 90], ['disk_high', 90], ['memory_high', 90], ['node_offline', null], ['temperature_high', 80]]
    )
    // Configuration, not alerts: nothing to show yet.
    const list = await client.get('/api/v1/alerts').header('Authorization', `Bearer ${owner.token}`)
    assert.lengthOf(list.body().data, 0)
  })

  test('a sustained high CPU fires, marks the node warning, and is listed with its real reading', async ({
    client,
    assert,
  }) => {
    const owner = await register(client, 'cpu@test.io')
    const { nodeId, agentToken } = await enrolledNode(client, owner.token)

    await lastMinute(client, nodeId, agentToken, [95, 96, 94, 97, 95], 96)

    const cpu = await rule(nodeId, 'cpu_high')
    assert.isNotNull(cpu.triggeredAt)
    assert.isNull(cpu.resolvedAt)
    assert.approximately(cpu.lastValue!, 95.5, 0.01)
    assert.equal((await Node.findOrFail(nodeId)).status, 'warning')
    assert.include(await events(nodeId), 'alert_triggered:cpu_high')

    const list = await client.get('/api/v1/alerts').header('Authorization', `Bearer ${owner.token}`)
    const [alert] = list.body().data
    assert.equal(alert.type, 'cpu_high')
    assert.isTrue(alert.firing)
    assert.approximately(alert.lastValue, 95.5, 0.01)
    assert.equal(alert.thresholdValue, 90)
  })

  test('a ten-second spike is not an incident', async ({ client, assert }) => {
    const owner = await register(client, 'spike@test.io')
    const { nodeId, agentToken } = await enrolledNode(client, owner.token)
    await lastMinute(client, nodeId, agentToken, [20, 22, 19, 21, 20], 100)
    assert.isNull((await rule(nodeId, 'cpu_high')).triggeredAt)
    assert.equal((await Node.findOrFail(nodeId)).status, 'online')
  })

  test('it resolves only once clearly under the threshold, and the node is back to online', async ({
    client,
    assert,
  }) => {
    const owner = await register(client, 'resolve@test.io')
    const { nodeId, agentToken } = await enrolledNode(client, owner.token)
    await lastMinute(client, nodeId, agentToken, [95, 95, 95, 95, 95], 95)
    assert.equal((await Node.findOrFail(nodeId)).status, 'warning')

    // Hovering just under the line: still firing.
    await db.from('node_metrics').where('node_id', nodeId).delete()
    await lastMinute(client, nodeId, agentToken, [88, 87, 88, 87, 88], 87)
    assert.isNull((await rule(nodeId, 'cpu_high')).resolvedAt)

    await db.from('node_metrics').where('node_id', nodeId).delete()
    await lastMinute(client, nodeId, agentToken, [40, 35, 30, 30, 30], 30)
    const cpu = await rule(nodeId, 'cpu_high')
    assert.isNotNull(cpu.resolvedAt)
    assert.equal((await Node.findOrFail(nodeId)).status, 'online')
    assert.includeMembers(await events(nodeId), ['alert_triggered:cpu_high', 'alert_resolved:cpu_high'])

    const list = await client.get('/api/v1/alerts').header('Authorization', `Bearer ${owner.token}`)
    assert.isFalse(list.body().data[0].firing)
  })

  test('a node that goes silent fires the offline rule, and a heartbeat resolves it', async ({ client, assert }) => {
    const owner = await register(client, 'silent@test.io')
    const { nodeId, agentToken } = await enrolledNode(client, owner.token)

    const node = await Node.findOrFail(nodeId)
    node.lastSeenAt = DateTime.now().minus({ minutes: 5 })
    await node.save()
    await markStaleNodesOffline()
    assert.isNotNull((await rule(nodeId, 'node_offline')).triggeredAt)

    await client
      .post('/api/v1/agent/heartbeat')
      .header('Authorization', `Bearer ${agentToken}`)
      .json({ timestamp: new Date().toISOString() })
    assert.isNotNull((await rule(nodeId, 'node_offline')).resolvedAt)
    assert.includeMembers(await events(nodeId), ['alert_triggered:node_offline', 'alert_resolved:node_offline'])
  })
})

test.group('Alert notifications', () => {
  test('preferences are saved per account and the server says whether it can mail', async ({ client, assert }) => {
    const owner = await register(client, 'prefs@test.io')
    const auth = { Authorization: `Bearer ${owner.token}` }

    let me = await client.get('/api/v1/auth/me').headers(auth)
    assert.deepEqual(me.body().user.notificationPrefs, { offline: true, system: true })
    assert.isFalse(me.body().mailEnabled)

    ;(await client.patch('/api/v1/auth/me').headers(auth).json({ notificationPrefs: { system: false } })).assertStatus(200)
    me = await client.get('/api/v1/auth/me').headers(auth)
    assert.deepEqual(me.body().user.notificationPrefs, { offline: true, system: false })
  })

  test('a personal node alerts its owner, as far as they asked for it', async ({ client, assert }) => {
    const owner = await register(client, 'personal@test.io')
    const { nodeId } = await enrolledNode(client, owner.token)
    await client
      .patch('/api/v1/auth/me')
      .header('Authorization', `Bearer ${owner.token}`)
      .json({ notificationPrefs: { system: false } })

    const node = await Node.findOrFail(nodeId)
    assert.deepEqual((await alertRecipients(node, 'node_offline')).map((u) => u.email), ['personal@test.io'])
    assert.lengthOf(await alertRecipients(node, 'cpu_high'), 0)
  })

  test('an org node alerts its owners and admins, not its members', async ({ client, assert }) => {
    const owner = await register(client, 'org-owner@test.io')
    const member = await register(client, 'org-member@test.io')
    const org = await client.post('/api/v1/orgs').header('Authorization', `Bearer ${owner.token}`).json({ name: 'Lab' })
    const orgId = org.body().org.id
    await db.table('org_members').insert({ org_id: orgId, user_id: member.id, role: 'member' })

    const { nodeId } = await enrolledNode(client, owner.token, { orgId })
    const node = await Node.findOrFail(nodeId)
    assert.deepEqual((await alertRecipients(node, 'node_offline')).map((u) => u.email), ['org-owner@test.io'])
  })
})
