import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import Node from '#models/node'
import NodeAlert from '#models/node_alert'
import { markStaleNodesOffline } from '#services/offline_watch'

async function setupOnlineNode(client: any) {
  const reg = await client.post('/api/v1/auth/register').json({
    email: 'offline-owner@test.io',
    password: 'supersecret',
  })
  const userToken = reg.body().token.value
  const userId = reg.body().user.id

  const created = await client
    .post('/api/v1/nodes')
    .header('Authorization', `Bearer ${userToken}`)
    .json({ name: 'sweep-node', category: 'sbc' })
  const nodeId = created.body().node.id

  const et = await client
    .post(`/api/v1/nodes/${nodeId}/enroll-token`)
    .header('Authorization', `Bearer ${userToken}`)

  const enrolled = await client.post('/api/v1/agent/enroll').json({
    enrollToken: et.body().enrollToken,
    hostname: 'sweep-host',
  })
  return { nodeId, userId, agentToken: enrolled.body().agentToken as string }
}

test.group('Offline detection', () => {
  test('sweep marks stale nodes offline, triggers alerts; heartbeat recovers and resolves', async ({
    client,
    assert,
  }) => {
    const { nodeId, userId, agentToken } = await setupOnlineNode(client)

    const alert = await NodeAlert.create({
      nodeId,
      createdBy: userId,
      type: 'node_offline',
      isActive: true,
    })

    // Fresh heartbeat: the sweep must not touch the node
    let swept = await markStaleNodesOffline()
    assert.notInclude(swept, nodeId)

    // Backdate the last heartbeat beyond the threshold
    const node = await Node.findOrFail(nodeId)
    node.lastSeenAt = DateTime.now().minus({ minutes: 5 })
    await node.save()

    swept = await markStaleNodesOffline()
    assert.include(swept, nodeId)
    await node.refresh()
    assert.equal(node.status, 'offline')

    await alert.refresh()
    assert.isNotNull(alert.triggeredAt)
    assert.isNull(alert.resolvedAt)

    // Agent comes back: heartbeat flips the node online and resolves the alert
    const hb = await client
      .post('/api/v1/agent/heartbeat')
      .header('Authorization', `Bearer ${agentToken}`)
      .json({ timestamp: new Date().toISOString() })
    hb.assertStatus(200)

    await node.refresh()
    assert.equal(node.status, 'online')
    await alert.refresh()
    assert.isNotNull(alert.resolvedAt)

    // Idempotence: a second sweep right after recovery does nothing
    swept = await markStaleNodesOffline()
    assert.notInclude(swept, nodeId)
  })

  test('pending nodes are never swept', async ({ client, assert }) => {
    const reg = await client.post('/api/v1/auth/register').json({
      email: 'pending-owner@test.io',
      password: 'supersecret',
    })
    const created = await client
      .post('/api/v1/nodes')
      .header('Authorization', `Bearer ${reg.body().token.value}`)
      .json({ name: 'never-enrolled', category: 'vps' })
    const nodeId = created.body().node.id

    const swept = await markStaleNodesOffline()
    assert.notInclude(swept, nodeId)
    const node = await Node.findOrFail(nodeId)
    assert.equal(node.status, 'pending')
  })
})
