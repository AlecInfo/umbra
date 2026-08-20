import type { HttpContext } from '@adonisjs/core/http'
import hash from '@adonisjs/core/services/hash'
import { DateTime } from 'luxon'
import User from '#models/user'
import Invitation from '#models/invitation'
import { getInstanceSettings, isFirstAccount } from '#services/instance'
import AuditLog from '#models/audit_log'
import { headscaleClient, tenantForOwner } from '#services/headscale_client'
import {
  registerValidator,
  loginValidator,
  updateProfileValidator,
  changePasswordValidator,
} from '#validators/auth'

export default class AuthController {
  async register({ request, response }: HttpContext) {
    const payload = await request.validateUsing(registerValidator)

    const existing = await User.findBy('email', payload.email)
    if (existing) {
      return response.conflict({ message: 'Un compte existe déjà avec cet email' })
    }

    // The first account always gets in and becomes the operator: a fresh
    // install with registration closed would otherwise lock out the very
    // person who just deployed it.
    const first = await isFirstAccount()
    if (!first) {
      const { registrationMode } = await getInstanceSettings()

      if (registrationMode === 'closed') {
        return response.forbidden({
          message: 'Les inscriptions sont fermées sur cette instance',
        })
      }

      if (registrationMode === 'invite_only') {
        const invited = await Invitation.query()
          .whereRaw('lower(email) = ?', [payload.email.toLowerCase()])
          .whereNull('accepted_at')
          .where('expires_at', '>', DateTime.now().toSQL())
          .first()
        if (!invited) {
          return response.forbidden({
            message: 'Cette instance est sur invitation uniquement',
          })
        }
      }
    }

    const user = await User.create({
      email: payload.email,
      passwordHash: payload.password,
      name: payload.name ?? null,
      emailVerified: false,
      isActive: true,
      instanceRole: first ? 'operator' : 'user',
    })

    const token = await User.accessTokens.create(user, ['*'], {
      name: 'register',
      expiresIn: '30 days',
    })

    return response.created({
      user: user.serialize(),
      token: {
        type: token.type,
        value: token.value!.release(),
        expiresAt: token.expiresAt,
      },
    })
  }

  async login({ request, response }: HttpContext) {
    const { email, password } = await request.validateUsing(loginValidator)

    const user = await User.verifyCredentials(email, password)
    if (!user.isActive) {
      return response.forbidden({ message: 'Ce compte est désactivé' })
    }

    const token = await User.accessTokens.create(user, ['*'], {
      name: request.header('user-agent')?.slice(0, 100) ?? 'login',
      expiresIn: '30 days',
    })

    await AuditLog.create({
      performedBy: user.id,
      orgId:       null,
      resourceType: 'auth',
      resourceId:   user.id,
      action:       'login',
      oldValue:     null,
      newValue:     null,
      ipAddress:    request.ip(),
      userAgent:    request.header('user-agent')?.slice(0, 200) ?? null,
    })

    return {
      user: user.serialize(),
      // The dashboard forces a change before letting them do anything else.
      mustChangePassword: user.mustChangePassword,
      token: {
        type: token.type,
        value: token.value!.release(),
        expiresAt: token.expiresAt,
      },
    }
  }

  async logout({ auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const token = user.currentAccessToken
    await AuditLog.create({
      performedBy:  user.id,
      orgId:        null,
      resourceType: 'auth',
      resourceId:   user.id,
      action:       'logout',
      oldValue:     null,
      newValue:     null,
      ipAddress:    request.ip(),
      userAgent:    request.header('user-agent')?.slice(0, 200) ?? null,
    })
    if (token) {
      await User.accessTokens.delete(user, token.identifier)
    }
    return response.noContent()
  }

  async me({ auth }: HttpContext) {
    const user = auth.getUserOrFail()
    return { user: user.serialize(), mustChangePassword: user.mustChangePassword }
  }

  async updateProfile({ auth, request }: HttpContext) {
    const user = auth.getUserOrFail()
    const payload = await request.validateUsing(updateProfileValidator)

    user.merge(payload)
    await user.save()

    return { user: user.serialize() }
  }

  async changePassword({ auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const { currentPassword, newPassword } = await request.validateUsing(changePasswordValidator)

    if (!user.passwordHash) {
      return response.badRequest({ message: 'Aucun mot de passe défini sur ce compte' })
    }

    const valid = await hash.use('scrypt').verify(user.passwordHash, currentPassword)
    if (!valid) {
      return response.unauthorized({ message: 'Mot de passe actuel incorrect' })
    }

    user.passwordHash = newPassword
    // Whatever brought them here, the temporary password is now gone.
    user.mustChangePassword = false
    await user.save()

    return response.noContent()
  }

  async sessions({ auth }: HttpContext) {
    const user = auth.getUserOrFail()
    const tokens = await User.accessTokens.all(user)
    return {
      tokens: tokens.map((t) => ({
        id: t.identifier,
        name: t.name,
        createdAt: t.createdAt,
        lastUsedAt: t.lastUsedAt,
        expiresAt: t.expiresAt,
        isCurrent: t.identifier === user.currentAccessToken?.identifier,
      })),
    }
  }

  async revokeSession({ auth, params, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const count = await User.accessTokens.delete(user, params.id)
    if (!count) {
      return response.notFound({ message: 'Session introuvable' })
    }
    return response.noContent()
  }

  async loginLogs({ auth }: HttpContext) {
    const user = auth.getUserOrFail()
    const logs = await AuditLog.query()
      .where('performedBy', user.id)
      .where('resourceType', 'auth')
      .whereIn('action', ['login', 'logout'])
      .orderBy('createdAt', 'desc')
      .limit(50)
    return {
      data: logs.map((l) => ({
        id:         l.id,
        action:     l.action,
        ipAddress:  l.ipAddress,
        userAgent:  l.userAgent,
        createdAt:  l.createdAt.toISO(),
      })),
    }
  }

  async deleteAccount({ auth, response }: HttpContext) {
    const user   = auth.getUserOrFail()
    const tokens = await User.accessTokens.all(user)
    await Promise.all(tokens.map((t) => User.accessTokens.delete(user, t.identifier)))
    user.isActive = false
    await user.save()

    // Revoke the whole personal tenant at the network level: every machine
    // (nodes and VPN clients) enrolled under this account leaves the mesh.
    if (headscaleClient.isConfigured) {
      try {
        await headscaleClient.deleteTenant(tenantForOwner(user.id, null))
        await headscaleClient.syncPolicy()
      } catch (err) {
        console.error(`Headscale tenant cleanup failed for user ${user.id}:`, err)
      }
    }

    return response.noContent()
  }
}
