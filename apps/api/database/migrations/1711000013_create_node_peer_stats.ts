import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'node_peer_stats'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v7()'))
      table.uuid('node_id').notNullable().references('id').inTable('nodes').onDelete('CASCADE')
      table.text('peer_pubkey').notNullable()
      table.string('peer_name', 100).nullable()
      table.specificType('allowed_ips', 'TEXT[]').nullable()
      table.text('endpoint').nullable()
      table.timestamp('last_handshake_at', { useTz: true }).nullable()
      table.bigInteger('bytes_sent').defaultTo(0)
      table.bigInteger('bytes_received').defaultTo(0)
      table.boolean('is_active').notNullable().defaultTo(true)
      table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now())

      table.unique(['node_id', 'peer_pubkey'])
    })

    this.schema.raw('CREATE INDEX idx_peer_stats_node ON node_peer_stats(node_id)')

    this.schema.raw(`
      CREATE TRIGGER trg_peer_stats_updated_at
        BEFORE UPDATE ON node_peer_stats FOR EACH ROW EXECUTE FUNCTION set_updated_at()
    `)
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}