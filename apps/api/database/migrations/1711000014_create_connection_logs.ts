import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'connection_logs'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v7()'))
      table.uuid('node_id').notNullable().references('id').inTable('nodes').onDelete('CASCADE')
      table.uuid('device_id').nullable().references('id').inTable('devices').onDelete('SET NULL')
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.timestamp('connected_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.timestamp('disconnected_at', { useTz: true }).nullable()
      table.bigInteger('bytes_sent').defaultTo(0)
      table.bigInteger('bytes_received').defaultTo(0)
      table.specificType('client_ip', 'INET').nullable()
      table.string('protocol', 20).defaultTo('wireguard')
        .checkIn(['wireguard', 'openvpn'])
    })

    this.schema.raw('CREATE INDEX idx_conn_logs_node ON connection_logs(node_id, connected_at DESC)')
    this.schema.raw('CREATE INDEX idx_conn_logs_user ON connection_logs(user_id, connected_at DESC)')
    this.schema.raw('CREATE INDEX idx_conn_logs_active ON connection_logs(node_id) WHERE disconnected_at IS NULL')
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}