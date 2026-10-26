import { BaseSchema } from '@adonisjs/lucid/schema'

/*
| Alerts existed as a table, a page and a settings section, and nothing ever
| wrote a rule: on a real install /alerts was empty forever and no threshold
| was ever evaluated. This gives every node the default rules and the columns
| the evaluation needs.
*/
export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('node_alerts', (table) => {
      // What was measured when the rule fired. threshold_value is the limit;
      // the alerts page used to print it as if it were the reading.
      table.decimal('last_value', 8, 2).nullable()
    })

    this.schema.alterTable('users', (table) => {
      // Which alert emails this person wants. Only sent when SMTP is set up.
      table.jsonb('notification_prefs').notNullable().defaultTo(JSON.stringify({ offline: true, system: true }))
    })

    this.schema.raw('CREATE UNIQUE INDEX uniq_node_alerts_node_type ON node_alerts(node_id, type)')

    // Default rules for every node that already exists. The creator column is
    // required: the owning account, or for an org node its oldest owner.
    this.defer(async (db) => {
      await db.rawQuery(`
        INSERT INTO node_alerts (node_id, created_by, type, threshold_value, threshold_unit)
        SELECT n.id,
               COALESCE(n.owner_user_id, (
                 SELECT om.user_id FROM org_members om
                 WHERE om.org_id = n.owner_org_id AND om.role = 'owner'
                 ORDER BY om.joined_at ASC LIMIT 1
               )),
               r.type, r.threshold, r.unit
        FROM nodes n
        CROSS JOIN (VALUES
          ('node_offline',     NULL::numeric, NULL::text),
          ('cpu_high',         90,            '%'),
          ('memory_high',      90,            '%'),
          ('disk_high',        90,            '%'),
          ('temperature_high', 80,            '°C')
        ) AS r(type, threshold, unit)
        WHERE n.deleted_at IS NULL
          AND COALESCE(n.owner_user_id, (
                SELECT om.user_id FROM org_members om
                WHERE om.org_id = n.owner_org_id AND om.role = 'owner' LIMIT 1
              )) IS NOT NULL
        ON CONFLICT (node_id, type) DO NOTHING
      `)
    })
  }

  async down() {
    this.schema.raw('DROP INDEX IF EXISTS uniq_node_alerts_node_type')
    this.schema.alterTable('users', (table) => table.dropColumn('notification_prefs'))
    this.schema.alterTable('node_alerts', (table) => table.dropColumn('last_value'))
  }
}
