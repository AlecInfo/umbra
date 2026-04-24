import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import Node from '#models/node'

export type AlertType =
  | 'node_offline'
  | 'cpu_high'
  | 'memory_high'
  | 'disk_high'
  | 'temperature_high'
  | 'latency_high'
  | 'peer_disconnected'

export default class NodeAlert extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare nodeId: string

  @column()
  declare createdBy: string

  @column()
  declare type: AlertType

  @column({
    consume: (value) => (value === null ? null : Number(value)),
  })
  declare thresholdValue: number | null

  @column()
  declare thresholdUnit: string | null

  @column()
  declare isActive: boolean

  @column.dateTime()
  declare triggeredAt: DateTime | null

  @column.dateTime()
  declare resolvedAt: DateTime | null

  @column()
  declare notifyEmail: boolean

  @column()
  declare notifyWebhook: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Node, { foreignKey: 'nodeId' })
  declare node: BelongsTo<typeof Node>

  @belongsTo(() => User, { foreignKey: 'createdBy' })
  declare creator: BelongsTo<typeof User>
}
