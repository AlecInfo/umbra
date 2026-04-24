import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'devices'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v7()'))
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.string('name', 100).notNullable()
      table.string('type', 20).notNullable().defaultTo('other')
        .checkIn(['desktop', 'mobile', 'router', 'other'])
      table.text('wireguard_pubkey').unique().nullable()
      table.specificType('wireguard_ip', 'INET').nullable()
      table.string('headscale_id', 100).unique().nullable()
      table.timestamp('last_seen_at', { useTz: true }).nullable()
      table.boolean('is_active').notNullable().defaultTo(true)
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.timestamp('deleted_at', { useTz: true }).nullable()
    })

    this.schema.raw('CREATE INDEX idx_devices_user_id ON devices(user_id) WHERE deleted_at IS NULL')

    this.schema.raw(`
      CREATE TRIGGER trg_devices_updated_at
        BEFORE UPDATE ON devices FOR EACH ROW EXECUTE FUNCTION set_updated_at()
    `)
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}