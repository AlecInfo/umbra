import db from '@adonisjs/lucid/services/db'

// The agent heartbeats every 10s: 90s ≈ 9 missed beats.
export const OFFLINE_AFTER_SECONDS = 90

// Mark nodes offline once their agent stopped heartbeating, and trigger the
// active node_offline alert rules of those nodes. Returns the ids of the
// nodes that just went offline. Idempotent — safe to run at any frequency.
export async function markStaleNodesOffline(): Promise<string[]> {
  const result = await db.rawQuery(
    `UPDATE nodes SET status = 'offline'
     WHERE status IN ('online', 'warning')
       AND deleted_at IS NULL
       AND (last_seen_at IS NULL OR last_seen_at < now() - make_interval(secs => ?))
     RETURNING id`,
    [OFFLINE_AFTER_SECONDS]
  )
  const ids: string[] = (result.rows ?? []).map((r: { id: string }) => r.id)

  if (ids.length > 0) {
    await db
      .from('node_alerts')
      .whereIn('node_id', ids)
      .where('type', 'node_offline')
      .where('is_active', true)
      .update({ triggered_at: new Date(), resolved_at: null })
  }

  return ids
}

// Resolve the node_offline alerts of a node that came back online.
export async function resolveOfflineAlerts(nodeId: string): Promise<void> {
  await db
    .from('node_alerts')
    .where('node_id', nodeId)
    .where('type', 'node_offline')
    .whereNotNull('triggered_at')
    .whereNull('resolved_at')
    .update({ resolved_at: new Date() })
}
