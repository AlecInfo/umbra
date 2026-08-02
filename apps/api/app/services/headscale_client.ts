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
}

export const headscaleClient = new HeadscaleClient()
