import { test } from '@japa/runner'

async function registerAndLogin(client: any, email = 'owner@test.io') {
  const res = await client.post('/api/v1/auth/register').json({
    email,
    password: 'supersecret',
    fullName: 'Owner',
  })
  return { token: res.body().token.value as string, userId: res.body().user.id as string }
}

test.group('Nodes', () => {
  test('create + list + show + update + soft-delete', async ({ client, assert }) => {
    const { token } = await registerAndLogin(client)

    const created = await client
      .post('/api/v1/nodes')
      .header('Authorization', `Bearer ${token}`)
      .json({
        name: 'raspi-1',
        category: 'sbc',
        city: 'Genève',
        countryCode: 'CH',
        latitude: 46.2044,
        longitude: 6.1432,
      })
    created.assertStatus(201)
    const nodeId = created.body().node.id
    assert.equal(created.body().node.status, 'pending')

    const list = await client.get('/api/v1/nodes').header('Authorization', `Bearer ${token}`)
    list.assertStatus(200)
    assert.equal(list.body().meta.total, 1)
    assert.equal(list.body().data[0].name, 'raspi-1')

    const show = await client
      .get(`/api/v1/nodes/${nodeId}`)
      .header('Authorization', `Bearer ${token}`)
    show.assertStatus(200)
    assert.equal(show.body().node.id, nodeId)

    const updated = await client
      .patch(`/api/v1/nodes/${nodeId}`)
      .header('Authorization', `Bearer ${token}`)
      .json({ name: 'raspi-1-renamed' })
    updated.assertStatus(200)
    assert.equal(updated.body().node.name, 'raspi-1-renamed')

    const destroyed = await client
      .delete(`/api/v1/nodes/${nodeId}`)
      .header('Authorization', `Bearer ${token}`)
    destroyed.assertStatus(204)

    const listAfter = await client.get('/api/v1/nodes').header('Authorization', `Bearer ${token}`)
    assert.equal(listAfter.body().meta.total, 0)
  })

  test('user cannot see another user nodes', async ({ client, assert }) => {
    const alice = await registerAndLogin(client, 'alice@test.io')
    await client
      .post('/api/v1/nodes')
      .header('Authorization', `Bearer ${alice.token}`)
      .json({ name: 'alice-node', category: 'sbc' })

    const bob = await registerAndLogin(client, 'bob@test.io')
    const list = await client.get('/api/v1/nodes').header('Authorization', `Bearer ${bob.token}`)
    list.assertStatus(200)
    assert.equal(list.body().meta.total, 0)
  })

  test('unauthenticated request returns 401', async ({ client }) => {
    const res = await client.get('/api/v1/nodes')
    res.assertStatus(401)
  })
})
