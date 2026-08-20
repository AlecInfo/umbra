import OrgMember from '#models/org_member'
import type { OrgRole } from '#models/org_member'

/*
| Org roles, from most to least privileged:
|   owner   — everything, including deleting the org and demoting admins
|   admin   — manage members, invite, create org nodes
|   member  — read the org's nodes and connect to them
|
| Node-level permissions derive from these in #services/permissions.
*/
const RANK: Record<OrgRole, number> = { owner: 3, admin: 2, member: 1 }

export async function resolveOrgRole(userId: string, orgId: string): Promise<OrgRole | null> {
  const membership = await OrgMember.query()
    .where('user_id', userId)
    .where('org_id', orgId)
    .first()
  return membership?.role ?? null
}

export function roleAtLeast(role: OrgRole | null, required: OrgRole): boolean {
  return role !== null && RANK[role] >= RANK[required]
}

/**
 * Membership check that returns the caller's role, or null when they have no
 * business knowing the org exists — callers answer 404 rather than 403 so an
 * outsider cannot probe for org ids.
 */
export async function requireOrgRole(
  userId: string,
  orgId: string,
  required: OrgRole
): Promise<OrgRole | null> {
  const role = await resolveOrgRole(userId, orgId)
  return roleAtLeast(role, required) ? role : null
}

/**
 * An org must always keep at least one owner: without this, demoting or
 * removing the last one leaves an org nobody can administer or delete.
 */
export async function isLastOwner(orgId: string, userId: string): Promise<boolean> {
  const target = await OrgMember.query().where('org_id', orgId).where('user_id', userId).first()
  if (target?.role !== 'owner') return false

  const owners = await OrgMember.query().where('org_id', orgId).where('role', 'owner').count('* as total')
  return Number(owners[0].$extras.total) <= 1
}
