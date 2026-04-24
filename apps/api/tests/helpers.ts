import db from '@adonisjs/lucid/services/db'

const TABLES_IN_ORDER = [
  'node_peer_stats',
  'node_metrics',
  'node_alerts',
  'node_members',
  'connection_logs',
  'audit_logs',
  'agent_tokens',
  'invitations',
  'api_keys',
  'devices',
  'auth_sessions',
  'auth_access_tokens',
  'nodes',
  'org_members',
  'organizations',
  'users',
]

export async function resetDatabase() {
  for (const table of TABLES_IN_ORDER) {
    await db.rawQuery(`TRUNCATE TABLE "${table}" CASCADE`)
  }
}
