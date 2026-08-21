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

  test('an operator sees every organisation and its members', async ({ client, assert }) => {
    const operator = await register(client, 'watcher@test.io')
    const stranger = await register(client, 'founder@test.io')

    const org = await client
      .post('/api/v1/orgs')
      .headers(auth(stranger.token!))
      .json({ name: 'Someone Elses Team' })
    const orgId = org.body().org.id

    await client
      .post('/api/v1/nodes')
      .headers(auth(stranger.token!))
      .json({ name: 'their-node', category: 'vps', orgId })

    const res = await client.get('/api/v1/admin/orgs').headers(auth(operator.token!))
    res.assertStatus(200)

    const listed = res.body().data.find((o: any) => o.id === orgId)
    assert.equal(listed.name, 'Someone Elses Team')
    assert.equal(listed.nodeCount, 1)
    assert.lengthOf(listed.members, 1)
    assert.equal(listed.members[0].role, 'owner')
    assert.equal(listed.members[0].email, 'founder@test.io')

    // Seeing an org owns a node is not being able to reach it.
    const list = await client.get('/api/v1/nodes').headers(auth(operator.token!))
    assert.lengthOf(list.body().data, 0)

    // A team still holding nodes is not dissolved by surprise.
    const refused = await client.delete(`/api/v1/admin/orgs/${orgId}`).headers(auth(operator.token!))
    refused.assertStatus(409)

    const denied = await client.get('/api/v1/admin/orgs').headers(auth(stranger.token!))
    denied.assertStatus(404)
  })

  test('an operator can correct an account and rename a team', async ({ client, assert }) => {
    const operator = await register(client, 'fixer@test.io')
    const target = await register(client, 'typo@test.io')

    const org = await client
      .post('/api/v1/orgs')
      .headers(auth(target.token!))
      .json({ name: 'Mispelled Team' })
    const orgId = org.body().org.id

    const edited = await client
      .patch(`/api/v1/admin/users/${target.id}`)
      .headers(auth(operator.token!))
      .json({ name: 'Corrected Name', email: 'fixed@test.io' })
    edited.assertStatus(200)
    assert.equal(edited.body().user.email, 'fixed@test.io')
    assert.equal(edited.body().user.name, 'Corrected Name')

    // The address is a login: it may not collide with another account.
    const collision = await client
      .patch(`/api/v1/admin/users/${target.id}`)
      .headers(auth(operator.token!))
      .json({ email: 'fixer@test.io' })
    collision.assertStatus(409)

    const renamed = await client
      .patch(`/api/v1/admin/orgs/${orgId}`)
      .headers(auth(operator.token!))
      .json({ name: 'Spelled Right' })
    renamed.assertStatus(200)

    const listed = await client.get('/api/v1/admin/orgs').headers(auth(operator.token!))
    assert.equal(listed.body().data.find((o: any) => o.id === orgId).name, 'Spelled Right')
  })

  test('resetting a password locks the holder out until they set a new one', async ({
    client,
    assert,
  }) => {
    const operator = await register(client, 'resetter@test.io')
    const target = await register(client, 'forgot@test.io')

    // Their existing session works right up to the reset.
    const before = await client.get('/api/v1/auth/me').headers(auth(target.token!))
    before.assertStatus(200)

    const reset = await client
      .post(`/api/v1/admin/users/${target.id}/reset-password`)
      .headers(auth(operator.token!))
    reset.assertStatus(200)
    const temp = reset.body().tempPassword
    assert.isString(temp)

    // A reset exists to lock someone out, so live tokens go with it.
    const after = await client.get('/api/v1/auth/me').headers(auth(target.token!))
    after.assertStatus(401)

    const stale = await client
      .post('/api/v1/auth/login')
      .json({ email: 'forgot@test.io', password: 'supersecret' })
    assert.equal(stale.status(), 400)

    const login = await client
      .post('/api/v1/auth/login')
      .json({ email: 'forgot@test.io', password: temp })
    login.assertStatus(200)
    assert.isTrue(login.body().mustChangePassword)
  })

  test('an operator can change a role inside a team, but not orphan it', async ({
    client,
    assert,
  }) => {
    const operator = await register(client, 'roler@test.io')
    const owner = await register(client, 'teamowner@test.io')

    const org = await client
      .post('/api/v1/orgs')
      .headers(auth(owner.token!))
      .json({ name: 'Roles Team' })
    const orgId = org.body().org.id

    const member = await register(client, 'plainmember@test.io')
    const inv = await client
      .post(`/api/v1/orgs/${orgId}/invitations`)
      .headers(auth(owner.token!))
      .json({ email: 'plainmember@test.io', role: 'member' })
    await client
      .post('/api/v1/orgs/invitations/accept')
      .headers(auth(member.token!))
      .json({ token: inv.body().token })

    const promoted = await client
      .patch(`/api/v1/admin/orgs/${orgId}/members/${member.id}`)
      .headers(auth(operator.token!))
      .json({ role: 'admin' })
    promoted.assertStatus(200)

    const listed = await client.get('/api/v1/admin/orgs').headers(auth(operator.token!))
    const roles = listed.body().data.find((o: any) => o.id === orgId).members
    assert.equal(roles.find((m: any) => m.userId === member.id).role, 'admin')

    // Demoting the only owner would leave a team nobody can administer.
    const orphan = await client
      .patch(`/api/v1/admin/orgs/${orgId}/members/${owner.id}`)
      .headers(auth(operator.token!))
      .json({ role: 'member' })
    orphan.assertStatus(409)
  })

  test('an operator puts an account into a team and takes it back out', async ({
    client,
    assert,
  }) => {
    const operator = await register(client, 'placer@test.io')
    const founder = await register(client, 'chief@test.io')
    const newcomer = await register(client, 'joiner@test.io')

    const org = await client
      .post('/api/v1/orgs')
      .headers(auth(founder.token!))
      .json({ name: 'Staffed Team' })
    const orgId = org.body().org.id

    // No invitation round trip: the operator acts, the person does not accept.
    const added = await client
      .post(`/api/v1/admin/orgs/${orgId}/members`)
      .headers(auth(operator.token!))
      .json({ email: 'joiner@test.io', role: 'member' })
    added.assertStatus(201)

    // And it is a real membership: the org's nodes become visible to them.
    await client
      .post('/api/v1/nodes')
      .headers(auth(founder.token!))
      .json({ name: 'team-node', category: 'vps', orgId })
    const seen = await client.get('/api/v1/nodes').headers(auth(newcomer.token!))
    assert.lengthOf(seen.body().data, 1)

    const twice = await client
      .post(`/api/v1/admin/orgs/${orgId}/members`)
      .headers(auth(operator.token!))
      .json({ email: 'joiner@test.io', role: 'admin' })
    twice.assertStatus(409)

    const unknown = await client
      .post(`/api/v1/admin/orgs/${orgId}/members`)
      .headers(auth(operator.token!))
      .json({ email: 'ghost@test.io', role: 'member' })
    unknown.assertStatus(404)

    const removed = await client
      .delete(`/api/v1/admin/orgs/${orgId}/members/${newcomer.id}`)
      .headers(auth(operator.token!))
    removed.assertStatus(200)

    const gone = await client.get('/api/v1/nodes').headers(auth(newcomer.token!))
    assert.lengthOf(gone.body().data, 0)

    // The only owner cannot be removed either.
    const orphan = await client
      .delete(`/api/v1/admin/orgs/${orgId}/members/${founder.id}`)
      .headers(auth(operator.token!))
    orphan.assertStatus(409)
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
