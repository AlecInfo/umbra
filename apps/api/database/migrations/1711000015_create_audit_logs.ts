import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'audit_logs'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v7()'))
      table.uuid('performed_by').notNullable().references('id').inTable('users')
      table.uuid('org_id').nullable().references('id').inTable('organizations').onDelete('SET NULL')
      table.string('resource_type', 50).notNullable()
      table.uuid('resource_id').notNullable()
      table.string('action', 50).notNullable()
      table.jsonb('old_value').nullable()
      table.jsonb('new_value').nullable()
      table.specificType('ip_address', 'INET').nullable()
      table.text('user_agent').nullable()
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
    })

    this.schema.raw('CREATE INDEX idx_audit_resource ON audit_logs(resource_type, resource_id, created_at DESC)')
    this.schema.raw('CREATE INDEX idx_audit_user ON audit_logs(performed_by, created_at DESC)')
    this.schema.raw('CREATE INDEX idx_audit_org ON audit_logs(org_id, created_at DESC)')
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}