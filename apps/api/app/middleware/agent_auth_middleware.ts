import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { resolveAgentNode } from '#services/agent_auth'
import type Node from '#models/node'

declare module '@adonisjs/core/http' {
  interface HttpContext {
    agentNode: Node
  }
}

export default class AgentAuthMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const node = await resolveAgentNode(ctx)
    if (!node) {
      return ctx.response.unauthorized({ message: 'Agent non authentifié' })
    }
    ctx.agentNode = node
    return next()
  }
}
