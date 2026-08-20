import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import { randomBytes, createHash } from 'node:crypto'
import db from '@adonisjs/lucid/services/db'
import Organization from '#models/organization'
import OrgMember from '#models/org_member'
import Invitation from '#models/invitation'
import User from '#models/user'
import Node from '#models/node'
import { headscaleClient, tenantForOwner } from '#services/headscale_client'
import { requireOrgRole, resolveOrgRole, isLastOwner } from '#services/organizations'
import {
  createOrgValidator,
  updateOrgValidator,
  inviteValidator,
  updateMemberValidator,
  acceptInviteValidator,
} from '#validators/organization'

const INVITE_TTL_DAYS = 7

function slugify(name: string): string {
  return (
    name
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'org'
  )
}

function hashInviteToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

function serializeMember(m: OrgMember) {
  return {
    userId: m.userId,
    name: m.user?.name ?? null,
    email: m.user?.email ?? null,
    role: m.role,
    joinedAt: m.joinedAt?.toISO() ?? null,
  }
}

export default class OrganizationsController {
  // GET /orgs — the orgs the caller belongs to, with their own role
  async index({ auth }: HttpContext) {
    const user = auth.getUserOrFail()
    const memberships = await OrgMember.query()
      .where('user_id', user.id)
      .preload('organization')

    const live = memberships.filter((m) => m.organization && !m.organization.deletedAt)
    const counts = await this.#memberCounts(live.map((m) => m.orgId))

    return {
      data: live.map((m) => ({
        id: m.orgId,
        name: m.organization.name,
        slug: m.organization.slug,
        plan: m.organization.plan,
        role: m.role,
        memberCount: counts.get(m.orgId) ?? 1,
      })),
    }
  }

  async #memberCounts(orgIds: string[]): Promise<Map<string, number>> {
    if (orgIds.length === 0) return new Map()
    const rows = await db
      .from('org_members')
      .whereIn('org_id', orgIds)
      .groupBy('org_id')
      .select('org_id')
      .count('* as total')
    return new Map(rows.map((r: any) => [r.org_id, Number(r.total)]))
  }

  // POST /orgs — the creator becomes owner
  async store({ auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const { name } = await request.validateUsing(createOrgValidator)

    // The slug is unique across the install, so disambiguate rather than
    // failing on a name someone else already took.
    const base = slugify(name)
    let slug = base
    for (let i = 2; await Organization.findBy('slug', slug); i++) {
      slug = `${base}-${i}`
    }

    const org = await Organization.create({ name, slug, plan: 'starter' })
    await OrgMember.create({ orgId: org.id, userId: user.id, role: 'owner' })

    // The org gets its own Headscale tenant, isolated from every other one.
    if (headscaleClient.isConfigured) {
      try {
        await headscaleClient.ensureUser(tenantForOwner(null, org.id))
        await headscaleClient.syncPolicy()
      } catch (err) {
        console.error(`Creating the Headscale tenant of org ${org.id} failed:`, err)
      }
    }

    return response.created({
      org: { id: org.id, name: org.name, slug: org.slug, plan: org.plan, role: 'owner', memberCount: 1 },
    })
  }

  // GET /orgs/:id — any member may look
  async show({ auth, params, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const role = await requireOrgRole(user.id, params.id, 'member')
    if (!role) return response.notFound({ message: 'Organisation introuvable' })

    const org = await Organization.query().where('id', params.id).whereNull('deleted_at').first()
    if (!org) return response.notFound({ message: 'Organisation introuvable' })

    const members = await OrgMember.query().where('org_id', org.id).preload('user')
    const nodeCount = await Node.query()
      .where('owner_org_id', org.id)
      .whereNull('deleted_at')
      .count('* as total')

    return {
      org: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        plan: org.plan,
        role,
        memberCount: members.length,
        nodeCount: Number(nodeCount[0].$extras.total),
      },
      members: members.map(serializeMember),
    }
  }

  // PATCH /orgs/:id
  async update({ auth, params, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    if (!(await requireOrgRole(user.id, params.id, 'admin'))) {
      return response.notFound({ message: 'Organisation introuvable' })
    }

    const org = await Organization.query().where('id', params.id).whereNull('deleted_at').first()
    if (!org) return response.notFound({ message: 'Organisation introuvable' })

    const payload = await request.validateUsing(updateOrgValidator)
    if (payload.name) org.name = payload.name
    await org.save()

    return { org: { id: org.id, name: org.name, slug: org.slug, plan: org.plan } }
  }

  // DELETE /orgs/:id — owner only
  async destroy({ auth, params, response }: HttpContext) {
    const user = auth.getUserOrFail()
    if (!(await requireOrgRole(user.id, params.id, 'owner'))) {
      return response.notFound({ message: 'Organisation introuvable' })
    }

    const org = await Organization.query().where('id', params.id).whereNull('deleted_at').first()
    if (!org) return response.notFound({ message: 'Organisation introuvable' })

    const nodes = await Node.query().where('owner_org_id', org.id).whereNull('deleted_at')
    if (nodes.length > 0) {
      // Deleting the tenant would strand these at the network level while they
      // still look alive in the dashboard. Make the caller deal with them.
      return response.conflict({
        message: `L'organisation possède encore ${nodes.length} noeud(s)`,
        nodeCount: nodes.length,
      })
    }

    // Network-level revocation first: if it fails, the org stays and can be retried.
    if (headscaleClient.isConfigured) {
      try {
        await headscaleClient.deleteTenant(tenantForOwner(null, org.id))
      } catch (err) {
        console.error(`Deleting the Headscale tenant of org ${org.id} failed:`, err)
      }
    }

    org.deletedAt = DateTime.now()
    await org.save()
    await OrgMember.query().where('org_id', org.id).delete()

    return { ok: true }
  }

  // GET /orgs/:id/members
  async members({ auth, params, response }: HttpContext) {
    const user = auth.getUserOrFail()
    if (!(await requireOrgRole(user.id, params.id, 'member'))) {
      return response.notFound({ message: 'Organisation introuvable' })
    }
    const members = await OrgMember.query().where('org_id', params.id).preload('user')
    return { data: members.map(serializeMember) }
  }

  // PATCH /orgs/:id/members/:userId — admin+, and never on the last owner
  async updateMember({ auth, params, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const callerRole = await requireOrgRole(user.id, params.id, 'admin')
    if (!callerRole) return response.notFound({ message: 'Organisation introuvable' })

    const target = await OrgMember.query()
      .where('org_id', params.id)
      .where('user_id', params.userId)
      .first()
    if (!target) return response.notFound({ message: 'Membre introuvable' })

    // Only an owner may change another owner's role.
    if (target.role === 'owner' && callerRole !== 'owner') {
      return response.forbidden({ message: 'Seul un propriétaire peut modifier un propriétaire' })
    }
    if (await isLastOwner(params.id, params.userId)) {
      return response.conflict({ message: "L'organisation doit garder au moins un propriétaire" })
    }

    const { role } = await request.validateUsing(updateMemberValidator)
    target.role = role
    await target.save()

    await target.load('user')
    return { member: serializeMember(target) }
  }

  // DELETE /orgs/:id/members/:userId — admin+, or a member removing themselves
  async removeMember({ auth, params, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const isSelf = params.userId === user.id
    const callerRole = await requireOrgRole(user.id, params.id, isSelf ? 'member' : 'admin')
    if (!callerRole) return response.notFound({ message: 'Organisation introuvable' })

    const target = await OrgMember.query()
      .where('org_id', params.id)
      .where('user_id', params.userId)
      .first()
    if (!target) return response.notFound({ message: 'Membre introuvable' })

    if (target.role === 'owner' && callerRole !== 'owner' && !isSelf) {
      return response.forbidden({ message: 'Seul un propriétaire peut retirer un propriétaire' })
    }
    if (await isLastOwner(params.id, params.userId)) {
      return response.conflict({ message: "L'organisation doit garder au moins un propriétaire" })
    }

    await target.delete()
    return { ok: true }
  }

  // POST /orgs/:id/invitations — admin+
  async invite({ auth, params, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    if (!(await requireOrgRole(user.id, params.id, 'admin'))) {
      return response.notFound({ message: 'Organisation introuvable' })
    }

    const { email, role } = await request.validateUsing(inviteValidator)
    const normalized = email.toLowerCase()

    const existing = await User.findBy('email', normalized)
    if (existing && (await resolveOrgRole(existing.id, params.id))) {
      return response.conflict({ message: 'Cette personne est déjà membre' })
    }

    // Re-inviting replaces the pending invitation rather than stacking tokens.
    await Invitation.query()
      .where('org_id', params.id)
      .where('email', normalized)
      .whereNull('accepted_at')
      .delete()

    const token = `umbra_invite_${randomBytes(24).toString('hex')}`
    const invitation = await Invitation.create({
      invitedBy: user.id,
      orgId: params.id,
      nodeId: null,
      email: normalized,
      role: role ?? 'member',
      permission: null,
      tokenHash: hashInviteToken(token),
      expiresAt: DateTime.now().plus({ days: INVITE_TTL_DAYS }),
    })

    // Mail is not wired up yet, so the token goes back to the caller to pass
    // along. It is only ever returned here, at creation.
    return response.created({
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt.toISO(),
      },
      token,
    })
  }

  // GET /orgs/:id/invitations — pending ones, admin+
  async invitations({ auth, params, response }: HttpContext) {
    const user = auth.getUserOrFail()
    if (!(await requireOrgRole(user.id, params.id, 'admin'))) {
      return response.notFound({ message: 'Organisation introuvable' })
    }

    const pending = await Invitation.query()
      .where('org_id', params.id)
      .whereNull('accepted_at')
      .where('expires_at', '>', DateTime.now().toSQL())
      .preload('inviter')

    return {
      data: pending.map((i) => ({
        id: i.id,
        email: i.email,
        role: i.role,
        invitedBy: i.inviter?.name ?? i.inviter?.email ?? null,
        expiresAt: i.expiresAt.toISO(),
      })),
    }
  }

  // DELETE /orgs/:id/invitations/:invitationId — admin+
  async revokeInvitation({ auth, params, response }: HttpContext) {
    const user = auth.getUserOrFail()
    if (!(await requireOrgRole(user.id, params.id, 'admin'))) {
      return response.notFound({ message: 'Organisation introuvable' })
    }

    const invitation = await Invitation.query()
      .where('id', params.invitationId)
      .where('org_id', params.id)
      .first()
    if (!invitation) return response.notFound({ message: 'Invitation introuvable' })

    await invitation.delete()
    return { ok: true }
  }

  // POST /orgs/invitations/accept — the invited account redeems its token
  async acceptInvitation({ auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const { token } = await request.validateUsing(acceptInviteValidator)

    const invitation = await Invitation.query()
      .where('token_hash', hashInviteToken(token))
      .whereNull('accepted_at')
      .whereNotNull('org_id')
      .first()

    if (!invitation || invitation.expiresAt < DateTime.now()) {
      return response.notFound({ message: 'Invitation invalide ou expirée' })
    }

    // The invitation names an address; anyone else holding the token is not
    // its recipient.
    if (invitation.email !== user.email.toLowerCase()) {
      return response.forbidden({ message: 'Cette invitation ne vous est pas destinée' })
    }

    const orgId = invitation.orgId!
    const already = await resolveOrgRole(user.id, orgId)
    if (!already) {
      await OrgMember.create({ orgId, userId: user.id, role: invitation.role ?? 'member' })
    }

    invitation.acceptedAt = DateTime.now()
    await invitation.save()

    const org = await Organization.find(orgId)
    return { ok: true, org: org ? { id: org.id, name: org.name, slug: org.slug } : null }
  }
}
