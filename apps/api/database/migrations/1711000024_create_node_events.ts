import { BaseSchema } from '@adonisjs/lucid/schema'

/*
| What happened to a node, as opposed to what it measures. Status lives on the
| node row and is overwritten on every change, and alert rules keep only their
| last trigger — so without this table nothing remembers that a machine went
| down on Tuesday and came back an hour later.
|
| Connections are not duplicated here: connection_logs already holds them and
| the activity endpoint merges both.
*/
export default class extends BaseSchema {
  protected tableName = 'node_events'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v7()'))
      table.uuid('node_id').notNullable().references('id').inTable('nodes').onDelete('CASCADE')
      table.string('type', 30).notNullable()
      // Null for what the system observed on its own (offline sweep, heartbeat).
      table.uuid('actor_user_id').nullable().references('id').inTable('users').onDelete('SET NULL')
      table.jsonb('data').nullable()
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
    })

    this.schema.raw('CREATE INDEX idx_node_events_node_time ON node_events(node_id, created_at DESC)')
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
