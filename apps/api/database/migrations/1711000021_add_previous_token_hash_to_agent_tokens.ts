import { BaseSchema } from '@adonisjs/lucid/schema'

// Token rotation grace period: the old hash stays valid until the agent
// proves it received the new token (first authenticated use). Without it,
// a lost rotation response locks the agent out until manual re-enrollment.
export default class extends BaseSchema {
  protected tableName = 'agent_tokens'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('previous_token_hash', 64).nullable()
    })
    this.schema.raw('CREATE INDEX idx_agent_tokens_prev_hash ON agent_tokens(previous_token_hash)')
  }

  async down() {
    this.schema.raw('DROP INDEX IF EXISTS idx_agent_tokens_prev_hash')
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('previous_token_hash')
    })
  }
}
