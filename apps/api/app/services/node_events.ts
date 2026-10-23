import NodeEvent, { type NodeEventType } from '#models/node_event'

/**
 * Record something that happened to a node.
 *
 * Best-effort on purpose: these calls sit inside the heartbeat and the offline
 * sweep, and losing one line of history is better than failing the request
 * that carries a node's metrics or its token rotation.
 */
export async function recordNodeEvent(
  nodeId: string,
  type: NodeEventType,
  options: { actorUserId?: string | null; data?: Record<string, unknown> | null } = {}
): Promise<void> {
  try {
    await NodeEvent.create({
      nodeId,
      type,
      actorUserId: options.actorUserId ?? null,
      data: options.data ?? null,
    })
  } catch (err) {
    console.error(`Recording ${type} for node ${nodeId} failed:`, err)
  }
}
