import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import Organization from '#models/organization'

export type OrgRole = 'owner' | 'admin' | 'member'

export default class OrgMember extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare orgId: string

  @column()
  declare userId: string

  @column()
  declare role: OrgRole

  @column.dateTime({ autoCreate: true })
  declare joinedAt: DateTime

  @belongsTo(() => Organization, { foreignKey: 'orgId' })
  declare organization: BelongsTo<typeof Organization>

  @belongsTo(() => User, { foreignKey: 'userId' })
  declare user: BelongsTo<typeof User>
}
