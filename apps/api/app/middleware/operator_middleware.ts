import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { isOperator } from '#services/instance'

/**
 * Gate for /admin/*. Answers 404 rather than 403: a normal account has no
 * business learning that an administration surface exists here.
 */
export default class OperatorMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    if (!isOperator(ctx.auth.user)) {
      return ctx.response.notFound({ message: 'Not found' })
    }
    return next()
  }
}
