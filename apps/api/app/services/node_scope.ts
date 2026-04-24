import Node from '#models/node'
import OrgMember from '#models/org_member'

export async function userOrgIds(userId: string): Promise<string[]> {
  const rows = await OrgMember.query().where('user_id', userId).select('org_id')
  return rows.map((r) => r.orgId)
}

export async function findAccessibleNode(userId: string, nodeId: string): Promise<Node | null> {
  const orgIds = await userOrgIds(userId)
  return Node.query()
    .where('id', nodeId)
    .whereNull('deleted_at')
    .where((q) => {
      q.where('owner_user_id', userId)
      if (orgIds.length > 0) q.orWhereIn('owner_org_id', orgIds)
    })
    .first()
}

export function accessibleNodesQuery(userId: string, orgIds: string[]) {
  return Node.query()
    .whereNull('deleted_at')
    .where((q) => {
      q.where('owner_user_id', userId)
      if (orgIds.length > 0) q.orWhereIn('owner_org_id', orgIds)
    })
}
