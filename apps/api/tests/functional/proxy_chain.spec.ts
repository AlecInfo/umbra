import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'

/*
| The visitor behind the tunnel: Cloudflare → cloudflared → Caddy → API.
|
| Caddy forwards `X-Forwarded-For: <visitor>, <cloudflared>` (once it trusts the
| Docker network — see the Caddyfile) and the API must walk that chain back to
| the visitor. In production every login was recorded as 172.18.0.7 for weeks
| without anything failing loudly: the throttle had one bucket for the whole
| internet. These tests are the alarm that was missing.
*/
test.group('Proxy chain', () => {
  test('a login through the tunnel is recorded with the visitor, not the proxy', async ({ client, assert }) => {
    await client.post('/api/v1/auth/register').json({ email: 'behind-tunnel@test.io', password: 'supersecret' })
    const res = await client
      .post('/api/v1/auth/login')
      .header('X-Forwarded-For', '203.0.113.5, 172.18.0.7')
      .json({ email: 'behind-tunnel@test.io', password: 'supersecret' })
    res.assertStatus(200)

    const row = await db.from('audit_logs').where('action', 'login').orderBy('created_at', 'desc').first()
    assert.equal(row.ip_address, '203.0.113.5')
  })

  test('a forged X-Forwarded-For does not hide the real visitor', async ({ client, assert }) => {
    await client.post('/api/v1/auth/register').json({ email: 'forger@test.io', password: 'supersecret' })
    // The client claims to be 1.2.3.4; Cloudflare appends the address it really saw.
    await client
      .post('/api/v1/auth/login')
      .header('X-Forwarded-For', '1.2.3.4, 198.51.100.7, 172.18.0.7')
      .json({ email: 'forger@test.io', password: 'supersecret' })

    const row = await db.from('audit_logs').where('action', 'login').orderBy('created_at', 'desc').first()
    assert.equal(row.ip_address, '198.51.100.7')
  })
})
