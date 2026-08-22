import { load, type Store } from '@tauri-apps/plugin-store'

/*
| Talks to an UMBRA instance. Both the server URL and the token are stored on
| disk by the Tauri store plugin rather than kept in the webview: the app is
| relaunched far more often than a browser tab, and asking for credentials each
| time would push people back to the terminal we are replacing.
*/

export interface NodeSummary {
  id: string
  name: string
  status: 'pending' | 'online' | 'warning' | 'offline' | 'error'
  wireguardIp: string | null
  city: string | null
  countryCode: string | null
  permission: 'read' | 'connect' | 'manage' | 'admin' | null
  org: { id: string; name: string } | null
}

export interface ConnectCommands {
  nodeId: string
  nodeName: string
  exitNodeIp: string | null
  headscaleUrl: string
  /** Present only when the API could mint a pre-auth key. */
  connectCommand: string | null
  switchCommand: string | null
}

let store: Store | null = null
async function db(): Promise<Store> {
  if (!store) store = await load('umbra.json', { autoSave: true })
  return store
}

export async function getServerUrl(): Promise<string | null> {
  return (await db()).get<string>('serverUrl').then((v) => v ?? null)
}
export async function setServerUrl(url: string): Promise<void> {
  await (await db()).set('serverUrl', url.replace(/\/+$/, ''))
}
export async function getToken(): Promise<string | null> {
  return (await db()).get<string>('token').then((v) => v ?? null)
}
export async function setToken(token: string | null): Promise<void> {
  const s = await db()
  if (token) await s.set('token', token)
  else await s.delete('token')
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const base = await getServerUrl()
  if (!base) throw new Error("Aucun serveur configuré")
  const token = await getToken()

  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  })

  if (res.status === 401) {
    await setToken(null)
    throw new Error('Session expirée')
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.message ?? `Erreur ${res.status}`)
  }
  return res.json() as Promise<T>
}

export async function login(email: string, password: string): Promise<void> {
  const base = await getServerUrl()
  const res = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.message ?? 'Identifiants refusés')
  }
  const data = await res.json()
  await setToken(data.token.value)
}

export async function logout(): Promise<void> {
  try {
    await call('/auth/logout', { method: 'POST' })
  } catch {
    // Signing out locally matters more than telling the server about it.
  }
  await setToken(null)
}

export function listNodes(): Promise<{ data: NodeSummary[] }> {
  return call('/nodes')
}

export function requestConnect(nodeId: string): Promise<ConnectCommands> {
  return call('/connect', { method: 'POST', body: JSON.stringify({ nodeId }) })
}

export function requestDisconnect(): Promise<unknown> {
  return call('/connect', { method: 'DELETE' })
}
