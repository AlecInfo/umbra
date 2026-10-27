import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import Node from '#models/node'
import NodeAlert, { type AlertType } from '#models/node_alert'
import OrgMember from '#models/org_member'
import User from '#models/user'
import { recordNodeEvent } from '#services/node_events'
import { sendAlert } from '#services/mailer'

/*
| Alert rules and their evaluation.
|
| A rule is a row of node_alerts: a type, a threshold, and its current state —
| firing while triggered_at is set and resolved_at is not. Every node gets the
| defaults when it is enrolled. Metric rules are evaluated on each heartbeat;
| the offline rule by the sweep that notices a node went silent.
|
| Each transition is recorded in the node's activity and, when the recipient
| asked for it and SMTP is configured, sent by email. Nothing is sent while
| a rule stays in the same state.
*/

export const DEFAULT_RULES: { type: AlertType; threshold: number | null; unit: string | null }[] = [
  { type: 'node_offline', threshold: null, unit: null },
  { type: 'cpu_high', threshold: 90, unit: '%' },
  { type: 'memory_high', threshold: 90, unit: '%' },
  { type: 'disk_high', threshold: 90, unit: '%' },
  { type: 'temperature_high', threshold: 80, unit: '°C' },
]

// Metric rule → node_metrics column.
const METRIC_COLUMNS: Partial<Record<AlertType, string>> = {
  cpu_high: 'cpu_percent',
  memory_high: 'memory_percent',
  disk_high: 'disk_percent',
  temperature_high: 'temperature_celsius',
}

// Judged on the average of the last minute of heartbeats, not one sample: a
// ten-second CPU spike is not an incident. And it resolves a few points under
// the threshold, so a value hovering on the line does not fire every minute.
const WINDOW_SAMPLES = 6
const MIN_SAMPLES = 3
const HYSTERESIS = 5

const TITLES: Record<AlertType, string> = {
  node_offline: 'Nœud hors ligne',
  cpu_high: 'CPU élevé',
  memory_high: 'Mémoire élevée',
  disk_high: 'Disque presque plein',
  temperature_high: 'Température élevée',
  latency_high: 'Latence élevée',
  peer_disconnected: 'Pair déconnecté',
}

export function isFiring(rule: NodeAlert): boolean {
  return rule.triggeredAt !== null && rule.resolvedAt === null
}

/** Give a node the default rules it does not have yet. */
export async function ensureDefaultRules(nodeId: string, createdBy: string): Promise<void> {
  await db
    .table('node_alerts')
    .insert(
      DEFAULT_RULES.map((r) => ({
        node_id: nodeId,
        created_by: createdBy,
        type: r.type,
        threshold_value: r.threshold,
        threshold_unit: r.unit,
      }))
    )
    .onConflict(['node_id', 'type'])
    .ignore()
}

function detail(rule: NodeAlert, resolved: boolean): string {
  if (rule.type === 'node_offline') {
    return resolved ? 'Le nœud envoie de nouveau des heartbeats.' : "Le nœud n'envoie plus de heartbeats."
  }
  const value = rule.lastValue !== null ? `${Math.round(rule.lastValue)} ${rule.thresholdUnit ?? ''}`.trim() : '—'
  const limit = `${rule.thresholdValue} ${rule.thresholdUnit ?? ''}`.trim()
  return resolved
    ? `Revenu à ${value} (seuil ${limit}).`
    : `Moyenne de la dernière minute : ${value} (seuil ${limit}).`
}

/** Who hears about a node: its owner, or the owners and admins of its org — among them, those who want this kind of alert. */
export async function alertRecipients(node: Node, type: AlertType): Promise<User[]> {
  let userIds: string[]
  if (node.ownerUserId) {
    userIds = [node.ownerUserId]
  } else if (node.ownerOrgId) {
    const members = await OrgMember.query()
      .where('org_id', node.ownerOrgId)
      .whereIn('role', ['owner', 'admin'])
      .select('user_id')
    userIds = members.map((m) => m.userId)
  } else {
    return []
  }
  if (userIds.length === 0) return []

  const pref = type === 'node_offline' ? 'offline' : 'system'
  const users = await User.query().whereIn('id', userIds).whereNull('deleted_at')
  return users.filter((u) => u.email && u.notificationPrefs?.[pref] !== false)
}

async function notify(rule: NodeAlert, resolved: boolean): Promise<void> {
  if (!rule.notifyEmail) return
  try {
    const node = await Node.find(rule.nodeId)
    if (!node || node.deletedAt) return
    for (const user of await alertRecipients(node, rule.type)) {
      await sendAlert(user.email, {
        nodeName: node.name,
        nodeId: node.id,
        title: TITLES[rule.type],
        detail: detail(rule, resolved),
        resolved,
      })
    }
  } catch (err) {
    console.error(`Notifying alert ${rule.id} failed:`, err)
  }
}

/** `at`: when the condition began, when that is known better than "now". */
export async function triggerAlert(rule: NodeAlert, value: number | null, at?: DateTime): Promise<void> {
  rule.triggeredAt = at ?? DateTime.now()
  rule.resolvedAt = null
  rule.lastValue = value
  await rule.save()
  await recordNodeEvent(rule.nodeId, 'alert_triggered', {
    data: { type: rule.type, value, threshold: rule.thresholdValue, unit: rule.thresholdUnit },
  })
  // Not awaited: a slow SMTP server must not hold up the heartbeat or the sweep.
  void notify(rule, false)
}

export async function resolveAlert(rule: NodeAlert, value: number | null): Promise<void> {
  rule.resolvedAt = DateTime.now()
  if (value !== null) rule.lastValue = value
  await rule.save()
  await recordNodeEvent(rule.nodeId, 'alert_resolved', {
    data: { type: rule.type, value, threshold: rule.thresholdValue, unit: rule.thresholdUnit },
  })
  void notify(rule, true)
}

/**
 * Evaluate a node's metric rules against its last minute of samples.
 * Returns whether any of them is firing afterwards.
 */
export async function evaluateMetricAlerts(nodeId: string): Promise<boolean> {
  const rules = await NodeAlert.query()
    .where('node_id', nodeId)
    .where('is_active', true)
    .whereIn('type', Object.keys(METRIC_COLUMNS))
  if (rules.length === 0) return false

  const result = await db.rawQuery(
    `SELECT count(*)::int                   AS samples,
            avg(cpu_percent)::float          AS cpu_percent,
            avg(memory_percent)::float       AS memory_percent,
            avg(disk_percent)::float         AS disk_percent,
            avg(temperature_celsius)::float  AS temperature_celsius
     FROM (SELECT cpu_percent, memory_percent, disk_percent, temperature_celsius
           FROM node_metrics WHERE node_id = ?
           ORDER BY recorded_at DESC LIMIT ?) recent`,
    [nodeId, WINDOW_SAMPLES]
  )
  const avg = result.rows?.[0]
  if (!avg || avg.samples < MIN_SAMPLES) return rules.some(isFiring)

  let firing = false
  for (const rule of rules) {
    const value: number | null = avg[METRIC_COLUMNS[rule.type]!]
    if (value === null || rule.thresholdValue === null) {
      firing ||= isFiring(rule)
      continue
    }
    if (!isFiring(rule) && value > rule.thresholdValue) {
      await triggerAlert(rule, value)
    } else if (isFiring(rule) && value < rule.thresholdValue - HYSTERESIS) {
      await resolveAlert(rule, value)
    }
    firing ||= isFiring(rule)
  }
  return firing
}
