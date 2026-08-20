import db from '@adonisjs/lucid/services/db'
import User from '#models/user'

export type RegistrationMode = 'open' | 'invite_only' | 'closed'

export interface InstanceSettings {
  registrationMode: RegistrationMode
}

/*
| The instance layer: who runs this deployment, and how it lets people in.
|
| An operator administers accounts and settings. It is NOT a node permission
| and never appears in resolveNodePermission — a node is an exit node, so
| granting the server operator access to one means letting them route their
| traffic through a user's home connection. Operational power and network
| access are kept in separate code paths so the second cannot be reached by
| relaxing a check in the first.
*/

const DEFAULTS: InstanceSettings = { registrationMode: 'open' }

export function isOperator(user: User | null | undefined): boolean {
  return user?.instanceRole === 'operator'
}

export async function getInstanceSettings(): Promise<InstanceSettings> {
  const row = await db.from('instance_settings').where('id', 1).first()
  if (!row) return DEFAULTS
  return { registrationMode: row.registration_mode as RegistrationMode }
}

export async function setRegistrationMode(mode: RegistrationMode): Promise<void> {
  await db
    .from('instance_settings')
    .where('id', 1)
    .update({ registration_mode: mode, updated_at: new Date() })
}

/**
 * True while the deployment has no account at all.
 *
 * The very first person to register becomes the operator, whatever the
 * registration mode says — otherwise a fresh install with registration closed
 * would lock everyone out, including whoever just deployed it.
 */
export async function isFirstAccount(): Promise<boolean> {
  const [{ total }] = await db.from('users').whereNull('deleted_at').count('* as total')
  return Number(total) === 0
}
