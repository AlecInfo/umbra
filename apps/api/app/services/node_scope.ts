import db from '@adonisjs/lucid/services/db'
import Node from '#models/node'
import OrgMember from '#models/org_member'

export async function userOrgIds(userId: string): Promise<string[]> {
  const rows = await OrgMember.query().where('user_id', userId).select('org_id')
  return rows.map((r) => r.orgId)
}

// Nodes the user can at least read: own nodes, nodes of their orgs, and
// nodes explicitly shared with them (or one of their orgs) via node_members.
// Per-action checks live in #services/permissions (findNodeWithPermission).
export function accessibleNodesQuery(userId: string, orgIds: string[]) {
  return Node.query()
    .whereNull('deleted_at')
    .where((q) => {
      q.where('owner_user_id', userId)
      if (orgIds.length > 0) q.orWhereIn('owner_org_id', orgIds)
      q.orWhereIn(
        'id',
        db
          .from('node_members')
          .select('node_id')
          .where((m) => {
            m.where('user_id', userId)
            if (orgIds.length > 0) m.orWhereIn('org_id', orgIds)
          })
      )
    })
}
