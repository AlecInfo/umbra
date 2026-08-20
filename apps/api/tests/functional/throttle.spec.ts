import { test } from '@japa/runner'

test.group('Throttling and payload validation', () => {
  test('brute-forcing a password gets blocked', async ({ client, assert }) => {
    await client.post('/api/v1/auth/register').json({
      email: 'throttled@test.io',
      password: 'supersecret',
    })

    // 10 attempts per minute, so the 11th must not reach the controller.
    const codes: number[] = []
    for (let i = 0; i < 12; i++) {
      const res = await client.post('/api/v1/auth/login').json({
        email: 'throttled@test.io',
        password: 'wrong-password',
      })
      codes.push(res.status())
    }

    assert.notInclude(codes.slice(0, 10), 429, 'legitimate retries must not be blocked')
    assert.equal(codes[11], 429)
  })

  test('a malformed timestamp is rejected, not turned into a 500', async ({ client, assert }) => {
    const reg = await client.post('/api/v1/auth/register').json({
      email: 'iso@test.io',
      password: 'supersecret',
    })
    const userToken = reg.body().token.value

    const created = await client
      .post('/api/v1/nodes')
      .header('Authorization', `Bearer ${userToken}`)
      .json({ name: 'iso-node', category: 'sbc' })

    const et = await client
      .post(`/api/v1/nodes/${created.body().node.id}/enroll-token`)
      .header('Authorization', `Bearer ${userToken}`)

    const enrolled = await client.post('/api/v1/agent/register').json({
      token: et.body().enrollToken,
      hostname: 'iso-host',
    })
    const agentToken = enrolled.body().auth_token as string

    // Used to reach `new Date('not-a-date')` and blow up in SQL.
    const bad = await client
      .post('/api/v1/agent/heartbeat')
      .header('Authorization', `Bearer ${agentToken}`)
      .json({ timestamp: 'not-a-date' })
    assert.equal(bad.status(), 422)

    // Syntactically plausible but impossible values must fail too — a regex
    // would have let this through.
    const impossible = await client
      .post('/api/v1/agent/heartbeat')
      .header('Authorization', `Bearer ${agentToken}`)
      .json({ timestamp: '2026-13-45T99:99:99Z' })
    assert.equal(impossible.status(), 422)

    // A peer timestamp is validated the same way.
    const badPeer = await client
      .post('/api/v1/agent/heartbeat')
      .header('Authorization', `Bearer ${agentToken}`)
      .json({
        timestamp: new Date().toISOString(),
        peers: [{ public_key: 'nodekey:abc', last_handshake_at: 'yesterday' }],
      })
    assert.equal(badPeer.status(), 422)

    // And a well-formed one still works.
    const ok = await client
      .post('/api/v1/agent/heartbeat')
      .header('Authorization', `Bearer ${agentToken}`)
      .json({ timestamp: new Date().toISOString() })
    assert.equal(ok.status(), 200)
  })
})
