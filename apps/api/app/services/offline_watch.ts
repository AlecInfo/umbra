import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import NodeAlert from '#models/node_alert'
import { isFiring, triggerAlert, resolveAlert } from '#services/alerts'

// The agent heartbeats every 10s: 90s ≈ 9 missed beats.
export const OFFLINE_AFTER_SECONDS = 90

// Mark nodes offline once their agent stopped heartbeating, and fire the
// node_offline rule of each. Returns the ids of the
// nodes that just went offline. Idempotent — safe to run at any frequency.
export async function markStaleNodesOffline(): Promise<string[]> {
  const result = await db.rawQuery(
    `UPDATE nodes SET status = 'offline'
     WHERE status IN ('online', 'warning')
       AND deleted_at IS NULL
       AND (last_seen_at IS NULL OR last_seen_at < now() - make_interval(secs => ?))
     RETURNING id, last_seen_at`,
    [OFFLINE_AFTER_SECONDS]
  )
  const rows: { id: string; last_seen_at: Date | null }[] = result.rows ?? []
  const ids = rows.map((r) => r.id)

  if (ids.length > 0) {
    // Dated at the last heartbeat, not at detection: the sweep only notices a
    // silence after the fact, and the timeline should say when it started.
    await db.table('node_events').multiInsert(
      rows.map((r) => ({ node_id: r.id, type: 'went_offline', created_at: r.last_seen_at ?? new Date() }))
    )
    const rules = await NodeAlert.query()
      .whereIn('node_id', ids)
      .where('type', 'node_offline')
      .where('is_active', true)
    // Dated at the last heartbeat, like the went_offline event: the sweep only
    // notices a silence some two minutes in, and the outage began before.
    const lastSeen = new Map(rows.map((r) => [r.id, r.last_seen_at]))
    for (const rule of rules) {
      const since = lastSeen.get(rule.nodeId)
      if (!isFiring(rule)) await triggerAlert(rule, null, since ? DateTime.fromJSDate(since) : undefined)
    }
  }

  return ids
}

// Resolve the node_offline alert of a node that came back online.
export async function resolveOfflineAlerts(nodeId: string): Promise<void> {
  const rules = await NodeAlert.query().where('node_id', nodeId).where('type', 'node_offline')
  for (const rule of rules) {
    if (isFiring(rule)) await resolveAlert(rule, null)
  }
}
