import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Node from '#models/node'

export default class NodeMetric extends BaseModel {
  public static table = 'node_metrics'
  public static primaryKey = 'nodeId'
  public static selfAssignPrimaryKey = true

  @column({ isPrimary: true })
  declare nodeId: string

  @column.dateTime()
  declare recordedAt: DateTime

  @column()
  declare bytesSent: number | null

  @column()
  declare bytesReceived: number | null

  @column()
  declare latencyMs: number | null

  @column({
    consume: (value) => (value === null ? null : Number(value)),
  })
  declare cpuPercent: number | null

  @column({
    consume: (value) => (value === null ? null : Number(value)),
  })
  declare memoryPercent: number | null

  @column({
    consume: (value) => (value === null ? null : Number(value)),
  })
  declare diskPercent: number | null

  @column({
    consume: (value) => (value === null ? null : Number(value)),
  })
  declare temperatureCelsius: number | null

  @column()
  declare uptimeSeconds: number | null

  @column()
  declare activePeers: number | null

  @belongsTo(() => Node, { foreignKey: 'nodeId' })
  declare node: BelongsTo<typeof Node>
}
