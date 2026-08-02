import { test } from '@japa/runner'
import Node from '#models/node'
import NodeMember from '#models/node_member'
import Organization from '#models/organization'
import OrgMember from '#models/org_member'

async function registerAndLogin(client: any, email: string) {
  const res = await client.post('/api/v1/auth/register').json({
    email,
    password: 'supersecret',
    fullName: 'User',
  })
  return { token: res.body().token.value as string, userId: res.body().user.id as string }
}

function authed(client: any, method: 'get' | 'post' | 'patch' | 'delete', url: string, token: string) {
  return client[method](url).header('Authorization', `Bearer ${token}`)
}

test.group('Permissions', () => {
  test('org member can read but not manage or delete org nodes; org admin can', async ({ client, assert }) => {
    const admin = await registerAndLogin(client, 'admin@perm.io')
    const member = await registerAndLogin(client, 'member@perm.io')

    const org = await Organization.create({ name: 'Acme', slug: 'acme-perm-1' })
    await OrgMember.create({ orgId: org.id, userId: admin.userId, role: 'admin' })
    await OrgMember.create({ orgId: org.id, userId: member.userId, role: 'member' })

    const node = await Node.create({
      ownerOrgId: org.id,
      name: 'org-node',
      category: 'vps',
      status: 'pending',
      supportsWireguard: true,
      supportsOpenvpn: false,
    })

    // member: read OK, connect OK, manage/admin refused (404, no leak)
    const show = await authed(client, 'get', `/api/v1/nodes/${node.id}`, member.token)
    show.assertStatus(200)

    const update = await authed(client, 'patch', `/api/v1/nodes/${node.id}`, member.token).json({ name: 'x' })
    update.assertStatus(404)

    const enroll = await authed(client, 'post', `/api/v1/nodes/${node.id}/enroll-token`, member.token)
    enroll.assertStatus(404)

    const destroyByMember = await authed(client, 'delete', `/api/v1/nodes/${node.id}`, member.token)
    destroyByMember.assertStatus(404)

    // admin: full control without any node_members entry
    const updateByAdmin = await authed(client, 'patch', `/api/v1/nodes/${node.id}`, admin.token).json({ name: 'renamed' })
    updateByAdmin.assertStatus(200)
    assert.equal(updateByAdmin.body().node.name, 'renamed')

    const destroyByAdmin = await authed(client, 'delete', `/api/v1/nodes/${node.id}`, admin.token)
    destroyByAdmin.assertStatus(204)
  })

  test('org member cannot create org nodes, org admin can', async ({ client }) => {
    const admin = await registerAndLogin(client, 'admin2@perm.io')
    const member = await registerAndLogin(client, 'member2@perm.io')

    const org = await Organization.create({ name: 'Acme2', slug: 'acme-perm-2' })
    await OrgMember.create({ orgId: org.id, userId: admin.userId, role: 'owner' })
    await OrgMember.create({ orgId: org.id, userId: member.userId, role: 'member' })

    const byMember = await authed(client, 'post', '/api/v1/nodes', member.token)
      .json({ name: 'n1', category: 'vps', orgId: org.id })
    byMember.assertStatus(403)

    const byAdmin = await authed(client, 'post', '/api/v1/nodes', admin.token)
      .json({ name: 'n1', category: 'vps', orgId: org.id })
    byAdmin.assertStatus(201)
  })

  test('node_members share grants exactly the given level and shows up in the list', async ({ client, assert }) => {
    const alice = await registerAndLogin(client, 'alice@perm.io')
    const bob = await registerAndLogin(client, 'bob@perm.io')

    const created = await authed(client, 'post', '/api/v1/nodes', alice.token)
      .json({ name: 'alice-node', category: 'sbc' })
    const nodeId = created.body().node.id

    // no relation: invisible
    const before = await authed(client, 'get', `/api/v1/nodes/${nodeId}`, bob.token)
    before.assertStatus(404)

    await NodeMember.create({ nodeId, userId: bob.userId, permission: 'read', grantedBy: alice.userId })

    const show = await authed(client, 'get', `/api/v1/nodes/${nodeId}`, bob.token)
    show.assertStatus(200)

    const list = await authed(client, 'get', '/api/v1/nodes', bob.token)
    list.assertStatus(200)
    assert.equal(list.body().meta.total, 1)

    // read < manage: update refused
    const update = await authed(client, 'patch', `/api/v1/nodes/${nodeId}`, bob.token).json({ name: 'x' })
    update.assertStatus(404)

    // read < connect: connect refused
    const connect = await authed(client, 'post', '/api/v1/connect', bob.token).json({ nodeId })
    connect.assertStatus(404)

    // elevate to connect: connect now allowed
    await NodeMember.query().where('node_id', nodeId).where('user_id', bob.userId).update({ permission: 'connect' })
    const connect2 = await authed(client, 'post', '/api/v1/connect', bob.token).json({ nodeId })
    connect2.assertStatus(200)
  })
})
