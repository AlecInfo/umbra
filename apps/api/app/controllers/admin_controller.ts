import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import { randomBytes } from 'node:crypto'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import User from '#models/user'
import Node from '#models/node'
import { headscaleClient, tenantForOwner } from '#services/headscale_client'
import { getInstanceSettings, setRegistrationMode } from '#services/instance'
import { sendProvisionedAccount, sendPasswordReset } from '#services/mailer'

const settingsValidator = vine.compile(
  vine.object({
    registrationMode: vine.enum(['open', 'invite_only', 'closed'] as const),
  })
)

const createUserValidator = vine.compile(
  vine.object({
    email: vine.string().trim().email().maxLength(255),
    name: vine.string().trim().maxLength(100).optional(),
  })
)

const updateUserValidator = vine.compile(
  vine.object({
    name: vine.string().trim().maxLength(100).nullable().optional(),
    email: vine.string().trim().email().maxLength(255).optional(),
    isActive: vine.boolean().optional(),
    instanceRole: vine.enum(['user', 'operator'] as const).optional(),
  })
)

const addOrgMemberValidator = vine.compile(
  vine.object({
    email: vine.string().trim().email().maxLength(255),
    role: vine.enum(['owner', 'admin', 'member'] as const),
  })
)

const orgMemberRoleValidator = vine.compile(
  vine.object({ role: vine.enum(['owner', 'admin', 'member'] as const) })
)

const updateOrgValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(1).maxLength(100),
  })
)

/*
| Instance administration. Guarded by middleware.operator().
|
| Everything here is deliberately outside the node permission system: an
| operator never gains 'connect' on anyone's machine. Node deletion lives here
| as its own path rather than reusing the tenant-scoped endpoint, so that
| operational power cannot turn into network access by loosening a check.
*/
export default class AdminController {
  async overview({}: HttpContext) {
    const [users] = await db.from('users').whereNull('deleted_at').count('* as total')
    const [operators] = await db
      .from('users')
      .whereNull('deleted_at')
      .where('instance_role', 'operator')
      .count('* as total')
    const [orgs] = await db.from('organizations').whereNull('deleted_at').count('* as total')
    const [nodes] = await db.from('nodes').whereNull('deleted_at').count('* as total')
    const [online] = await db
      .from('nodes')
      .whereNull('deleted_at')
      .whereIn('status', ['online', 'warning'])
      .count('* as total')

    return {
      users: Number(users.total),
      operators: Number(operators.total),
      organizations: Number(orgs.total),
      nodes: Number(nodes.total),
      nodesOnline: Number(online.total),
      settings: await getInstanceSettings(),
    }
  }

  async users({}: HttpContext) {
    const rows = await db
      .from('users')
      // Qualified: nodes has a deleted_at too, and the join makes a bare
      // column reference ambiguous.
      .whereNull('users.deleted_at')
      .leftJoin('nodes', (join) =>
        join.on('nodes.owner_user_id', '=', 'users.id').andOnNull('nodes.deleted_at')
      )
      .groupBy('users.id')
      .select(
        'users.id',
        'users.email',
        'users.name',
        'users.is_active',
        'users.instance_role',
        'users.must_change_password',
        'users.created_at'
      )
      .count('nodes.id as node_count')
      .orderBy('users.created_at', 'asc')

    return {
      data: rows.map((r: any) => ({
        id: r.id,
        email: r.email,
        name: r.name,
        isActive: r.is_active,
        instanceRole: r.instance_role,
        mustChangePassword: r.must_change_password,
        nodeCount: Number(r.node_count),
        createdAt: r.created_at,
      })),
    }
  }

  // POST /admin/users — provision an account with a temporary password
  async createUser({ auth, request, response }: HttpContext) {
    const payload = await request.validateUsing(createUserValidator)
    const email = payload.email.toLowerCase()

    if (await User.query().whereRaw('lower(email) = ?', [email]).first()) {
      return response.conflict({ message: 'Un compte existe déjà avec cet email' })
    }

    // Shown once, to be handed over out of band. The holder cannot use the
    // account for anything until they replace it.
    const tempPassword = randomBytes(9).toString('base64url')

    const user = await User.create({
      email,
      passwordHash: tempPassword,
      name: payload.name ?? null,
      emailVerified: false,
      isActive: true,
      instanceRole: 'user',
      mustChangePassword: true,
    })

    const emailed = await sendProvisionedAccount(user.email, tempPassword)

    return response.created({
      user: { id: user.id, email: user.email, name: user.name },
      emailed,
      tempPassword: emailed ? null : tempPassword,
      createdBy: auth.getUserOrFail().email,
    })
  }

  async updateUser({ auth, params, request, response }: HttpContext) {
    const me = auth.getUserOrFail()
    const user = await User.query().where('id', params.id).whereNull('deleted_at').first()
    if (!user) return response.notFound({ message: 'Compte introuvable' })

    const payload = await request.validateUsing(updateUserValidator)

    // Locking yourself out, or removing the last operator, leaves an instance
    // nobody can administer.
    if (user.id === me.id && payload.isActive === false) {
      return response.conflict({ message: 'Vous ne pouvez pas désactiver votre propre compte' })
    }
    if (user.instanceRole === 'operator' && payload.instanceRole === 'user') {
      const [{ total }] = await db
        .from('users')
        .whereNull('deleted_at')
        .where('instance_role', 'operator')
        .count('* as total')
      if (Number(total) <= 1) {
        return response.conflict({ message: "L'instance doit garder au moins un opérateur" })
      }
    }

    if (payload.email !== undefined && payload.email.toLowerCase() !== user.email.toLowerCase()) {
      const taken = await User.query()
        .whereRaw('lower(email) = ?', [payload.email.toLowerCase()])
        .whereNot('id', user.id)
        .first()
      if (taken) return response.conflict({ message: 'Un compte existe déjà avec cet email' })
      user.email = payload.email.toLowerCase()
    }
    if (payload.name !== undefined) user.name = payload.name
    if (payload.isActive !== undefined) user.isActive = payload.isActive
    if (payload.instanceRole !== undefined) user.instanceRole = payload.instanceRole
    await user.save()

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isActive: user.isActive,
        instanceRole: user.instanceRole,
      },
    }
  }

  async deleteUser({ auth, params, response }: HttpContext) {
    const me = auth.getUserOrFail()
    if (params.id === me.id) {
      return response.conflict({ message: 'Utilisez la suppression de compte pour vous-même' })
    }

    const user = await User.query().where('id', params.id).whereNull('deleted_at').first()
    if (!user) return response.notFound({ message: 'Compte introuvable' })

    // Network-level revocation first, so a failure leaves the account intact
    // and retryable rather than orphaning its nodes in the mesh.
    if (headscaleClient.isConfigured) {
      try {
        await headscaleClient.deleteTenant(tenantForOwner(user.id, null))
      } catch (err) {
        console.error(`Deleting the Headscale tenant of user ${user.id} failed:`, err)
      }
    }

    await Node.query().where('owner_user_id', user.id).update({ deletedAt: DateTime.now().toSQL() })
    user.deletedAt = DateTime.now()
    user.isActive = false
    await user.save()

    return { ok: true }
  }

  // GET /admin/orgs — every organisation on the instance, with its members
  //
  // An operator administers the deployment, so they see the whole picture:
  // who runs which team, how many nodes it holds. Still no node permission —
  // seeing that an org owns four nodes is not being able to connect to them.
  async orgs({}: HttpContext) {
    const orgs = await db
      .from('organizations')
      .whereNull('deleted_at')
      .select('id', 'name', 'slug', 'plan', 'created_at')
      .orderBy('created_at', 'asc')

    if (orgs.length === 0) return { data: [] }

    const ids = orgs.map((o: any) => o.id)

    const members = await db
      .from('org_members')
      .whereIn('org_members.org_id', ids)
      .join('users', 'users.id', '=', 'org_members.user_id')
      .select('org_members.org_id', 'org_members.role', 'users.id as user_id', 'users.email', 'users.name')

    const nodeCounts = await db
      .from('nodes')
      .whereIn('owner_org_id', ids)
      .whereNull('deleted_at')
      .groupBy('owner_org_id')
      .select('owner_org_id')
      .count('* as total')

    const countByOrg = new Map(nodeCounts.map((r: any) => [r.owner_org_id, Number(r.total)]))

    return {
      data: orgs.map((o: any) => ({
        id: o.id,
        name: o.name,
        slug: o.slug,
        plan: o.plan,
        createdAt: o.created_at,
        nodeCount: countByOrg.get(o.id) ?? 0,
        members: members
          .filter((m: any) => m.org_id === o.id)
          .map((m: any) => ({ userId: m.user_id, email: m.email, name: m.name, role: m.role })),
      })),
    }
  }

  // POST /admin/users/:id/reset-password — hand out a fresh temporary one
  //
  // Same contract as provisioning: shown once, and the account is unusable
  // until the holder replaces it. An operator resetting a password must not be
  // able to then walk into the account unnoticed, which is why the flag goes
  // back up rather than the operator choosing the password themselves.
  async resetPassword({ params, response }: HttpContext) {
    const user = await User.query().where('id', params.id).whereNull('deleted_at').first()
    if (!user) return response.notFound({ message: 'Compte introuvable' })

    const tempPassword = randomBytes(9).toString('base64url')
    user.passwordHash = tempPassword
    user.mustChangePassword = true
    await user.save()

    // Existing sessions are cut: a reset exists to lock someone out of an
    // account, so leaving their tokens alive would defeat it.
    await db.from('auth_access_tokens').where('tokenable_id', user.id).delete()

    const emailed = await sendPasswordReset(user.email, tempPassword)

    return { emailed, tempPassword: emailed ? null : tempPassword, user: { id: user.id, email: user.email } }
  }

  // POST /admin/orgs/:id/members — put an existing account into a team
  //
  // No invitation round trip: an operator acting administratively is not
  // asking the person's permission, they are fixing the deployment. The
  // account must already exist, so this cannot create a membership pointing at
  // nobody.
  async addOrgMember({ params, request, response }: HttpContext) {
    const org = await db.from('organizations').where('id', params.id).whereNull('deleted_at').first()
    if (!org) return response.notFound({ message: 'Organisation introuvable' })

    const { email, role } = await request.validateUsing(addOrgMemberValidator)
    const user = await User.query()
      .whereRaw('lower(email) = ?', [email.toLowerCase()])
      .whereNull('deleted_at')
      .first()
    if (!user) return response.notFound({ message: 'Aucun compte avec cette adresse' })

    const existing = await db
      .from('org_members')
      .where('org_id', org.id)
      .where('user_id', user.id)
      .first()
    if (existing) return response.conflict({ message: 'Cette personne est déjà membre' })

    await db.table('org_members').insert({ org_id: org.id, user_id: user.id, role })

    return response.created({
      member: { userId: user.id, email: user.email, name: user.name, role },
    })
  }

  // DELETE /admin/orgs/:id/members/:userId
  async removeOrgMember({ params, response }: HttpContext) {
    const membership = await db
      .from('org_members')
      .where('org_id', params.id)
      .where('user_id', params.userId)
      .first()
    if (!membership) return response.notFound({ message: 'Membre introuvable' })

    if (membership.role === 'owner') {
      const [{ total }] = await db
        .from('org_members')
        .where('org_id', params.id)
        .where('role', 'owner')
        .count('* as total')
      if (Number(total) <= 1) {
        return response.conflict({ message: "L'organisation doit garder au moins un propriétaire" })
      }
    }

    await db.from('org_members').where('org_id', params.id).where('user_id', params.userId).delete()
    return { ok: true }
  }

  // PATCH /admin/orgs/:id/members/:userId — change a member's role
  //
  // The last owner is protected here as it is in the org's own endpoint: an
  // org with no owner is one nobody can administer or dissolve.
  async updateOrgMember({ params, request, response }: HttpContext) {
    const membership = await db
      .from('org_members')
      .where('org_id', params.id)
      .where('user_id', params.userId)
      .first()
    if (!membership) return response.notFound({ message: 'Membre introuvable' })

    const { role } = await request.validateUsing(orgMemberRoleValidator)

    if (membership.role === 'owner' && role !== 'owner') {
      const [{ total }] = await db
        .from('org_members')
        .where('org_id', params.id)
        .where('role', 'owner')
        .count('* as total')
      if (Number(total) <= 1) {
        return response.conflict({ message: "L'organisation doit garder au moins un propriétaire" })
      }
    }

    await db
      .from('org_members')
      .where('org_id', params.id)
      .where('user_id', params.userId)
      .update({ role })

    return { member: { userId: params.userId, role } }
  }

  // PATCH /admin/orgs/:id — rename a team. Membership stays the org's own
  // business; an operator administers the deployment, not who is in whose team.
  async updateOrg({ params, request, response }: HttpContext) {
    const org = await db.from('organizations').where('id', params.id).whereNull('deleted_at').first()
    if (!org) return response.notFound({ message: 'Organisation introuvable' })

    const { name } = await request.validateUsing(updateOrgValidator)
    await db.from('organizations').where('id', org.id).update({ name, updated_at: new Date() })

    return { org: { id: org.id, name } }
  }

  // DELETE /admin/orgs/:id — dissolve a team. Its nodes go back to nobody, so
  // the caller has to deal with them first, exactly as the owner would.
  async deleteOrg({ params, response }: HttpContext) {
    const org = await db.from('organizations').where('id', params.id).whereNull('deleted_at').first()
    if (!org) return response.notFound({ message: 'Organisation introuvable' })

    const [{ total }] = await db
      .from('nodes')
      .where('owner_org_id', org.id)
      .whereNull('deleted_at')
      .count('* as total')
    if (Number(total) > 0) {
      return response.conflict({
        message: `L'organisation possède encore ${total} noeud(s)`,
        nodeCount: Number(total),
      })
    }

    if (headscaleClient.isConfigured) {
      try {
        await headscaleClient.deleteTenant(tenantForOwner(null, org.id))
      } catch (err) {
        console.error(`Deleting the Headscale tenant of org ${org.id} failed:`, err)
      }
    }

    await db.from('org_members').where('org_id', org.id).delete()
    await db.from('organizations').where('id', org.id).update({ deleted_at: new Date() })
    return { ok: true }
  }

  async settings({}: HttpContext) {
    return { settings: await getInstanceSettings() }
  }

  async updateSettings({ request }: HttpContext) {
    const { registrationMode } = await request.validateUsing(settingsValidator)
    await setRegistrationMode(registrationMode)
    return { settings: await getInstanceSettings() }
  }
}
