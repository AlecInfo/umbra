import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import Organization from '#models/organization'
import Node from '#models/node'

export type NodePermission = 'read' | 'connect' | 'manage' | 'admin'

export default class NodeMember extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare nodeId: string

  @column()
  declare userId: string | null

  @column()
  declare orgId: string | null

  @column()
  declare permission: NodePermission

  @column()
  declare grantedBy: string

  @column.dateTime({ autoCreate: true })
  declare grantedAt: DateTime

  @belongsTo(() => Node, { foreignKey: 'nodeId' })
  declare node: BelongsTo<typeof Node>

  @belongsTo(() => User, { foreignKey: 'userId' })
  declare user: BelongsTo<typeof User>

  @belongsTo(() => Organization, { foreignKey: 'orgId' })
  declare org: BelongsTo<typeof Organization>

  @belongsTo(() => User, { foreignKey: 'grantedBy' })
  declare grantor: BelongsTo<typeof User>
}
