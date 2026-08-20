import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import Node from '#models/node'
import NodeMember from '#models/node_member'
import User from '#models/user'
import Organization from '#models/organization'
import { canShareNode, resolveNodePermission } from '#services/permissions'
import { resolveOrgRole } from '#services/organizations'

const uuid = () =>
  vine.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)

const permission = vine.enum(['read', 'connect', 'manage', 'admin'] as const)

const shareValidator = vine.compile(
  vine.object({
    email: vine.string().trim().email().maxLength(255).optional(),
    orgId: uuid().optional(),
    permission,
  })
)

const updateShareValidator = vine.compile(vine.object({ permission }))

/*
| Per-node sharing: node_members was migrated and read by resolveNodePermission
| from the start, but nothing could write to it — which made 'read' and 'manage'
| unreachable in practice, and left the share modal a mock.
|
| A grant targets a person or a whole organisation, never both (enforced by a
| check constraint in the schema).
*/
export default class NodeMembersController {
  async #nodeIfShareable(userId: string, nodeId: string): Promise<Node | null> {
    const node = await Node.query().where('id', nodeId).whereNull('deleted_at').first()
    if (!node) return null
    return (await canShareNode(userId, node)) ? node : null
  }

  #serialize(m: NodeMember) {
    return {
      id: m.id,
      permission: m.permission,
      grantedAt: m.grantedAt?.toISO() ?? null,
      user: m.user ? { id: m.user.id, name: m.user.name, email: m.user.email } : null,
      org: m.org ? { id: m.org.id, name: m.org.name } : null,
    }
  }

  // GET /nodes/:id/members — anyone who can read the node may see who else has it
  async index({ auth, params, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const node = await Node.query().where('id', params.id).whereNull('deleted_at').first()
    if (!node || (await resolveNodePermission(user.id, node)) === null) {
      return response.notFound({ message: 'Node introuvable' })
    }

    const grants = await NodeMember.query()
      .where('node_id', node.id)
      .preload('user')
      .preload('org')

    return {
      data: grants.map((m) => this.#serialize(m)),
      canShare: await canShareNode(user.id, node),
    }
  }

  // POST /nodes/:id/members
  async store({ auth, params, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const node = await this.#nodeIfShareable(user.id, params.id)
    if (!node) return response.notFound({ message: 'Node introuvable' })

    const payload = await request.validateUsing(shareValidator)
    if (!payload.email === !payload.orgId) {
      return response.badRequest({ message: 'Indiquez soit un email, soit une organisation' })
    }

    if (payload.orgId) {
      // You cannot lend a node to a team you are not part of.
      if (!(await resolveOrgRole(user.id, payload.orgId))) {
        return response.forbidden({ message: "Vous n'appartenez pas à cette organisation" })
      }
      const org = await Organization.query()
        .where('id', payload.orgId)
        .whereNull('deleted_at')
        .first()
      if (!org) return response.notFound({ message: 'Organisation introuvable' })
      if (org.id === node.ownerOrgId) {
        return response.conflict({ message: 'Ce noeud appartient déjà à cette organisation' })
      }

      const grant = await NodeMember.updateOrCreate(
        { nodeId: node.id, orgId: org.id },
        { permission: payload.permission, grantedBy: user.id }
      )
      await grant.load('org')
      return response.created({ member: this.#serialize(grant) })
    }

    const target = await User.query()
      .whereRaw('lower(email) = ?', [payload.email!.toLowerCase()])
      .whereNull('deleted_at')
      .first()

    // No silent invitation here: an unknown address would create a grant that
    // never resolves to anyone. The caller is told to have them register.
    if (!target) return response.notFound({ message: 'Aucun compte avec cette adresse' })
    if (target.id === node.ownerUserId) {
      return response.conflict({ message: 'Cette personne possède déjà ce noeud' })
    }

    const grant = await NodeMember.updateOrCreate(
      { nodeId: node.id, userId: target.id },
      { permission: payload.permission, grantedBy: user.id }
    )
    await grant.load('user')
    return response.created({ member: this.#serialize(grant) })
  }

  // PATCH /nodes/:id/members/:memberId
  async update({ auth, params, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const node = await this.#nodeIfShareable(user.id, params.id)
    if (!node) return response.notFound({ message: 'Node introuvable' })

    const grant = await NodeMember.query()
      .where('id', params.memberId)
      .where('node_id', node.id)
      .first()
    if (!grant) return response.notFound({ message: 'Partage introuvable' })

    const { permission: next } = await request.validateUsing(updateShareValidator)
    grant.permission = next
    await grant.save()

    await grant.load('user')
    await grant.load('org')
    return { member: this.#serialize(grant) }
  }

  // DELETE /nodes/:id/members/:memberId
  async destroy({ auth, params, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const node = await this.#nodeIfShareable(user.id, params.id)
    if (!node) return response.notFound({ message: 'Node introuvable' })

    const grant = await NodeMember.query()
      .where('id', params.memberId)
      .where('node_id', node.id)
      .first()
    if (!grant) return response.notFound({ message: 'Partage introuvable' })

    await grant.delete()
    return { ok: true }
  }
}
