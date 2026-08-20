import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('users', (table) => {
      // Who operates the server, as opposed to who uses it. Deliberately not a
      // node permission: an operator administers accounts and never gains
      // network access to anyone's machines.
      table.string('instance_role', 20).notNullable().defaultTo('user')
      // Set on accounts created by an operator or an org admin with a
      // temporary password: the holder must replace it before doing anything.
      table.boolean('must_change_password').notNullable().defaultTo(false)
    })

    this.schema.createTable('instance_settings', (table) => {
      // Single row, pinned by a check constraint — settings belong to the
      // deployment, not to a tenant.
      table.integer('id').primary().defaultTo(1)
      table.string('registration_mode', 20).notNullable().defaultTo('open')
      table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.check('id = 1', [], 'chk_single_row')
      table.check(
        "registration_mode IN ('open', 'invite_only', 'closed')",
        [],
        'chk_registration_mode'
      )
    })

    this.defer(async (db) => {
      await db.rawQuery('INSERT INTO instance_settings (id) VALUES (1) ON CONFLICT DO NOTHING')
      // An existing deployment has no operator yet; the oldest account is the
      // one that installed it.
      await db.rawQuery(`
        UPDATE users SET instance_role = 'operator'
        WHERE id = (SELECT id FROM users WHERE deleted_at IS NULL ORDER BY created_at ASC LIMIT 1)
      `)
    })
  }

  async down() {
    this.schema.dropTable('instance_settings')
    this.schema.alterTable('users', (table) => {
      table.dropColumn('instance_role')
      table.dropColumn('must_change_password')
    })
  }
}
