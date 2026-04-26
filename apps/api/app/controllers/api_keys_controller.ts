import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import { randomBytes, createHash } from 'node:crypto'
import vine from '@vinejs/vine'
import ApiKey from '#models/api_key'

const createKeyValidator = vine.compile(
  vine.object({
    name:      vine.string().trim().minLength(1).maxLength(100),
    scopes:    vine.array(vine.string()).optional(),
    expiresAt: vine.string().optional(),
  })
)

function serialize(k: ApiKey, token?: string) {
  return {
    id:           k.id,
    name:         k.name,
    tokenMasked:  `umbra_sk_${k.keyPrefix}...`,
    ...(token ? { token } : {}),
    scopes:       k.scopes,
    lastUsedAt:   k.lastUsedAt?.toISO() ?? null,
    expiresAt:    k.expiresAt?.toISO() ?? null,
    revokedAt:    k.revokedAt?.toISO() ?? null,
    createdAt:    k.createdAt.toISO(),
    status:       k.revokedAt ? 'revoked' : 'active',
  }
}

export default class ApiKeysController {
  async index({ auth }: HttpContext) {
    const user = auth.getUserOrFail()
    const keys = await ApiKey.query()
      .where('userId', user.id)
      .orderBy('createdAt', 'desc')
    return { data: keys.map((k) => serialize(k)) }
  }

  async store({ auth, request, response }: HttpContext) {
    const user    = auth.getUserOrFail()
    const payload = await request.validateUsing(createKeyValidator)

    const raw    = randomBytes(24).toString('hex')
    const prefix = raw.slice(0, 8)
    const hash   = createHash('sha256').update(raw).digest('hex')

    const key = await ApiKey.create({
      userId:    user.id,
      name:      payload.name,
      scopes:    payload.scopes ?? ['read'],
      keyPrefix: prefix,
      keyHash:   hash,
      expiresAt: payload.expiresAt ? DateTime.fromISO(payload.expiresAt) : null,
    })

    return response.created({ data: serialize(key, `umbra_sk_${raw}`) })
  }

  async revoke({ auth, params }: HttpContext) {
    const user = auth.getUserOrFail()
    const key  = await ApiKey.query()
      .where('id', params.id)
      .where('userId', user.id)
      .firstOrFail()
    key.revokedAt = DateTime.now()
    await key.save()
    return { data: serialize(key) }
  }

  async destroy({ auth, params, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const key  = await ApiKey.query()
      .where('id', params.id)
      .where('userId', user.id)
      .firstOrFail()
    await key.delete()
    return response.noContent()
  }
}
