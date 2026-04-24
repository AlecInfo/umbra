import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'api_keys'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v7()'))
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.uuid('org_id').nullable().references('id').inTable('organizations').onDelete('CASCADE')
      table.string('name', 100).notNullable()
      table.text('key_hash').notNullable().unique()
      table.string('key_prefix', 10).notNullable()
      table.specificType('scopes', 'TEXT[]').notNullable().defaultTo('{}')
      table.timestamp('last_used_at', { useTz: true }).nullable()
      table.timestamp('expires_at', { useTz: true }).nullable()
      table.timestamp('revoked_at', { useTz: true }).nullable()
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
    })

    this.schema.raw('CREATE INDEX idx_api_keys_user ON api_keys(user_id) WHERE revoked_at IS NULL')
    this.schema.raw('CREATE INDEX idx_api_keys_org ON api_keys(org_id) WHERE revoked_at IS NULL')
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}