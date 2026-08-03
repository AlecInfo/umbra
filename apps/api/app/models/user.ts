import { DateTime } from 'luxon'
import hash from '@adonisjs/core/services/hash'
import { compose } from '@adonisjs/core/helpers'
import { BaseModel, beforeSave, column, hasMany, manyToMany } from '@adonisjs/lucid/orm'
import type { HasMany, ManyToMany } from '@adonisjs/lucid/types/relations'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import { DbAccessTokensProvider } from '@adonisjs/auth/access_tokens'
import Organization from '#models/organization'
import Node from '#models/node'
import Device from '#models/device'
import ApiKey from '#models/api_key'
import AuthSession from '#models/auth_session'

const AuthFinder = withAuthFinder(() => hash.use('scrypt'), {
  uids: ['email'],
  passwordColumnName: 'passwordHash',
})

export default class User extends compose(BaseModel, AuthFinder) {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare email: string

  @column({ serializeAs: null })
  declare passwordHash: string | null

  @column()
  declare name: string | null

  @column()
  declare avatarUrl: string | null

  @column()
  declare githubId: string | null

  @column()
  declare googleId: string | null

  @column()
  declare emailVerified: boolean

  @column()
  declare isActive: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @column()
  declare exitNodeId: string | null

  @column.dateTime()
  declare deletedAt: DateTime | null

  @beforeSave()
  static async hashPassword(user: User) {
    if (user.$dirty.passwordHash && user.passwordHash) {
      if (!user.passwordHash.startsWith('$scrypt')) {
        user.passwordHash = await hash.use('scrypt').make(user.passwordHash)
      }
    }
  }

  @manyToMany(() => Organization, {
    pivotTable: 'org_members',
    pivotForeignKey: 'user_id',
    pivotRelatedForeignKey: 'org_id',
    pivotColumns: ['role', 'joined_at'],
  })
  declare organizations: ManyToMany<typeof Organization>

  @hasMany(() => Node, { foreignKey: 'ownerUserId' })
  declare ownedNodes: HasMany<typeof Node>

  @hasMany(() => Device, { foreignKey: 'userId' })
  declare devices: HasMany<typeof Device>

  @hasMany(() => ApiKey, { foreignKey: 'userId' })
  declare apiKeys: HasMany<typeof ApiKey>

  @hasMany(() => AuthSession, { foreignKey: 'userId' })
  declare sessions: HasMany<typeof AuthSession>

  static accessTokens = DbAccessTokensProvider.forModel(User, {
    expiresIn: '30 days',
    prefix: 'umbra_',
    table: 'auth_access_tokens',
    type: 'auth_token',
    tokenSecretLength: 40,
  })
}
