import { BaseSchema } from '@adonisjs/lucid/schema'

/*
| Agent settings the dashboard can actually change.
|
| The heartbeat interval and auto-update lived only in each agent's local
| /etc/umbra/agent.json; the dashboard showed them as settings wired to
| nothing. The server is now the source: it returns these with every
| heartbeat and the agent applies them live (agent ≥ 1.1.0), reporting back
| what it runs with so the dashboard can tell applied from pending.
*/
export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('nodes', (table) => {
      table.integer('heartbeat_interval_seconds').notNullable().defaultTo(10)
      table.boolean('auto_update').notNullable().defaultTo(true)
      // { heartbeatIntervalSeconds, autoUpdate } as last reported by the agent;
      // null for an agent too old to report it.
      table.jsonb('agent_reported_config').nullable()
      table.check('heartbeat_interval_seconds BETWEEN 5 AND 300', [], 'chk_heartbeat_interval')
    })

    this.schema.alterTable('users', (table) => {
      // What a new personal node starts with, and what "apply to all" spreads.
      table
        .jsonb('agent_defaults')
        .notNullable()
        .defaultTo(JSON.stringify({ heartbeatIntervalSeconds: 10, autoUpdate: true }))
    })
  }

  async down() {
    this.schema.alterTable('users', (table) => table.dropColumn('agent_defaults'))
    this.schema.alterTable('nodes', (table) => {
      table.dropChecks(['chk_heartbeat_interval'])
      table.dropColumns('heartbeat_interval_seconds', 'auto_update', 'agent_reported_config')
    })
  }
}
