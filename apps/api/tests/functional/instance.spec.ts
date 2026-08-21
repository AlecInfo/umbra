import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'

const auth = (t: string) => ({ Authorization: `Bearer ${t}` })

async function register(client: any, email: string, password = 'supersecret') {
  const res = await client.post('/api/v1/auth/register').json({ email, password })
  return {
    status: res.status(),
    body: res.body(),
    token: res.body()?.token?.value as string | undefined,
    id: res.body()?.user?.id as string | undefined,
  }
}

async function setMode(mode: string) {
  await db.from('instance_settings').where('id', 1).update({ registration_mode: mode })
}

test.group('Instance layer', () => {
  test('the first account becomes operator, the next ones do not', async ({ client, assert }) => {
    const first = await register(client, 'boss@test.io')
    const second = await register(client, 'regular@test.io')

    assert.equal(first.body.user.instanceRole, 'operator')
    assert.equal(second.body.user.instanceRole, 'user')

    const overview = await client.get('/api/v1/admin/overview').headers(auth(first.token!))
    overview.assertStatus(200)
    assert.equal(overview.body().users, 2)
    assert.equal(overview.body().operators, 1)

    // A normal account is not told the surface exists at all.
    const denied = await client.get('/api/v1/admin/overview').headers(auth(second.token!))
    denied.assertStatus(404)
  })

  test('the account list reports node counts', async ({ client, assert }) => {
    const operator = await register(client, 'lister@test.io')
    const other = await register(client, 'listed@test.io')

    await client
      .post('/api/v1/nodes')
      .headers(auth(other.token!))
      .json({ name: 'counted', category: 'sbc' })

    const res = await client.get('/api/v1/admin/users').headers(auth(operator.token!))
    res.assertStatus(200)

    const rows = res.body().data
    assert.lengthOf(rows, 2)
    const listed = rows.find((r: any) => r.email === 'listed@test.io')
    assert.equal(listed.nodeCount, 1)
    assert.equal(listed.instanceRole, 'user')
    assert.isTrue(listed.isActive)
    assert.equal(rows.find((r: any) => r.email === 'lister@test.io').nodeCount, 0)
  })

  test('closed registration still lets the very first account in', async ({ client, assert }) => {
    // A fresh install with registration closed must not lock out whoever just
    // deployed it.
    await setMode('closed')

    const first = await register(client, 'deployer@test.io')
    assert.equal(first.status, 201)
    assert.equal(first.body.user.instanceRole, 'operator')

    const refused = await register(client, 'outsider@test.io')
    assert.equal(refused.status, 403)
  })

  test('invite-only accepts an invited address and refuses the rest', async ({
    client,
    assert,
  }) => {
    const owner = await register(client, 'host@test.io')
    const org = await client
      .post('/api/v1/orgs')
      .headers(auth(owner.token!))
      .json({ name: 'Gated' })

    await client
      .post(`/api/v1/orgs/${org.body().org.id}/invitations`)
      .headers(auth(owner.token!))
      .json({ email: 'expected@test.io' })

    await setMode('invite_only')

    const uninvited = await register(client, 'random@test.io')
    assert.equal(uninvited.status, 403)

    const invited = await register(client, 'expected@test.io')
    assert.equal(invited.status, 201)
  })

  test('a provisioned account must replace its temporary password', async ({ client, assert }) => {
    const operator = await register(client, 'admin@test.io')

    const created = await client
      .post('/api/v1/admin/users')
      .headers(auth(operator.token!))
      .json({ email: 'newcomer@test.io', name: 'Newcomer' })
    created.assertStatus(201)

    const temp = created.body().tempPassword
    assert.isString(temp)

    const login = await client
      .post('/api/v1/auth/login')
      .json({ email: 'newcomer@test.io', password: temp })
    login.assertStatus(200)
    assert.isTrue(login.body().mustChangePassword)

    const token = login.body().token.value
    const changed = await client
      .post('/api/v1/auth/change-password')
      .headers(auth(token))
      .json({ currentPassword: temp, newPassword: 'a-real-password' })
    changed.assertStatus(204)

    // The flag is what the dashboard keys the forced modal off, so it has to
    // clear — otherwise they are prompted forever.
    const me = await client.get('/api/v1/auth/me').headers(auth(token))
    assert.isFalse(me.body().mustChangePassword)
  })

  test('an operator can suspend an account but not lock themselves out', async ({
    client,
    assert,
  }) => {
    const operator = await register(client, 'keeper@test.io')
    const victim = await register(client, 'suspended@test.io')

    const suspended = await client
      .patch(`/api/v1/admin/users/${victim.id}`)
      .headers(auth(operator.token!))
      .json({ isActive: false })
    suspended.assertStatus(200)

    const rejected = await client
      .post('/api/v1/auth/login')
      .json({ email: 'suspended@test.io', password: 'supersecret' })
    assert.equal(rejected.status(), 403)

    const selfLock = await client
      .patch(`/api/v1/admin/users/${operator.id}`)
      .headers(auth(operator.token!))
      .json({ isActive: false })
    selfLock.assertStatus(409)
  })

  test('the last operator cannot be demoted', async ({ client }) => {
    const operator = await register(client, 'only@test.io')

    const demoted = await client
      .patch(`/api/v1/admin/users/${operator.id}`)
      .headers(auth(operator.token!))
      .json({ instanceRole: 'user' })
    demoted.assertStatus(409)
  })

  test('an operator gets no access to anyone else\'s nodes', async ({ client, assert }) => {
    const operator = await register(client, 'nosy@test.io')
    const someone = await register(client, 'private@test.io')

    const node = await client
      .post('/api/v1/nodes')
      .headers(auth(someone.token!))
      .json({ name: 'not-for-you', category: 'sbc' })
    const nodeId = node.body().node.id

    // The whole point of keeping the two systems apart: operational power does
    // not become the ability to route traffic through someone's machine.
    const seen = await client.get(`/api/v1/nodes/${nodeId}`).headers(auth(operator.token!))
    seen.assertStatus(404)

    const connected = await client
      .post('/api/v1/connect')
      .headers(auth(operator.token!))
      .json({ nodeId })
    connected.assertStatus(404)

    const list = await client.get('/api/v1/nodes').headers(auth(operator.token!))
    assert.lengthOf(list.body().data, 0)
  })
})
