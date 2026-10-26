/*
| When each exit node's Headscale state was last confirmed good: in the right
| tenant, routes advertised and enabled.
|
| The heartbeat self-heal confirms it at most hourly; /connect used to redo the
| whole check on every click — five Headscale round-trips at ~0.6 s each on the
| Pi before the user saw anything. Now /connect trusts a recent confirmation
| and only falls back to the full check when there is none.
|
| In memory on purpose: it resets with the API, and the check it skips is
| idempotent, so the worst case is one slow connect after a restart.
*/
// A little over the heartbeat's hourly recheck, so a healthy node never lapses.
const VERIFIED_FOR_MS = 70 * 60_000

const verifiedAt = new Map<string, number>()

export function markExitRoutesVerified(nodeId: string): void {
  verifiedAt.set(nodeId, Date.now())
}

export function exitRoutesVerifiedRecently(nodeId: string): boolean {
  const at = verifiedAt.get(nodeId)
  return at !== undefined && Date.now() - at < VERIFIED_FOR_MS
}

/** Tests only: start every case from a cold cache. */
export function resetExitRoutesCache(): void {
  verifiedAt.clear()
}
