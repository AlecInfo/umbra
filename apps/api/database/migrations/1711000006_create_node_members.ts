import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'node_members'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v7()'))
      table.uuid('node_id').notNullable().references('id').inTable('nodes').onDelete('CASCADE')
      table.uuid('user_id').nullable().references('id').inTable('users').onDelete('CASCADE')
      table.uuid('org_id').nullable().references('id').inTable('organizations').onDelete('CASCADE')
      table.string('permission', 20).notNullable().defaultTo('connect')
        .checkIn(['read', 'connect', 'manage', 'admin'])
      table.uuid('granted_by').notNullable().references('id').inTable('users')
      table.timestamp('granted_at', { useTz: true }).notNullable().defaultTo(this.now())

      // Either user or org member, never both
      table.check('(user_id IS NOT NULL AND org_id IS NULL) OR (user_id IS NULL AND org_id IS NOT NULL)', [], 'chk_member_target')
      table.unique(['node_id', 'user_id'])
      table.unique(['node_id', 'org_id'])
    })

    this.schema.raw('CREATE INDEX idx_node_members_node ON node_members(node_id)')
    this.schema.raw('CREATE INDEX idx_node_members_user ON node_members(user_id)')
    this.schema.raw('CREATE INDEX idx_node_members_org ON node_members(org_id)')
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}