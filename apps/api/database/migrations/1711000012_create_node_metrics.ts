import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'node_metrics'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('node_id').notNullable().references('id').inTable('nodes').onDelete('CASCADE')
      table.timestamp('recorded_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.bigInteger('bytes_sent').nullable()
      table.bigInteger('bytes_received').nullable()
      table.smallint('latency_ms').nullable()
      table.decimal('cpu_percent', 5, 2).nullable()
      table.decimal('memory_percent', 5, 2).nullable()
      table.decimal('disk_percent', 5, 2).nullable()
      table.decimal('temperature_celsius', 5, 1).nullable()
      table.bigInteger('uptime_seconds').nullable()
      table.smallint('active_peers').defaultTo(0)
    })

    // Convert to TimescaleDB hypertable
    this.schema.raw("SELECT create_hypertable('node_metrics', 'recorded_at', chunk_time_interval => INTERVAL '7 days')")

    // Enable compression
    this.schema.raw(`
      ALTER TABLE node_metrics SET (
        timescaledb.compress,
        timescaledb.compress_segmentby = 'node_id'
      )
    `)
    this.schema.raw("SELECT add_compression_policy('node_metrics', INTERVAL '30 days')")

    this.schema.raw('CREATE INDEX idx_metrics_node_time ON node_metrics(node_id, recorded_at DESC)')
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}