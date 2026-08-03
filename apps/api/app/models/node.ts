import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import Organization from '#models/organization'
import NodeMember from '#models/node_member'
import NodeAlert from '#models/node_alert'
import NodeMetric from '#models/node_metric'
import NodePeerStat from '#models/node_peer_stat'
import ConnectionLog from '#models/connection_log'

export type NodeStatus = 'pending' | 'online' | 'warning' | 'offline' | 'error'
export type NodeCategory = 'sbc' | 'vps' | 'router' | 'nas' | 'desktop' | 'other'

export default class Node extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare ownerUserId: string | null

  @column()
  declare ownerOrgId: string | null

  @column()
  declare name: string

  @column()
  declare hostname: string | null

  @column()
  declare ipAddress: string | null

  @column()
  declare wireguardIp: string | null

  @column()
  declare headscaleId: string | null

  @column()
  declare wireguardPubkey: string | null

  @column()
  declare supportsWireguard: boolean

  @column()
  declare supportsOpenvpn: boolean

  @column()
  declare wireguardPort: number | null

  @column()
  declare openvpnPort: number | null

  @column()
  declare status: NodeStatus

  @column.dateTime()
  declare lastSeenAt: DateTime | null

  @column()
  declare category: NodeCategory

  @column()
  declare countryCode: string | null

  @column()
  declare city: string | null

  @column({
    consume: (value) => (value === null ? null : Number(value)),
  })
  declare latitude: number | null

  @column({
    consume: (value) => (value === null ? null : Number(value)),
  })
  declare longitude: number | null

  @column()
  declare hardwareModel: string | null

  @column()
  declare arch: string | null

  @column()
  declare osVersion: string | null

  @column()
  declare agentVersion: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @column.dateTime()
  declare deletedAt: DateTime | null

  @belongsTo(() => User, { foreignKey: 'ownerUserId' })
  declare ownerUser: BelongsTo<typeof User>

  @belongsTo(() => Organization, { foreignKey: 'ownerOrgId' })
  declare ownerOrg: BelongsTo<typeof Organization>

  @hasMany(() => NodeMember, { foreignKey: 'nodeId' })
  declare members: HasMany<typeof NodeMember>

  @hasMany(() => NodeAlert, { foreignKey: 'nodeId' })
  declare alerts: HasMany<typeof NodeAlert>

  @hasMany(() => NodeMetric, { foreignKey: 'nodeId' })
  declare metrics: HasMany<typeof NodeMetric>

  @hasMany(() => NodePeerStat, { foreignKey: 'nodeId' })
  declare peers: HasMany<typeof NodePeerStat>

  @hasMany(() => ConnectionLog, { foreignKey: 'nodeId' })
  declare connectionLogs: HasMany<typeof ConnectionLog>
}
