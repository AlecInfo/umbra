import { defineStore } from 'pinia'
import { useLocalStorage } from '@vueuse/core'

export type NodeStatus   = 'online' | 'offline' | 'warning' | 'pending' | 'connected'
export type NodeCategory = 'sbc' | 'vps' | 'router' | 'nas' | 'desktop' | 'other'

export interface Node {
  id:          string
  name:        string
  ip:          string
  location:    string
  country:     string
  lat:         number
  lng:         number
  hasLocation: boolean
  status:      NodeStatus
  category:    NodeCategory
  latency:     number | null
  cpu:         number | null
  ram:         number | null
  disk:        number | null
  temp:        number | null
  uptime:      number | null
  lastSeen:    string | null
  // Set when the node belongs to an organisation rather than to the account
  // directly — that is what a shared node looks like from here.
  orgName:     string | null
  // What this account may do with the node — mirrors the server's
  // read < connect < manage < admin ladder.
  permission:  'read' | 'connect' | 'manage' | 'admin' | null
}

interface ApiNode {
  id: string
  name: string
  org: { id: string; name: string } | null
  permission: 'read' | 'connect' | 'manage' | 'admin' | null
  ipAddress: string | null
  wireguardIp: string | null
  status: 'pending' | 'online' | 'warning' | 'offline' | 'error'
  category: NodeCategory
  city: string | null
  countryCode: string | null
  latitude: number | null
  longitude: number | null
  lastSeenAt: string | null
  latestMetric: {
    latencyMs: number | null
    cpuPercent: number | null
    memoryPercent: number | null
    diskPercent: number | null
    temperatureCelsius: number | null
    uptimeSeconds: string | number | null
    bytesSent: number | null
    bytesReceived: number | null
  } | null
}

function mapApiNode(a: ApiNode): Node {
  const m = a.latestMetric
  const status: NodeStatus = a.status === 'error' ? 'offline' : a.status
  const location = [a.city, a.countryCode].filter(Boolean).join(', ')
  return {
    id: a.id,
    name: a.name,
    ip: a.wireguardIp ?? a.ipAddress ?? '',
    location,
    country: a.countryCode ?? '',
    lat:         a.latitude ?? 0,
    lng:         a.longitude ?? 0,
    hasLocation: a.latitude !== null && a.longitude !== null,
    status,
    category: a.category,
    latency: m?.latencyMs ?? null,
    cpu: m?.cpuPercent ?? null,
    ram: m?.memoryPercent ?? null,
    disk: m?.diskPercent ?? null,
    temp: m?.temperatureCelsius ?? null,
    uptime: m?.uptimeSeconds != null ? Number(m.uptimeSeconds) : null,
    lastSeen: a.lastSeenAt,
    orgName: a.org?.name ?? null,
    permission: a.permission ?? null,
  }
}

// bytes/s → "X B/s" | "X KB/s" | "X MB/s"
function formatSpeed(bps: number): string {
  if (bps >= 1_000_000) return `${(bps / 1_000_000).toFixed(1)} MB/s`
  if (bps >= 1_000)     return `${(bps / 1_000).toFixed(0)} KB/s`
  return `${Math.round(bps)} B/s`
}

export const useNodesStore = defineStore('nodes', () => {
  const connectedId = useLocalStorage<string | null>('umbra-connected-id', null)
  const lastUsedId  = useLocalStorage<string | null>('umbra-last-used-id', null)

  const nodes = ref<Node[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const savedStatus = ref<Record<string, NodeStatus>>({})

  // Track cumulative bytes per node to compute upload/download rates
  const prevBytes = ref<Record<string, { sent: number; received: number; ts: number }>>({})
  const uploadSpeed   = ref<string>('0 B/s')
  const downloadSpeed = ref<string>('0 B/s')

  let pollHandle: ReturnType<typeof setInterval> | null = null
  let pollSubscribers = 0

  async function fetchNodes() {
    loading.value = true
    error.value = null
    try {
      const api = useApi()
      const res = await api<{ data: ApiNode[] }>('/nodes', { query: { perPage: 100 } })
      const mapped = res.data.map(mapApiNode)
      if (connectedId.value) {
        const idx = mapped.findIndex((n) => n.id === connectedId.value)
        if (idx >= 0) {
          savedStatus.value[connectedId.value] = mapped[idx]!.status
          mapped[idx] = { ...mapped[idx]!, status: 'connected' }
        }
      }
      nodes.value = mapped

      // Compute upload/download rate for the connected node
      if (connectedId.value) {
        const raw = res.data.find(n => n.id === connectedId.value)
        const m = raw?.latestMetric
        if (m?.bytesSent != null && m?.bytesReceived != null) {
          const now = Date.now()
          const prev = prevBytes.value[connectedId.value]
          if (prev) {
            const dt = (now - prev.ts) / 1000
            if (dt > 0) {
              const upBps   = Math.max(0, (m.bytesSent    - prev.sent)     / dt)
              const downBps = Math.max(0, (m.bytesReceived - prev.received) / dt)
              uploadSpeed.value   = formatSpeed(upBps)
              downloadSpeed.value = formatSpeed(downBps)
            }
          }
          prevBytes.value[connectedId.value] = { sent: m.bytesSent, received: m.bytesReceived, ts: now }
        }
      }
    } catch (e: any) {
      error.value = e?.data?.message || 'Impossible de charger les noeuds.'
      nodes.value = []
    } finally {
      loading.value = false
    }
  }

  const connectedAt = ref<number | null>(null)
  const connecting = ref(false)

  interface ConnectCommands {
    nodeName: string
    connectCommand: string | null
    switchCommand: string | null
    disconnectCommand: string
    // The same instructions in parts rather than as a shell line: inside the
    // packaged apps we run tailscale ourselves instead of asking anyone to
    // paste anything.
    headscaleUrl: string | null
    authKey: string | null
    exitNodeIp: string | null
  }
  const connectCommands = ref<ConnectCommands | null>(null)

  // Restore local state only (no API call) — used after page reload
  function restoreConnected(id: string) {
    connectedId.value = id
    connectedAt.value = Date.now()
    nodes.value = nodes.value.map(n => {
      if (n.id === id) {
        savedStatus.value[id] = n.status
        return { ...n, status: 'connected' }
      }
      if (n.status === 'connected') {
        const orig = savedStatus.value[n.id] ?? 'online'
        return { ...n, status: orig }
      }
      return n
    })
  }

  async function setConnected(id: string) {
    connecting.value = true
    try {
      const api = useApi()
      const res = await api<any>('/connect', { method: 'POST', body: { nodeId: id } })
      if (res.exitNodeIp || res.connectCommand) {
        connectCommands.value = {
          nodeName:         res.nodeName ?? '',
          connectCommand:   res.connectCommand ?? null,
          switchCommand:    res.switchCommand ?? null,
          disconnectCommand: res.disconnectCommand ?? 'tailscale set --exit-node=',
          headscaleUrl:     res.headscaleUrl ?? null,
          authKey:          res.authKey ?? null,
          exitNodeIp:       res.exitNodeIp ?? null,
        }
      }
    } catch {
      // API call failed but keep UI state in sync anyway
    } finally {
      connecting.value = false
    }
    connectedId.value = id
    lastUsedId.value  = id
    connectedAt.value = Date.now()
    nodes.value = nodes.value.map(n => {
      if (n.id === id) {
        savedStatus.value[id] = n.status
        return { ...n, status: 'connected' }
      }
      if (n.status === 'connected') {
        const orig = savedStatus.value[n.id] ?? 'online'
        return { ...n, status: orig }
      }
      return n
    })
  }

  async function disconnect(): Promise<string> {
    let disconnectCmd = 'tailscale set --exit-node='
    try {
      const api = useApi()
      const res = await api<any>('/connect', { method: 'DELETE' })
      if (res?.disconnectCommand) disconnectCmd = res.disconnectCommand
    } catch {
      // API call failed but keep UI state in sync anyway
    }
    // Inside the packaged apps we stop the routing ourselves. The shell line is
    // only worth showing to someone who has to paste it, so it is cleared once
    // it has been run — the caller words its toast on that.
    const desktop = useDesktop()
    if (desktop.available) {
      try {
        await desktop.clearExitNode()
        disconnectCmd = ''
      } catch {
        // Leave the command in place: the user can still run it by hand.
      }
    }
    connectCommands.value = null
    connectedId.value = null
    connectedAt.value = null
    nodes.value = nodes.value.map(n => {
      if (n.status !== 'connected') return n
      const orig = savedStatus.value[n.id] ?? 'online'
      return { ...n, status: orig }
    })
    return disconnectCmd
  }

  function deleteNode(id: string) {
    if (connectedId.value === id) disconnect()
    nodes.value = nodes.value.filter(n => n.id !== id)
  }

  function startPolling(intervalMs = 8000) {
    pollSubscribers++
    if (pollHandle) return
    pollHandle = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
      fetchNodes()
    }, intervalMs)
  }

  function stopPolling() {
    pollSubscribers = Math.max(0, pollSubscribers - 1)
    if (pollSubscribers > 0) return
    if (pollHandle) {
      clearInterval(pollHandle)
      pollHandle = null
    }
  }

  const connectedNode = computed(() =>
    nodes.value.find(n => n.status === 'connected') ?? null
  )

  const onlineCount = computed(() =>
    nodes.value.filter(n => n.status === 'online' || n.status === 'connected' || n.status === 'warning').length
  )

  const warningCount = computed(() =>
    nodes.value.filter(n => n.status === 'warning').length
  )

  const avgLatency = computed(() => {
    const active = nodes.value.filter(n => n.latency !== null && (n.status === 'online' || n.status === 'connected' || n.status === 'warning'))
    if (!active.length) return null
    return Math.round(active.reduce((sum, n) => sum + n.latency!, 0) / active.length)
  })

  /**
   * Wipe everything tied to the signed-in account.
   *
   * connectedId and lastUsedId live in localStorage, so without this they
   * outlive a logout — and the next account to sign in on the same browser
   * briefly saw the previous one's nodes and connection state.
   */
  function reset() {
    stopPolling()
    nodes.value = []
    loading.value = false
    error.value = null
    savedStatus.value = {}
    prevBytes.value = {}
    uploadSpeed.value = '0 B/s'
    downloadSpeed.value = '0 B/s'
    connectedAt.value = null
    connecting.value = false
    connectCommands.value = null
    connectedId.value = null
    lastUsedId.value = null
  }

  return { reset, nodes, loading, error, fetchNodes, setConnected, restoreConnected, disconnect, deleteNode, startPolling, stopPolling, connectedNode, onlineCount, warningCount, avgLatency, lastUsedId, connectedAt, savedStatus, connectedId, connecting, uploadSpeed, downloadSpeed, connectCommands }
})
