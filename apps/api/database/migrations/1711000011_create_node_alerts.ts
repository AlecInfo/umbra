import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'node_alerts'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v7()'))
      table.uuid('node_id').notNullable().references('id').inTable('nodes').onDelete('CASCADE')
      table.uuid('created_by').notNullable().references('id').inTable('users')
      table.string('type', 50).notNullable()
        .checkIn(['node_offline', 'cpu_high', 'memory_high', 'disk_high', 'temperature_high', 'latency_high', 'peer_disconnected'])
      table.decimal('threshold_value', 8, 2).nullable()
      table.string('threshold_unit', 20).nullable()
      table.boolean('is_active').notNullable().defaultTo(true)
      table.timestamp('triggered_at', { useTz: true }).nullable()
      table.timestamp('resolved_at', { useTz: true }).nullable()
      table.boolean('notify_email').notNullable().defaultTo(true)
      table.text('notify_webhook').nullable()
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now())
    })

    this.schema.raw('CREATE INDEX idx_alerts_node ON node_alerts(node_id) WHERE is_active = TRUE')

    this.schema.raw(`
      CREATE TRIGGER trg_node_alerts_updated_at
        BEFORE UPDATE ON node_alerts FOR EACH ROW EXECUTE FUNCTION set_updated_at()
    `)
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}