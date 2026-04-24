import { DateTime } from 'luxon'
import { BaseModel, column, hasMany, manyToMany } from '@adonisjs/lucid/orm'
import type { HasMany, ManyToMany } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import Node from '#models/node'
import OrgMember from '#models/org_member'

export type OrgPlan = 'starter' | 'team' | 'enterprise'

export default class Organization extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare name: string

  @column()
  declare slug: string

  @column()
  declare plan: OrgPlan

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @column.dateTime()
  declare deletedAt: DateTime | null

  @manyToMany(() => User, {
    pivotTable: 'org_members',
    pivotForeignKey: 'org_id',
    pivotRelatedForeignKey: 'user_id',
    pivotColumns: ['role', 'joined_at'],
  })
  declare members: ManyToMany<typeof User>

  @hasMany(() => OrgMember, { foreignKey: 'orgId' })
  declare memberships: HasMany<typeof OrgMember>

  @hasMany(() => Node, { foreignKey: 'ownerOrgId' })
  declare nodes: HasMany<typeof Node>
}
