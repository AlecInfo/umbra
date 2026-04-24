import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import Organization from '#models/organization'

export default class AuditLog extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare performedBy: string

  @column()
  declare orgId: string | null

  @column()
  declare resourceType: string

  @column()
  declare resourceId: string

  @column()
  declare action: string

  @column()
  declare oldValue: Record<string, unknown> | null

  @column()
  declare newValue: Record<string, unknown> | null

  @column()
  declare ipAddress: string | null

  @column()
  declare userAgent: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => User, { foreignKey: 'performedBy' })
  declare performer: BelongsTo<typeof User>

  @belongsTo(() => Organization, { foreignKey: 'orgId' })
  declare organization: BelongsTo<typeof Organization>
}
