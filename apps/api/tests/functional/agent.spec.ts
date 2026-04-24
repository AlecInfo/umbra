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
  test('enroll rotates the enroll token into a long-lived agent token', async ({
    client,
    assert,
  }) => {
    const { enrollToken, nodeId } = await setup(client)

    const res = await client.post('/api/v1/agent/enroll').json({
      enrollToken,
      hostname: 'raspi-test',
      agentVersion: '1.0.0',
    })
    res.assertStatus(201)
    assert.match(res.body().agentToken, /^umbra_agent_/)
    assert.equal(res.body().node.id, nodeId)
    assert.equal(res.body().node.status, 'online')
  })

  test('enroll with an invalid token returns 401', async ({ client }) => {
    const res = await client.post('/api/v1/agent/enroll').json({
      enrollToken: 'umbra_enroll_totally_fake_token_0000000000000000',
      hostname: 'raspi-test',
    })
    res.assertStatus(401)
  })

  test('heartbeat + metrics + peers flow', async ({ client, assert }) => {
    const { enrollToken, userToken, nodeId } = await setup(client)

    const enrolled = await client
      .post('/api/v1/agent/enroll')
      .json({ enrollToken, hostname: 'raspi-test' })
    const agentToken = enrolled.body().agentToken

    const hb = await client
      .post('/api/v1/agent/heartbeat')
      .header('Authorization', `Bearer ${agentToken}`)
      .json({ agentVersion: '1.0.0', ipAddress: '82.120.45.12' })
    hb.assertStatus(200)
    assert.equal(hb.body().ok, true)

    const metrics = await client
      .post('/api/v1/agent/metrics')
      .header('Authorization', `Bearer ${agentToken}`)
      .json({
        samples: [
          {
            cpuPercent: 12.5,
            memoryPercent: 45.2,
            diskPercent: 38.1,
            temperatureCelsius: 52.3,
            uptimeSeconds: 1234567,
            latencyMs: 18,
            activePeers: 3,
          },
        ],
      })
    metrics.assertStatus(201)
    assert.equal(metrics.body().inserted, 1)

    const peers = await client
      .post('/api/v1/agent/peers')
      .header('Authorization', `Bearer ${agentToken}`)
      .json({
        peers: [
          {
            pubkey: 'FAKEPEERPUBKEY==',
            name: 'alec-mbp',
            allowedIps: ['100.64.0.2/32'],
            bytesSent: 1024,
            bytesReceived: 2048,
          },
        ],
      })
    peers.assertStatus(200)
    assert.equal(peers.body().updated, 1)

    const userPeers = await client
      .get(`/api/v1/nodes/${nodeId}/peers`)
      .header('Authorization', `Bearer ${userToken}`)
    userPeers.assertStatus(200)
    assert.lengthOf(userPeers.body().peers, 1)
    assert.equal(userPeers.body().peers[0].peerName, 'alec-mbp')

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
