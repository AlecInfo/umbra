import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import Organization from '#models/organization'

export default class ApiKey extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare userId: string

  @column()
  declare orgId: string | null

  @column()
  declare name: string

  @column({ serializeAs: null })
  declare keyHash: string

  @column()
  declare keyPrefix: string

  @column()
  declare scopes: string[]

  @column.dateTime()
  declare lastUsedAt: DateTime | null

  @column.dateTime()
  declare expiresAt: DateTime | null

  @column.dateTime()
  declare revokedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => User, { foreignKey: 'userId' })
  declare user: BelongsTo<typeof User>

  @belongsTo(() => Organization, { foreignKey: 'orgId' })
  declare organization: BelongsTo<typeof Organization>
}
