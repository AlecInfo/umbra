import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import Organization from '#models/organization'
import Node from '#models/node'

export default class AgentToken extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare createdBy: string

  @column()
  declare targetOrgId: string | null

  @column()
  declare nodeId: string | null

  @column({ serializeAs: null })
  declare tokenHash: string

  @column()
  declare nodeName: string | null

  @column.dateTime()
  declare usedAt: DateTime | null

  @column.dateTime()
  declare expiresAt: DateTime

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => User, { foreignKey: 'createdBy' })
  declare creator: BelongsTo<typeof User>

  @belongsTo(() => Organization, { foreignKey: 'targetOrgId' })
  declare targetOrg: BelongsTo<typeof Organization>

  @belongsTo(() => Node, { foreignKey: 'nodeId' })
  declare node: BelongsTo<typeof Node>
}
