import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { headscaleClient } from '#services/headscale_client'

const USER = 'u-tenant'

interface FakeKey {
  user: string
  id: string
  key: string
  reusable: boolean
  ephemeral: boolean
  used: boolean
  expiration: string
  createdAt: string
}

function key(id: string, opts: Partial<FakeKey> = {}): FakeKey {
  return {
    user: USER,
    id,
    key: `key-${id}`,
    reusable: false,
    ephemeral: false,
    used: false,
    expiration: DateTime.now().plus({ days: 90 }).toISO()!,
    createdAt: DateTime.now().minus({ days: 1 }).toISO()!,
    ...opts,
  }
}

function stub(existing: FakeKey[]) {
  const originals = {
    listPreAuthKeys: headscaleClient.listPreAuthKeys,
    expirePreAuthKey: headscaleClient.expirePreAuthKey,
    createPreAuthKey: headscaleClient.createPreAuthKey,
  }
  const expired: string[] = []
  let created = 0

  headscaleClient.listPreAuthKeys = async () => existing as never
  headscaleClient.expirePreAuthKey = async (_u: string, k: string) => {
    expired.push(k)
  }
  headscaleClient.createPreAuthKey = async () => {
    created++
    return 'freshly-created'
  }

  return {
    expired,
    createdCount: () => created,
    restore: () => Object.assign(headscaleClient, originals),
  }
}

test.group('Pre-auth key reuse', () => {
  test('mints a key when the tenant has none', async ({ assert }) => {
    const s = stub([])
    try {
      assert.equal(await headscaleClient.getOrCreatePreAuthKey(USER), 'freshly-created')
      assert.equal(s.createdCount(), 1)
    } finally {
      s.restore()
    }
  })

  test('reuses the newest unredeemed key instead of minting another', async ({ assert }) => {
    const older = key('1', { createdAt: DateTime.now().minus({ days: 3 }).toISO()! })
    const newer = key('2', { createdAt: DateTime.now().minus({ days: 1 }).toISO()! })
    const s = stub([older, newer])
    try {
      assert.equal(await headscaleClient.getOrCreatePreAuthKey(USER), 'key-2')
      assert.equal(s.createdCount(), 0)
      // The surplus is not left lying around as a standing invitation.
      assert.deepEqual(s.expired, ['key-1'])
    } finally {
      s.restore()
    }
  })

  test('ignores keys that are used or about to expire', async ({ assert }) => {
    const used = key('1', { used: true })
    const expiring = key('2', { expiration: DateTime.now().plus({ minutes: 10 }).toISO()! })
    const s = stub([used, expiring])
    try {
      assert.equal(await headscaleClient.getOrCreatePreAuthKey(USER), 'freshly-created')
      assert.equal(s.createdCount(), 1)
      // Neither is a candidate, and neither gets expired: one is spent, the
      // other is about to lapse on its own.
      assert.deepEqual(s.expired, [])
    } finally {
      s.restore()
    }
  })

  test('leaves a very recent surplus key alone', async ({ assert }) => {
    // An enrollment could be in flight with it.
    const newest = key('1', { createdAt: DateTime.now().minus({ minutes: 5 }).toISO()! })
    const alsoRecent = key('2', { createdAt: DateTime.now().minus({ minutes: 10 }).toISO()! })
    const s = stub([newest, alsoRecent])
    try {
      assert.equal(await headscaleClient.getOrCreatePreAuthKey(USER), 'key-1')
      assert.deepEqual(s.expired, [])
    } finally {
      s.restore()
    }
  })

  test('still hands out a key when listing fails', async ({ assert }) => {
    const originalList = headscaleClient.listPreAuthKeys
    const originalCreate = headscaleClient.createPreAuthKey
    headscaleClient.listPreAuthKeys = async () => {
      throw new Error('headscale unreachable')
    }
    headscaleClient.createPreAuthKey = async () => 'freshly-created'
    try {
      assert.equal(await headscaleClient.getOrCreatePreAuthKey(USER), 'freshly-created')
    } finally {
      headscaleClient.listPreAuthKeys = originalList
      headscaleClient.createPreAuthKey = originalCreate
    }
  })
})
