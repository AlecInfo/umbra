import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import AgentToken from '#models/agent_token'

async function enrollAgent(client: any) {
  const reg = await client.post('/api/v1/auth/register').json({
    email: 'rotation-owner@test.io',
    password: 'supersecret',
  })
  const userToken = reg.body().token.value

  const created = await client
    .post('/api/v1/nodes')
    .header('Authorization', `Bearer ${userToken}`)
    .json({ name: 'rotation-node', category: 'sbc' })
  const nodeId = created.body().node.id

  const et = await client
    .post(`/api/v1/nodes/${nodeId}/enroll-token`)
    .header('Authorization', `Bearer ${userToken}`)

  const enrolled = await client.post('/api/v1/agent/register').json({
    token: et.body().enrollToken,
    hostname: 'rotation-host',
  })
  return { nodeId, agentToken: enrolled.body().auth_token as string }
}

function heartbeat(client: any, token: string) {
  return client
    .post('/api/v1/agent/heartbeat')
    .header('Authorization', `Bearer ${token}`)
    .json({})
}

test.group('Agent token rotation', () => {
  test('lost rotation response does not lock the agent out', async ({ client, assert }) => {
    const { nodeId, agentToken: oldToken } = await enrollAgent(client)

    // Force imminent expiry so the next heartbeat rotates
    await AgentToken.query()
      .where('node_id', nodeId)
      .update({ expires_at: DateTime.now().plus({ days: 2 }).toSQL() })

    const hb1 = await heartbeat(client, oldToken)
    hb1.assertStatus(200)
    const newToken = hb1.body().new_token as string
    assert.isNotNull(newToken)
    assert.notEqual(newToken, oldToken)

    // Simulate a lost response: the agent keeps using the OLD token → still accepted
    const hb2 = await heartbeat(client, oldToken)
    hb2.assertStatus(200)

    // The agent eventually uses the new token → accepted, grace revoked
    const hb3 = await heartbeat(client, newToken)
    hb3.assertStatus(200)

    // The old token is now dead
    const hb4 = await heartbeat(client, oldToken)
    hb4.assertStatus(401)
  })
})
