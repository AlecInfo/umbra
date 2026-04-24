import type { HttpContext } from '@adonisjs/core/http'
import hash from '@adonisjs/core/services/hash'
import User from '#models/user'
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

    const user = await User.create({
      email: payload.email,
      passwordHash: payload.password,
      name: payload.name ?? null,
      emailVerified: false,
      isActive: true,
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

    return {
      user: user.serialize(),
      token: {
        type: token.type,
        value: token.value!.release(),
        expiresAt: token.expiresAt,
      },
    }
  }

  async logout({ auth, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const token = user.currentAccessToken
    if (token) {
      await User.accessTokens.delete(user, token.identifier)
    }
    return response.noContent()
  }

  async me({ auth }: HttpContext) {
    const user = auth.getUserOrFail()
    return { user: user.serialize() }
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
}
