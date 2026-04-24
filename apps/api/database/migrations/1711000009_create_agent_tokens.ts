import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'agent_tokens'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v7()'))
      table.uuid('created_by').notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.uuid('target_org_id').nullable().references('id').inTable('organizations').onDelete('CASCADE')
      table.uuid('node_id').nullable().references('id').inTable('nodes').onDelete('SET NULL')
      table.text('token_hash').notNullable().unique()
      table.string('node_name', 100).nullable()
      table.timestamp('used_at', { useTz: true }).nullable()
      table.timestamp('expires_at', { useTz: true }).notNullable()
        .defaultTo(this.raw("NOW() + INTERVAL '24 hours'"))
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}