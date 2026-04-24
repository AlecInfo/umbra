import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import Node from '#models/node'
import Device from '#models/device'

export type VpnProtocol = 'wireguard' | 'openvpn'

export default class ConnectionLog extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare nodeId: string

  @column()
  declare deviceId: string | null

  @column()
  declare userId: string

  @column.dateTime({ autoCreate: true })
  declare connectedAt: DateTime

  @column.dateTime()
  declare disconnectedAt: DateTime | null

  @column()
  declare bytesSent: number

  @column()
  declare bytesReceived: number

  @column()
  declare clientIp: string | null

  @column()
  declare protocol: VpnProtocol

  @belongsTo(() => Node, { foreignKey: 'nodeId' })
  declare node: BelongsTo<typeof Node>

  @belongsTo(() => Device, { foreignKey: 'deviceId' })
  declare device: BelongsTo<typeof Device>

  @belongsTo(() => User, { foreignKey: 'userId' })
  declare user: BelongsTo<typeof User>
}
