import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import Organization from '#models/organization'
import Node from '#models/node'
import type { OrgRole } from '#models/org_member'
import type { NodePermission } from '#models/node_member'

export default class Invitation extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare invitedBy: string

  @column()
  declare orgId: string | null

  @column()
  declare nodeId: string | null

  @column()
  declare email: string

  @column()
  declare role: OrgRole | null

  @column()
  declare permission: NodePermission | null

  @column({ serializeAs: null })
  declare tokenHash: string

  @column.dateTime()
  declare acceptedAt: DateTime | null

  @column.dateTime()
  declare expiresAt: DateTime

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => User, { foreignKey: 'invitedBy' })
  declare inviter: BelongsTo<typeof User>

  @belongsTo(() => Organization, { foreignKey: 'orgId' })
  declare organization: BelongsTo<typeof Organization>

  @belongsTo(() => Node, { foreignKey: 'nodeId' })
  declare node: BelongsTo<typeof Node>
}
