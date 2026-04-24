import { createHash } from 'node:crypto'
import { DateTime } from 'luxon'
import type { HttpContext } from '@adonisjs/core/http'
import Node from '#models/node'
import AgentToken from '#models/agent_token'

export function hashAgentToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export async function resolveAgentNode(ctx: HttpContext): Promise<Node | null> {
  const bearer = ctx.request.header('authorization', '')
  const [type, token] = bearer.split(' ')
  if (type?.toLowerCase() !== 'bearer' || !token) return null

  const tokenHash = hashAgentToken(token)
  const agentToken = await AgentToken.query()
    .where('token_hash', tokenHash)
    .whereNotNull('node_id')
    .whereNotNull('used_at')
    .where('expires_at', '>', DateTime.now().toSQL()!)
    .first()

  if (!agentToken?.nodeId) return null

  return Node.query().where('id', agentToken.nodeId).whereNull('deleted_at').first()
}
