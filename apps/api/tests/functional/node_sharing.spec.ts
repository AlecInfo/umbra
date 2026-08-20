import { test } from '@japa/runner'

async function account(client: any, email: string) {
  const res = await client.post('/api/v1/auth/register').json({ email, password: 'supersecret' })
  return { token: res.body().token.value as string, id: res.body().user.id as string }
}

const auth = (t: string) => ({ Authorization: `Bearer ${t}` })

async function ownedNode(client: any, token: string, name = 'shared-node') {
  const res = await client.post('/api/v1/nodes').headers(auth(token)).json({ name, category: 'sbc' })
  return res.body().node.id as string
}

async function permissionOn(client: any, token: string, nodeId: string) {
  const res = await client.get(`/api/v1/nodes/${nodeId}`).headers(auth(token))
  return res.status() === 200 ? res.body().node.permission : null
}

test.group('Per-node sharing', () => {
  test('a grant makes read and manage reachable for the first time', async ({
    client,
    assert,
  }) => {
    const owner = await account(client, 'grantor@test.io')
    const guest = await account(client, 'guest@test.io')
    const nodeId = await ownedNode(client, owner.token)

    // Before: the node does not exist as far as the guest is concerned.
    assert.isNull(await permissionOn(client, guest.token, nodeId))

    const shared = await client
      .post(`/api/v1/nodes/${nodeId}/members`)
      .headers(auth(owner.token))
      .json({ email: 'guest@test.io', permission: 'read' })
    shared.assertStatus(201)
    assert.equal(shared.body().member.user.email, 'guest@test.io')

    assert.equal(await permissionOn(client, guest.token, nodeId), 'read')

    // Read is genuinely read: connecting is refused.
    const denied = await client
      .post('/api/v1/connect')
      .headers(auth(guest.token))
      .json({ nodeId })
    denied.assertStatus(404)

    const raised = await client
      .patch(`/api/v1/nodes/${nodeId}/members/${shared.body().member.id}`)
      .headers(auth(owner.token))
      .json({ permission: 'manage' })
    raised.assertStatus(200)

    assert.equal(await permissionOn(client, guest.token, nodeId), 'manage')

    // Manage can rename the node; deleting still needs admin.
    const renamed = await client
      .patch(`/api/v1/nodes/${nodeId}`)
      .headers(auth(guest.token))
      .json({ name: 'renamed-by-guest' })
    renamed.assertStatus(200)

    const deleted = await client.delete(`/api/v1/nodes/${nodeId}`).headers(auth(guest.token))
    deleted.assertStatus(404)
  })

  test('an admin grant does not carry the right to re-share', async ({ client, assert }) => {
    const owner = await account(client, 'realowner@test.io')
    const deputy = await account(client, 'deputy@test.io')
    const third = await account(client, 'third@test.io')
    const nodeId = await ownedNode(client, owner.token)

    await client
      .post(`/api/v1/nodes/${nodeId}/members`)
      .headers(auth(owner.token))
      .json({ email: 'deputy@test.io', permission: 'admin' })

    assert.equal(await permissionOn(client, deputy.token, nodeId), 'admin')

    // They may administer the machine — but access spreads only from the owner.
    const reshared = await client
      .post(`/api/v1/nodes/${nodeId}/members`)
      .headers(auth(deputy.token))
      .json({ email: 'third@test.io', permission: 'read' })
    reshared.assertStatus(404)

    assert.isNull(await permissionOn(client, third.token, nodeId))
  })

  test('revoking a share removes the access', async ({ client, assert }) => {
    const owner = await account(client, 'revoker@test.io')
    const guest = await account(client, 'revoked@test.io')
    const nodeId = await ownedNode(client, owner.token)

    const shared = await client
      .post(`/api/v1/nodes/${nodeId}/members`)
      .headers(auth(owner.token))
      .json({ email: 'revoked@test.io', permission: 'connect' })
    assert.equal(await permissionOn(client, guest.token, nodeId), 'connect')

    const revoked = await client
      .delete(`/api/v1/nodes/${nodeId}/members/${shared.body().member.id}`)
      .headers(auth(owner.token))
    revoked.assertStatus(200)

    assert.isNull(await permissionOn(client, guest.token, nodeId))
  })

  test('sharing with an unknown address is refused rather than left dangling', async ({
    client,
  }) => {
    const owner = await account(client, 'lonely@test.io')
    const nodeId = await ownedNode(client, owner.token)

    const res = await client
      .post(`/api/v1/nodes/${nodeId}/members`)
      .headers(auth(owner.token))
      .json({ email: 'nobody@test.io', permission: 'read' })
    res.assertStatus(404)
  })

  test('a node can be lent to a whole organisation', async ({ client, assert }) => {
    const owner = await account(client, 'lender@test.io')
    const org = await client
      .post('/api/v1/orgs')
      .headers(auth(owner.token))
      .json({ name: 'Borrowers' })
    const orgId = org.body().org.id

    const colleague = await account(client, 'colleague@test.io')
    const inv = await client
      .post(`/api/v1/orgs/${orgId}/invitations`)
      .headers(auth(owner.token))
      .json({ email: 'colleague@test.io', role: 'member' })
    await client
      .post('/api/v1/orgs/invitations/accept')
      .headers(auth(colleague.token))
      .json({ token: inv.body().token })

    // A personal node, lent to the team without being handed over to it.
    const nodeId = await ownedNode(client, owner.token, 'personal-but-lent')
    assert.isNull(await permissionOn(client, colleague.token, nodeId))

    const shared = await client
      .post(`/api/v1/nodes/${nodeId}/members`)
      .headers(auth(owner.token))
      .json({ orgId, permission: 'connect' })
    shared.assertStatus(201)
    assert.equal(shared.body().member.org.name, 'Borrowers')

    assert.equal(await permissionOn(client, colleague.token, nodeId), 'connect')

    // Ownership has not moved: it is still a personal node.
    const detail = await client.get(`/api/v1/nodes/${nodeId}`).headers(auth(owner.token))
    assert.equal(detail.body().node.ownerUserId, owner.id)
    assert.isNull(detail.body().node.ownerOrgId)
  })

  test('the share list is visible to anyone who can see the node', async ({ client, assert }) => {
    const owner = await account(client, 'lister@test.io')
    const guest = await account(client, 'listed@test.io')
    const nodeId = await ownedNode(client, owner.token)

    await client
      .post(`/api/v1/nodes/${nodeId}/members`)
      .headers(auth(owner.token))
      .json({ email: 'listed@test.io', permission: 'read' })

    const asOwner = await client.get(`/api/v1/nodes/${nodeId}/members`).headers(auth(owner.token))
    assert.isTrue(asOwner.body().canShare)
    assert.lengthOf(asOwner.body().data, 1)

    // The guest sees who else has access, but is told they cannot extend it.
    const asGuest = await client.get(`/api/v1/nodes/${nodeId}/members`).headers(auth(guest.token))
    asGuest.assertStatus(200)
    assert.isFalse(asGuest.body().canShare)
  })
})
