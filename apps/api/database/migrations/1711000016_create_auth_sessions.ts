import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'auth_sessions'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v7()'))
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.text('refresh_token').notNullable().unique()
      table.text('user_agent').nullable()
      table.specificType('ip_address', 'INET').nullable()
      table.timestamp('expires_at', { useTz: true }).notNullable()
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.timestamp('revoked_at', { useTz: true }).nullable()
    })

    this.schema.raw('CREATE INDEX idx_sessions_user_id ON auth_sessions(user_id)')
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}