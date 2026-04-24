import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Node from '#models/node'

export default class NodePeerStat extends BaseModel {
  public static table = 'node_peer_stats'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare nodeId: string

  @column()
  declare peerPubkey: string

  @column()
  declare peerName: string | null

  @column()
  declare allowedIps: string[] | null

  @column()
  declare endpoint: string | null

  @column.dateTime()
  declare lastHandshakeAt: DateTime | null

  @column()
  declare bytesSent: number

  @column()
  declare bytesReceived: number

  @column()
  declare isActive: boolean

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Node, { foreignKey: 'nodeId' })
  declare node: BelongsTo<typeof Node>
}
