import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'nodes'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('uuid_generate_v7()'))

      table.uuid('owner_user_id').nullable().references('id').inTable('users').onDelete('CASCADE')
      table.uuid('owner_org_id').nullable().references('id').inTable('organizations').onDelete('CASCADE')

      table.string('name', 100).notNullable()
      table.string('hostname', 255).nullable()
      table.specificType('ip_address', 'INET').nullable()
      table.specificType('wireguard_ip', 'INET').nullable()

      table.string('headscale_id', 100).unique().nullable()
      table.text('wireguard_pubkey').nullable()

      table.boolean('supports_wireguard').notNullable().defaultTo(true)
      table.boolean('supports_openvpn').notNullable().defaultTo(false)
      table.integer('wireguard_port').defaultTo(51820)
      table.integer('openvpn_port').defaultTo(1194)

      table.string('status', 20).notNullable().defaultTo('pending')
        .checkIn(['pending', 'online', 'warning', 'offline', 'error'])
      table.timestamp('last_seen_at', { useTz: true }).nullable()

      table.string('category', 20).notNullable().defaultTo('other')
        .checkIn(['sbc', 'vps', 'router', 'nas', 'desktop', 'other'])

      table.string('country_code', 2).nullable()
      table.string('city', 100).nullable()
      table.decimal('latitude', 8, 5).nullable()
      table.decimal('longitude', 8, 5).nullable()

      table.string('hardware_model', 100).nullable()
      table.string('os_version', 100).nullable()
      table.string('agent_version', 20).nullable()

      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.timestamp('deleted_at', { useTz: true }).nullable()

      // Either user-owned or org-owned, never both
      table.check('(owner_user_id IS NOT NULL AND owner_org_id IS NULL) OR (owner_user_id IS NULL AND owner_org_id IS NOT NULL)', [], 'chk_node_owner')
    })

    // Partial indexes for active nodes
    this.schema.raw('CREATE INDEX idx_nodes_owner_user ON nodes(owner_user_id) WHERE deleted_at IS NULL')
    this.schema.raw('CREATE INDEX idx_nodes_owner_org ON nodes(owner_org_id) WHERE deleted_at IS NULL')
    this.schema.raw('CREATE INDEX idx_nodes_status ON nodes(status) WHERE deleted_at IS NULL')
    this.schema.raw('CREATE INDEX idx_nodes_category ON nodes(category) WHERE deleted_at IS NULL')

    this.schema.raw(`
      CREATE TRIGGER trg_nodes_updated_at
        BEFORE UPDATE ON nodes FOR EACH ROW EXECUTE FUNCTION set_updated_at()
    `)
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}