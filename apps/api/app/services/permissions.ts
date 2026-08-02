import Node from '#models/node'
import NodeMember, { type NodePermission } from '#models/node_member'
import OrgMember from '#models/org_member'

export type { NodePermission }

const LEVELS: Record<NodePermission, number> = { read: 1, connect: 2, manage: 3, admin: 4 }

export function hasPermission(granted: NodePermission | null, required: NodePermission): boolean {
  return granted !== null && LEVELS[granted] >= LEVELS[required]
}

// Two-level resolution rule (the effective permission is the HIGHEST of all
// applicable grants — grants elevate, they never restrict):
//   - owner of a personal node                → admin
//   - org role on an org-owned node:  owner/admin → admin, member → connect
//   - explicit node_members grant to the user, or to an org the user belongs to
export async function resolveNodePermission(
  userId: string,
  node: Node
): Promise<NodePermission | null> {
  let best: NodePermission | null = null
  const upgrade = (p: NodePermission) => {
    if (best === null || LEVELS[p] > LEVELS[best]) best = p
  }

  if (node.ownerUserId === userId) upgrade('admin')

  const memberships = await OrgMember.query().where('user_id', userId)

  if (node.ownerOrgId) {
    const m = memberships.find((om) => om.orgId === node.ownerOrgId)
    if (m) upgrade(m.role === 'member' ? 'connect' : 'admin')
  }

  const orgIds = memberships.map((om) => om.orgId)
  const grants = await NodeMember.query()
    .where('node_id', node.id)
    .where((q) => {
      q.where('user_id', userId)
      if (orgIds.length > 0) q.orWhereIn('org_id', orgIds)
    })
  for (const g of grants) upgrade(g.permission)

  return best
}

// Fetch a node only if the user holds at least `required` on it.
// Returns null both for missing nodes and missing permission, so controllers
// answer 404 without leaking the node's existence.
export async function findNodeWithPermission(
  userId: string,
  nodeId: string,
  required: NodePermission
): Promise<Node | null> {
  const node = await Node.query().where('id', nodeId).whereNull('deleted_at').first()
  if (!node) return null
  const granted = await resolveNodePermission(userId, node)
  return hasPermission(granted, required) ? node : null
}
