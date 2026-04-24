import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'invitations'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v7()'))
      table.uuid('invited_by').notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.uuid('org_id').nullable().references('id').inTable('organizations').onDelete('CASCADE')
      table.uuid('node_id').nullable().references('id').inTable('nodes').onDelete('CASCADE')
      table.string('email', 255).notNullable()
      table.string('role', 20).nullable()
      table.string('permission', 20).nullable()
      table.text('token_hash').notNullable().unique()
      table.timestamp('accepted_at', { useTz: true }).nullable()
      table.timestamp('expires_at', { useTz: true }).notNullable()
        .defaultTo(this.raw("NOW() + INTERVAL '7 days'"))
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())

      // Either org invite or node invite, never both
      table.check('(org_id IS NOT NULL AND node_id IS NULL) OR (org_id IS NULL AND node_id IS NOT NULL)', [], 'chk_invite_target')
    })

    this.schema.raw('CREATE INDEX idx_invitations_email ON invitations(email) WHERE accepted_at IS NULL')
    this.schema.raw('CREATE INDEX idx_invitations_token ON invitations(token_hash)')
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}