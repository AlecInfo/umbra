import { test } from '@japa/runner'

async function setup(client: any) {
  const reg = await client.post('/api/v1/auth/register').json({
    email: 'agent-owner@test.io',
    password: 'supersecret',
  })
  const token = reg.body().token.value

  const created = await client
    .post('/api/v1/nodes')
    .header('Authorization', `Bearer ${token}`)
    .json({ name: 'agent-node', category: 'sbc' })
  const nodeId = created.body().node.id

  const et = await client
    .post(`/api/v1/nodes/${nodeId}/enroll-token`)
    .header('Authorization', `Bearer ${token}`)
  return {
    userToken: token,
    nodeId,
    enrollToken: et.body().enrollToken as string,
  }
}

test.group('Agent', () => {
  test('register rotates the enroll token into a long-lived agent token', async ({
    client,
    assert,
  }) => {
    const { enrollToken, nodeId, userToken } = await setup(client)

    const res = await client.post('/api/v1/agent/register').json({
      token: enrollToken,
      hostname: 'raspi-test',
      agent_version: '1.0.0',
    })
    res.assertStatus(201)
    assert.match(res.body().auth_token, /^umbra_agent_/)
    assert.equal(res.body().node_id, nodeId)
    assert.isString(res.body().headscale_url)

    const show = await client
      .get(`/api/v1/nodes/${nodeId}`)
      .header('Authorization', `Bearer ${userToken}`)
    assert.equal(show.body().node.status, 'online')
  })

  test('register with an invalid token returns 401', async ({ client }) => {
    const res = await client.post('/api/v1/agent/register').json({
      token: 'umbra_enroll_totally_fake_token_0000000000000000',
      hostname: 'raspi-test',
    })
    res.assertStatus(401)
  })

  test('heartbeat carries metrics and peers inline', async ({ client, assert }) => {
    const { enrollToken, userToken, nodeId } = await setup(client)

    const registered = await client
      .post('/api/v1/agent/register')
      .json({ token: enrollToken, hostname: 'raspi-test' })
    const agentToken = registered.body().auth_token

    const hb = await client
      .post('/api/v1/agent/heartbeat')
      .header('Authorization', `Bearer ${agentToken}`)
      .json({
        timestamp: new Date().toISOString(),
        agent_version: '1.0.0',
        metrics: {
          cpu_percent: 12.5,
          memory_percent: 45.2,
          disk_percent: 38.1,
          temperature_celsius: 52.3,
          uptime_seconds: 1234567,
          latency_ms: 18,
          active_peers: 1,
        },
        peers: [
          {
            public_key: 'FAKEPEERPUBKEY==',
            last_handshake_at: new Date().toISOString(),
            bytes_sent: 1024,
            bytes_received: 2048,
          },
        ],
      })
    hb.assertStatus(200)
    assert.equal(hb.body().ok, true)

    const userPeers = await client
      .get(`/api/v1/nodes/${nodeId}/peers`)
      .header('Authorization', `Bearer ${userToken}`)
    userPeers.assertStatus(200)
    assert.lengthOf(userPeers.body().peers, 1)
    assert.equal(userPeers.body().peers[0].peerPubkey, 'FAKEPEERPUBKEY==')
    assert.isTrue(userPeers.body().peers[0].isActive)

    const userMetrics = await client
      .get(`/api/v1/nodes/${nodeId}/metrics`)
      .header('Authorization', `Bearer ${userToken}`)
    userMetrics.assertStatus(200)
    assert.lengthOf(userMetrics.body().metrics, 1)
  })

  test('agent endpoints refuse a fake bearer token', async ({ client }) => {
    const res = await client
      .post('/api/v1/agent/heartbeat')
      .header('Authorization', 'Bearer umbra_agent_not_a_real_token')
      .json({})
    res.assertStatus(401)
  })
})
