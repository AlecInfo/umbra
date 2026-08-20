import db from '@adonisjs/lucid/services/db'
import limiter from '@adonisjs/limiter/services/main'

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

  // Instance settings are a single pinned row rather than tenant data, so
  // truncation leaves them alone — and a test that closes registration would
  // otherwise lock every later test out.
  await db.rawQuery(`
    INSERT INTO instance_settings (id, registration_mode) VALUES (1, 'open')
    ON CONFLICT (id) DO UPDATE SET registration_mode = 'open'
  `)

  // Throttles count per IP, and the whole suite comes from 127.0.0.1: without
  // this, tests would exhaust the real signup limit a few files in. Clearing
  // between tests keeps production limits honest instead of loosening them for
  // the test environment — the limits themselves are covered by throttle.spec.
  await limiter.clear()
}
