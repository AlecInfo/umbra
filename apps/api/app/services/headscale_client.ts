import { DateTime } from 'luxon'

interface HeadscalePreAuthKey {
  user: string
  id: string
  key: string
  reusable: boolean
  ephemeral: boolean
  used: boolean
  expiration: string
  createdAt: string
}

interface HeadscaleRoute {
  id: string
  prefix: string
  advertised: boolean
  enabled: boolean
  isPrimary: boolean
}

export interface HeadscaleNode {
  id: string
  name: string
  givenName?: string
  nodeKey?: string
  ipAddresses: string[]
  user: { name: string }
  lastSeen?: string
  online?: boolean
  // Reported for nodes registered with an auth key: how a session gets tied to
  // the exact machine that redeemed the key we issued (see connection_traffic).
  preAuthKey?: { key: string; id: string } | null
}

// Headscale user (= network tenant) for a node/resource owner.
// One user per UMBRA account or organization: combined with the generated
// self-only ACL policy (see syncPolicy), tenants cannot see or reach each
// other's nodes at the network level.
export function tenantForOwner(ownerUserId: string | null, ownerOrgId: string | null): string {
  return ownerOrgId ? `o-${ownerOrgId}` : `u-${ownerUserId}`
}

class HeadscaleClient {
  #url: string
  #apiKey: string

  constructor() {
    this.#url = process.env.HEADSCALE_URL ?? 'http://localhost:8080'
    this.#apiKey = process.env.HEADSCALE_API_KEY ?? ''
  }

  get isConfigured() {
    return this.#apiKey !== ''
  }

  async #fetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(`${this.#url}/api/v1${path}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.#apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`Headscale API ${res.status}: ${body}`)
    }
    return res.json() as Promise<T>
  }

  async ensureUser(name: string): Promise<void> {
    try {
      await this.#fetch(`/user/${name}`)
    } catch {
      await this.#fetch('/user', {
        method: 'POST',
        body: JSON.stringify({ name }),
      })
    }
  }

  async createPreAuthKey(user: string): Promise<string> {
    const expiration = DateTime.now().plus({ days: 90 }).toISO()
    const data = await this.#fetch<{ preAuthKey: HeadscalePreAuthKey }>('/preauthkey', {
      method: 'POST',
      body: JSON.stringify({ user, reusable: false, ephemeral: false, expiration }),
    })
    return data.preAuthKey.key
  }

  async listPreAuthKeys(user: string): Promise<HeadscalePreAuthKey[]> {
    const data = await this.#fetch<{ preAuthKeys: HeadscalePreAuthKey[] }>(
      `/preauthkey?user=${encodeURIComponent(user)}`
    )
    return data.preAuthKeys ?? []
  }

  async expirePreAuthKey(user: string, key: string): Promise<void> {
    await this.#fetch('/preauthkey/expire', {
      method: 'POST',
      body: JSON.stringify({ user, key }),
    })
  }

  /**
   * A pre-auth key the client can use, without minting a new one every time.
   *
   * Keys are single-use and valid for 90 days, and /connect used to create one
   * on every click. A user who opens the connect dialog and never runs the
   * command leaves a live key behind — they piled up indefinitely, each one a
   * standing invitation to join the tenant.
   *
   * So: reuse the tenant's newest unredeemed key when it still has comfortable
   * life left, and expire the stale ones. Keys younger than an hour are left
   * alone — an enrollment could be in flight with one of them.
   */
  async getOrCreatePreAuthKey(user: string): Promise<string> {
    let keys: HeadscalePreAuthKey[] = []
    try {
      keys = await this.listPreAuthKeys(user)
    } catch (err) {
      // Listing is an optimisation; never fail a connection over it.
      console.error(`Listing pre-auth keys failed for ${user}:`, err)
      return this.createPreAuthKey(user)
    }

    const now = DateTime.now()
    const usable = keys
      .filter((k) => !k.used && DateTime.fromISO(k.expiration) > now.plus({ hours: 1 }))
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))

    const reused = usable[0]
    const staleCutoff = now.minus({ hours: 1 })

    for (const k of usable.slice(1)) {
      if (DateTime.fromISO(k.createdAt) >= staleCutoff) continue
      try {
        await this.expirePreAuthKey(user, k.key)
      } catch (err) {
        console.error(`Expiring stale pre-auth key ${k.id} failed:`, err)
      }
    }

    return reused ? reused.key : this.createPreAuthKey(user)
  }

  async getNodeRoutes(nodeId: string): Promise<HeadscaleRoute[]> {
    // Headscale v0.23: per-node routes live under /node/{id}/routes
    const data = await this.#fetch<{ routes: HeadscaleRoute[] }>(`/node/${nodeId}/routes`)
    return data.routes ?? []
  }

  async enableRoute(routeId: string): Promise<void> {
    await this.#fetch(`/routes/${routeId}/enable`, { method: 'POST' })
  }

  async getNodesByUser(user: string): Promise<HeadscaleNode[]> {
    const data = await this.#fetch<{ nodes: HeadscaleNode[] }>(`/node?user=${user}`)
    return data.nodes ?? []
  }

  async listAllNodes(): Promise<HeadscaleNode[]> {
    const data = await this.#fetch<{ nodes: HeadscaleNode[] }>('/node')
    return data.nodes ?? []
  }

  async moveNode(nodeId: string, user: string): Promise<void> {
    await this.#fetch(`/node/${nodeId}/user?user=${encodeURIComponent(user)}`, { method: 'POST' })
  }

  /**
   * Make sure the machine holding this Tailscale IP belongs to `user`.
   *
   * Headscale identifies a machine by its machine key and keeps its original
   * owner across re-registrations — `tailscale up --reset` with an auth key
   * from another tenant does NOT move it. A node re-enrolled into a different
   * account therefore stays in the old tenant: it shows up healthy in the
   * dashboard while the isolation policy quietly stops every client of the new
   * account from reaching it.
   */
  async ensureNodeTenant(
    tailscaleIP: string,
    user: string
  ): Promise<'ok' | 'moved' | 'not_found'> {
    if (!tailscaleIP) return 'not_found'
    const ip = tailscaleIP.split('/')[0]!

    const own = await this.getNodesByUser(user)
    if (own.some((n) => n.ipAddresses.includes(ip))) return 'ok'

    // Not in the expected tenant — look across all of them.
    const all = await this.listAllNodes()
    const stray = all.find((n) => n.ipAddresses.includes(ip))
    if (!stray) return 'not_found'

    await this.moveNode(stray.id, user)
    return 'moved'
  }

  // Enable all advertised routes for the node with the given Tailscale IP.
  // This is THE mechanism that activates exit routes: headscale v0.23
  // autoApprovers are non-functional (verified empirically — routes stay
  // enabled=false whatever the approver syntax). Throws on Headscale API errors.
  async enableExitRoutes(
    tailscaleIP: string,
    user: string
  ): Promise<{ found: boolean; advertised: number; enabled: number }> {
    if (!tailscaleIP) return { found: false, advertised: 0, enabled: 0 }
    const ip = tailscaleIP.split('/')[0]!
    const nodes = await this.getNodesByUser(user)
    const node = nodes.find((n) => n.ipAddresses.includes(ip))
    if (!node) return { found: false, advertised: 0, enabled: 0 }

    const routes = await this.getNodeRoutes(node.id)
    let advertised = 0
    let enabled = 0
    for (const route of routes) {
      if (!route.advertised) continue
      advertised++
      if (!route.enabled) await this.enableRoute(route.id)
      enabled++
    }
    return { found: true, advertised, enabled }
  }

  async listUsers(): Promise<string[]> {
    const data = await this.#fetch<{ users: { name: string }[] }>('/user')
    return (data.users ?? []).map((u) => u.name)
  }

  // Regenerate and push the tenant-isolation ACL policy. Per headscale user
  // (= tenant), two rules:
  //   - <user> → <user>:*          intra-tenant traffic; tenants stay isolated
  //   - <user> → autogroup:internet exit-node traffic to the internet
  // Without the second rule the client is allowed to reach peers but NOT to
  // route out through an exit node — the exit node silently does nothing
  // (verified 2026-08-03: ping worked, web traffic was dropped client-side).
  // Requires `policy.mode: database` in the headscale config (verified v0.23).
  async syncPolicy(): Promise<void> {
    const users = await this.listUsers()
    if (users.length === 0) return

    const policy = {
      acls: users.flatMap((u) => [
        { action: 'accept', src: [u], dst: [`${u}:*`] },
        { action: 'accept', src: [u], dst: ['autogroup:internet:*'] },
      ]),
      autoApprovers: {
        exitNode: users,
        routes: { '0.0.0.0/0': users, '::/0': users },
      },
    }
    await this.#fetch('/policy', {
      method: 'PUT',
      body: JSON.stringify({ policy: JSON.stringify(policy) }),
    })
  }

  async deleteNode(nodeId: string): Promise<void> {
    await this.#fetch(`/node/${nodeId}`, { method: 'DELETE' })
  }

  // Remove the node with the given Tailscale IP from the mesh (revocation).
  // Returns false when no matching node exists in the tenant.
  async deleteNodeByIp(tailscaleIP: string, user: string): Promise<boolean> {
    if (!tailscaleIP) return false
    const ip = tailscaleIP.split('/')[0]!
    const nodes = await this.getNodesByUser(user)
    const node = nodes.find((n) => n.ipAddresses.includes(ip))
    if (!node) return false
    await this.deleteNode(node.id)
    return true
  }

  // Delete a tenant entirely: all its nodes, then the headscale user.
  async deleteTenant(user: string): Promise<void> {
    const nodes = await this.getNodesByUser(user)
    for (const node of nodes) {
      await this.deleteNode(node.id)
    }
    await this.#fetch(`/user/${user}`, { method: 'DELETE' })
  }
}

export const headscaleClient = new HeadscaleClient()
