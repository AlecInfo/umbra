import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'org_members'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v7()'))
      table.uuid('org_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE')
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.string('role', 20).notNullable().defaultTo('member')
        .checkIn(['owner', 'admin', 'member'])
      table.timestamp('joined_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.unique(['org_id', 'user_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
