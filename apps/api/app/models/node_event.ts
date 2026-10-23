import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import Node from '#models/node'

export type NodeEventType =
  | 'enrolled'
  | 'went_offline'
  | 'back_online'
  | 'agent_updated'
  | 'renamed'
  | 'transferred'

export default class NodeEvent extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare nodeId: string

  @column()
  declare type: NodeEventType

  @column()
  declare actorUserId: string | null

  @column()
  declare data: Record<string, unknown> | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => Node)
  declare node: BelongsTo<typeof Node>

  @belongsTo(() => User, { foreignKey: 'actorUserId' })
  declare actor: BelongsTo<typeof User>
}
