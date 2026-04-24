import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'organizations'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v7()'))
      table.string('name', 100).notNullable()
      table.string('slug', 100).notNullable().unique()
      table.string('plan', 20).notNullable().defaultTo('starter')
        .checkIn(['starter', 'team', 'enterprise'])
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.timestamp('deleted_at', { useTz: true }).nullable()
    })

    this.schema.raw(`
      CREATE TRIGGER trg_organizations_updated_at
        BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION set_updated_at()
    `)
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
