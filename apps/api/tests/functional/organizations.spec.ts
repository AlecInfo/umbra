import { test } from '@japa/runner'

async function account(client: any, email: string) {
  const res = await client.post('/api/v1/auth/register').json({ email, password: 'supersecret' })
  return { token: res.body().token.value as string, id: res.body().user.id as string }
}

const auth = (t: string) => ({ Authorization: `Bearer ${t}` })

async function orgWithOwner(client: any, email = 'owner@test.io') {
  const owner = await account(client, email)
  const created = await client
    .post('/api/v1/orgs')
    .header('Authorization', `Bearer ${owner.token}`)
    .json({ name: 'Acme Corp' })
  return { owner, orgId: created.body().org.id as string }
}

async function joinOrg(client: any, orgId: string, ownerToken: string, email: string, role?: string) {
  const invited = await account(client, email)
  const inv = await client
    .post(`/api/v1/orgs/${orgId}/invitations`)
    .headers(auth(ownerToken))
    .json({ email, ...(role ? { role } : {}) })
  const accepted = await client
    .post('/api/v1/orgs/invitations/accept')
    .headers(auth(invited.token))
    .json({ token: inv.body().token })
  return { user: invited, inviteId: inv.body().invitation.id as string, accepted }
}

test.group('Organizations', () => {
  test('creating an org makes the creator its owner', async ({ client, assert }) => {
    const { owner, orgId } = await orgWithOwner(client)
    assert.isString(orgId)

    const list = await client.get('/api/v1/orgs').headers(auth(owner.token))
    list.assertStatus(200)
    assert.lengthOf(list.body().data, 1)
    assert.equal(list.body().data[0].role, 'owner')
    assert.equal(list.body().data[0].memberCount, 1)
    assert.equal(list.body().data[0].slug, 'acme-corp')
  })

  test('an outsider gets 404, not 403 — org ids are not probeable', async ({ client }) => {
    const { orgId } = await orgWithOwner(client)
    const stranger = await account(client, 'stranger@test.io')

    const res = await client.get(`/api/v1/orgs/${orgId}`).headers(auth(stranger.token))
    res.assertStatus(404)
  })

  test('an invitation can only be redeemed by the address it names', async ({ client, assert }) => {
    const { owner, orgId } = await orgWithOwner(client)
    const inv = await client
      .post(`/api/v1/orgs/${orgId}/invitations`)
      .headers(auth(owner.token))
      .json({ email: 'wanted@test.io', role: 'member' })
    inv.assertStatus(201)

    const impostor = await account(client, 'impostor@test.io')
    const stolen = await client
      .post('/api/v1/orgs/invitations/accept')
      .headers(auth(impostor.token))
      .json({ token: inv.body().token })
    stolen.assertStatus(403)

    const wanted = await account(client, 'wanted@test.io')
    const ok = await client
      .post('/api/v1/orgs/invitations/accept')
      .headers(auth(wanted.token))
      .json({ token: inv.body().token })
    ok.assertStatus(200)

    // Single use.
    const replay = await client
      .post('/api/v1/orgs/invitations/accept')
      .headers(auth(wanted.token))
      .json({ token: inv.body().token })
    replay.assertStatus(404)

    const members = await client.get(`/api/v1/orgs/${orgId}/members`).headers(auth(owner.token))
    assert.lengthOf(members.body().data, 2)
  })

  test("a member sees the org's nodes — the scoping that was dead code until now", async ({
    client,
    assert,
  }) => {
    const { owner, orgId } = await orgWithOwner(client)
    const member = await joinOrg(client, orgId, owner.token, 'member@test.io', 'member')

    const node = await client
      .post('/api/v1/nodes')
      .headers(auth(owner.token))
      .json({ name: 'org-node', category: 'vps', orgId })
    node.assertStatus(201)

    const seen = await client.get('/api/v1/nodes').headers(auth(member.user.token))
    seen.assertStatus(200)
    assert.include(
      seen.body().data.map((n: any) => n.name),
      'org-node'
    )

    // A member may connect, not administer: deleting is an admin action.
    const deleted = await client
      .delete(`/api/v1/nodes/${node.body().node.id}`)
      .headers(auth(member.user.token))
    deleted.assertStatus(404)
  })

  test('a member cannot invite or rename', async ({ client }) => {
    const { owner, orgId } = await orgWithOwner(client)
    const member = await joinOrg(client, orgId, owner.token, 'plain@test.io', 'member')

    const invite = await client
      .post(`/api/v1/orgs/${orgId}/invitations`)
      .headers(auth(member.user.token))
      .json({ email: 'someone@test.io' })
    invite.assertStatus(404)

    const rename = await client
      .patch(`/api/v1/orgs/${orgId}`)
      .headers(auth(member.user.token))
      .json({ name: 'Renamed' })
    rename.assertStatus(404)
  })

  test('an admin manages members but cannot touch the owner', async ({ client }) => {
    const { owner, orgId } = await orgWithOwner(client)
    const admin = await joinOrg(client, orgId, owner.token, 'admin@test.io', 'admin')
    const member = await joinOrg(client, orgId, owner.token, 'someone@test.io', 'member')

    const promote = await client
      .patch(`/api/v1/orgs/${orgId}/members/${member.user.id}`)
      .headers(auth(admin.user.token))
      .json({ role: 'admin' })
    promote.assertStatus(200)

    const demoteOwner = await client
      .patch(`/api/v1/orgs/${orgId}/members/${owner.id}`)
      .headers(auth(admin.user.token))
      .json({ role: 'member' })
    demoteOwner.assertStatus(403)
  })

  test('the last owner cannot be demoted or removed', async ({ client }) => {
    const { owner, orgId } = await orgWithOwner(client)

    const demote = await client
      .patch(`/api/v1/orgs/${orgId}/members/${owner.id}`)
      .headers(auth(owner.token))
      .json({ role: 'member' })
    demote.assertStatus(409)

    const leave = await client
      .delete(`/api/v1/orgs/${orgId}/members/${owner.id}`)
      .headers(auth(owner.token))
    leave.assertStatus(409)
  })

  test('a member can leave on their own', async ({ client, assert }) => {
    const { owner, orgId } = await orgWithOwner(client)
    const member = await joinOrg(client, orgId, owner.token, 'leaver@test.io', 'member')

    const left = await client
      .delete(`/api/v1/orgs/${orgId}/members/${member.user.id}`)
      .headers(auth(member.user.token))
    left.assertStatus(200)

    const gone = await client.get('/api/v1/orgs').headers(auth(member.user.token))
    assert.lengthOf(gone.body().data, 0)
  })

  test('an org holding nodes refuses to be deleted', async ({ client, assert }) => {
    const { owner, orgId } = await orgWithOwner(client)
    await client
      .post('/api/v1/nodes')
      .headers(auth(owner.token))
      .json({ name: 'still-here', category: 'vps', orgId })

    const refused = await client.delete(`/api/v1/orgs/${orgId}`).headers(auth(owner.token))
    refused.assertStatus(409)
    assert.equal(refused.body().nodeCount, 1)
  })

  test('a pending invitation can be listed and revoked', async ({ client, assert }) => {
    const { owner, orgId } = await orgWithOwner(client)
    const inv = await client
      .post(`/api/v1/orgs/${orgId}/invitations`)
      .headers(auth(owner.token))
      .json({ email: 'pending@test.io' })

    const listed = await client.get(`/api/v1/orgs/${orgId}/invitations`).headers(auth(owner.token))
    assert.lengthOf(listed.body().data, 1)
    assert.equal(listed.body().data[0].email, 'pending@test.io')

    const revoked = await client
      .delete(`/api/v1/orgs/${orgId}/invitations/${inv.body().invitation.id}`)
      .headers(auth(owner.token))
    revoked.assertStatus(200)

    const after = await client.get(`/api/v1/orgs/${orgId}/invitations`).headers(auth(owner.token))
    assert.lengthOf(after.body().data, 0)
  })

  test('slugs stay unique across orgs of the same name', async ({ client, assert }) => {
    const first = await orgWithOwner(client, 'a@test.io')
    const second = await account(client, 'b@test.io')
    const created = await client
      .post('/api/v1/orgs')
      .headers(auth(second.token))
      .json({ name: 'Acme Corp' })

    assert.equal(created.body().org.slug, 'acme-corp-2')
    assert.notEqual(created.body().org.id, first.orgId)
  })
})

test.group('Node ownership transfer', () => {
  test('an owner moves a personal node into their org, and back', async ({ client, assert }) => {
    const { owner, orgId } = await orgWithOwner(client, 'transfer@test.io')

    const created = await client
      .post('/api/v1/nodes')
      .headers(auth(owner.token))
      .json({ name: 'my-pi', category: 'sbc' })
    const nodeId = created.body().node.id

    const moved = await client
      .post(`/api/v1/nodes/${nodeId}/transfer`)
      .headers(auth(owner.token))
      .json({ orgId })
    moved.assertStatus(200)
    assert.equal(moved.body().node.ownerOrgId, orgId)
    assert.isNull(moved.body().node.ownerUserId)
    assert.equal(moved.body().node.org.id, orgId)

    const back = await client
      .post(`/api/v1/nodes/${nodeId}/transfer`)
      .headers(auth(owner.token))
      .json({ orgId: null })
    back.assertStatus(200)
    assert.isNull(back.body().node.ownerOrgId)
    assert.equal(back.body().node.ownerUserId, owner.id)
  })

  test('a member of the org sees a transferred node', async ({ client, assert }) => {
    const { owner, orgId } = await orgWithOwner(client, 'sharer@test.io')
    const member = await joinOrg(client, orgId, owner.token, 'sees@test.io', 'member')

    const created = await client
      .post('/api/v1/nodes')
      .headers(auth(owner.token))
      .json({ name: 'shared-pi', category: 'sbc' })

    const before = await client.get('/api/v1/nodes').headers(auth(member.user.token))
    assert.lengthOf(before.body().data, 0)

    await client
      .post(`/api/v1/nodes/${created.body().node.id}/transfer`)
      .headers(auth(owner.token))
      .json({ orgId })

    const after = await client.get('/api/v1/nodes').headers(auth(member.user.token))
    assert.lengthOf(after.body().data, 1)
    assert.equal(after.body().data[0].org.name, 'Acme Corp')
  })

  test('you cannot hand a node to an org you do not administer', async ({ client }) => {
    const { owner, orgId } = await orgWithOwner(client, 'boss@test.io')
    const member = await joinOrg(client, orgId, owner.token, 'lowly@test.io', 'member')

    const own = await client
      .post('/api/v1/nodes')
      .headers(auth(member.user.token))
      .json({ name: 'personal-pi', category: 'sbc' })

    const refused = await client
      .post(`/api/v1/nodes/${own.body().node.id}/transfer`)
      .headers(auth(member.user.token))
      .json({ orgId })
    refused.assertStatus(403)
  })

  test("someone else's node cannot be transferred", async ({ client }) => {
    const { owner } = await orgWithOwner(client, 'mine@test.io')
    const stranger = await account(client, 'thief@test.io')

    const created = await client
      .post('/api/v1/nodes')
      .headers(auth(owner.token))
      .json({ name: 'not-yours', category: 'sbc' })

    const refused = await client
      .post(`/api/v1/nodes/${created.body().node.id}/transfer`)
      .headers(auth(stranger.token))
      .json({ orgId: null })
    refused.assertStatus(404)
  })
})
