import { test } from '@japa/runner'

test.group('Auth', () => {
  test('register creates a user and returns a token', async ({ client, assert }) => {
    const res = await client.post('/api/v1/auth/register').json({
      email: 'alice@test.io',
      password: 'supersecret',
      fullName: 'Alice',
    })

    res.assertStatus(201)
    assert.equal(res.body().user.email, 'alice@test.io')
    assert.match(res.body().token.value, /^umbra_/)
  })

  test('register rejects invalid email', async ({ client }) => {
    const res = await client.post('/api/v1/auth/register').json({
      email: 'not-an-email',
      password: 'supersecret',
    })
    res.assertStatus(422)
  })

  test('login with valid credentials returns a token', async ({ client, assert }) => {
    await client.post('/api/v1/auth/register').json({
      email: 'bob@test.io',
      password: 'supersecret',
    })

    const res = await client.post('/api/v1/auth/login').json({
      email: 'bob@test.io',
      password: 'supersecret',
    })

    res.assertStatus(200)
    assert.match(res.body().token.value, /^umbra_/)
  })

  test('login with wrong password returns 400', async ({ client }) => {
    await client.post('/api/v1/auth/register').json({
      email: 'charlie@test.io',
      password: 'supersecret',
    })

    const res = await client.post('/api/v1/auth/login').json({
      email: 'charlie@test.io',
      password: 'wrong',
    })
    res.assertStatus(400)
  })

  test('me returns the authenticated user', async ({ client, assert }) => {
    const reg = await client.post('/api/v1/auth/register').json({
      email: 'dave@test.io',
      password: 'supersecret',
    })
    const token = reg.body().token.value

    const res = await client.get('/api/v1/auth/me').header('Authorization', `Bearer ${token}`)
    res.assertStatus(200)
    assert.equal(res.body().user.email, 'dave@test.io')
  })

  test('me without token returns 401', async ({ client }) => {
    const res = await client.get('/api/v1/auth/me')
    res.assertStatus(401)
  })
})
