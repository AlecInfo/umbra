import { DateTime } from 'luxon'

interface HeadscalePreAuthKey {
  user: string
  id: string
  key: string
  reusable: boolean
  ephemeral: boolean
  used: boolean
  expiration: string
}

interface HeadscaleRoute {
  id: string
  prefix: string
  advertised: boolean
  enabled: boolean
  isPrimary: boolean
}

interface HeadscaleNode {
  id: string
  name: string
  ipAddresses: string[]
  user: { name: string }
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

  // Regenerate and push the tenant-isolation ACL policy. One self-only rule
  // per headscale user: tenants cannot see or reach each other. Requires
  // `policy.mode: database` in the headscale config (verified on v0.23).
  // The autoApprovers block is non-functional in v0.23 (see enableExitRoutes)
  // but kept so approval becomes automatic after a headscale upgrade.
  async syncPolicy(): Promise<void> {
    const users = await this.listUsers()
    if (users.length === 0) return

    const policy = {
      acls: users.map((u) => ({ action: 'accept', src: [u], dst: [`${u}:*`] })),
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
