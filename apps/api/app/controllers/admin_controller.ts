import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import { randomBytes } from 'node:crypto'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import User from '#models/user'
import Node from '#models/node'
import { headscaleClient, tenantForOwner } from '#services/headscale_client'
import { getInstanceSettings, setRegistrationMode } from '#services/instance'

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
    isActive: vine.boolean().optional(),
    instanceRole: vine.enum(['user', 'operator'] as const).optional(),
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
      .whereNull('deleted_at')
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

    return response.created({
      user: { id: user.id, email: user.email, name: user.name },
      tempPassword,
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

    if (payload.isActive !== undefined) user.isActive = payload.isActive
    if (payload.instanceRole !== undefined) user.instanceRole = payload.instanceRole
    await user.save()

    return { user: { id: user.id, isActive: user.isActive, instanceRole: user.instanceRole } }
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

  async settings({}: HttpContext) {
    return { settings: await getInstanceSettings() }
  }

  async updateSettings({ request }: HttpContext) {
    const { registrationMode } = await request.validateUsing(settingsValidator)
    await setRegistrationMode(registrationMode)
    return { settings: await getInstanceSettings() }
  }
}
