import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v7()'))
      table.string('email', 255).notNullable().unique()
      table.text('password_hash').nullable()
      table.string('name', 100).nullable()
      table.text('avatar_url').nullable()
      table.string('github_id', 100).unique().nullable()
      table.string('google_id', 100).unique().nullable()
      table.boolean('email_verified').notNullable().defaultTo(false)
      table.boolean('is_active').notNullable().defaultTo(true)
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.timestamp('deleted_at', { useTz: true }).nullable()
    })

    this.schema.raw(`
      CREATE TRIGGER trg_users_updated_at
        BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at()
    `)
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
