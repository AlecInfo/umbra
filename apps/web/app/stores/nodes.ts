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

/** The account's open VPN session, as the server sees it (GET /connect). */
export interface VpnSession {
  id:          string
  nodeId:      string
  nodeName:    string
  // pending: the command was handed out, the exit node has not seen this
  // machine yet. active: it has — traffic can flow.
  state:       'pending' | 'active'
  connectedAt: string
  deviceName:  string | null
}

export const useNodesStore = defineStore('nodes', () => {
  const lastUsedId = useLocalStorage<string | null>('umbra-last-used-id', null)
  const toast = useToast()
  const { notify } = useNotifications()
  const { t } = useT()

  const nodes = ref<Node[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const savedStatus = ref<Record<string, NodeStatus>>({})

  /*
  | The connection lives on the server. This used to be a node id in
  | localStorage, set the moment the connect dialog opened — so the dashboard
  | said "connected" before anyone ran the command, after the request failed,
  | and on any browser that had once clicked the button.
  */
  const session = ref<VpnSession | null>(null)
  const connectedId = computed(() => (session.value?.state === 'active' ? session.value.nodeId : null))
  const pendingId   = computed(() => (session.value?.state === 'pending' ? session.value.nodeId : null))

  // Track cumulative bytes per node to compute upload/download rates
  const prevBytes = ref<Record<string, { sent: number; received: number; ts: number }>>({})
  const uploadSpeed   = ref<string>('0 B/s')
  const downloadSpeed = ref<string>('0 B/s')

  let pollHandle: ReturnType<typeof setInterval> | null = null
  let pollSubscribers = 0

  // Show the active session's node as 'connected', and give every other node
  // back the status it had before.
  function applySession(list: Node[]): Node[] {
    const id = connectedId.value
    return list.map((n) => {
      const base = n.status === 'connected' ? (savedStatus.value[n.id] ?? 'online') : n.status
      if (n.id !== id) return base === n.status ? n : { ...n, status: base }
      savedStatus.value[n.id] = base
      return { ...n, status: 'connected' }
    })
  }

  async function fetchNodes() {
    loading.value = true
    error.value = null
    try {
      const api = useApi()
      const res = await api<{ data: ApiNode[] }>('/nodes', { query: { perPage: 100 } })
      nodes.value = applySession(res.data.map(mapApiNode))

      // Compute upload/download rate for the connected node
      const cid = connectedId.value
      if (cid) {
        const raw = res.data.find(n => n.id === cid)
        const m = raw?.latestMetric
        if (m?.bytesSent != null && m?.bytesReceived != null) {
          const now = Date.now()
          const prev = prevBytes.value[cid]
          if (prev) {
            const dt = (now - prev.ts) / 1000
            if (dt > 0) {
              const upBps   = Math.max(0, (m.bytesSent    - prev.sent)     / dt)
              const downBps = Math.max(0, (m.bytesReceived - prev.received) / dt)
              uploadSpeed.value   = formatSpeed(upBps)
              downloadSpeed.value = formatSpeed(downBps)
            }
          }
          prevBytes.value[cid] = { sent: m.bytesSent, received: m.bytesReceived, ts: now }
        }
      }
    } catch (e: any) {
      // Keep what was last known: a failed poll is a network hiccup, not
      // proof that the account has no nodes.
      error.value = e?.data?.message || 'Impossible de charger les noeuds.'
    } finally {
      loading.value = false
    }
  }

  async function fetchSession() {
    try {
      const api = useApi()
      const res = await api<{ session: VpnSession | null }>('/connect')
      session.value = res.session
      nodes.value = applySession(nodes.value)
    } catch {
      // Same as above: keep the last known state through a failed poll.
    }
  }

  // While a session is pending, ask often: the user is watching the dialog
  // for the moment their machine shows up.
  let pendingPoll: ReturnType<typeof setInterval> | null = null
  watch(pendingId, (id) => {
    if (id && !pendingPoll) pendingPoll = setInterval(fetchSession, 3000)
    if (!id && pendingPoll) { clearInterval(pendingPoll); pendingPoll = null }
  })

  const connectedAt = computed(() => (session.value ? Date.parse(session.value.connectedAt) : null))
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

  /**
   * Ask the server for a session on this node. The session starts pending:
   * nothing is shown as connected until the exit node reports the machine.
   * Returns false, changing nothing, when the server refuses.
   */
  async function setConnected(id: string): Promise<boolean> {
    if (connecting.value) return false
    connecting.value = true
    try {
      const api = useApi()
      const res = await api<any>('/connect', { method: 'POST', body: { nodeId: id } })
      connectCommands.value = {
        nodeName:          res.nodeName ?? '',
        connectCommand:    res.connectCommand ?? null,
        switchCommand:     res.switchCommand ?? null,
        disconnectCommand: res.disconnectCommand ?? 'sudo tailscale set --exit-node=',
        headscaleUrl:      res.headscaleUrl ?? null,
        authKey:           res.authKey ?? null,
        exitNodeIp:        res.exitNodeIp ?? null,
      }
      session.value = {
        id:          '',
        nodeId:      id,
        nodeName:    res.nodeName ?? '',
        state:       'pending',
        connectedAt: new Date().toISOString(),
        deviceName:  null,
      }
      lastUsedId.value = id
      nodes.value = applySession(nodes.value)
      return true
    } catch (e: any) {
      notify({ title: t('conn_failed_toast_title'), description: e?.data?.message || undefined, type: 'error' })
      return false
    } finally {
      connecting.value = false
    }
  }

  /**
   * End the session — on the server, and on this machine when the app can.
   * Every caller goes through here, so the user is always told what is left
   * to do: in a browser that is running the disconnect command themselves.
   */
  async function disconnect(): Promise<void> {
    let disconnectCmd = 'sudo tailscale set --exit-node='
    try {
      const api = useApi()
      const res = await api<any>('/connect', { method: 'DELETE' })
      if (res?.disconnectCommand) disconnectCmd = res.disconnectCommand
    } catch (e: any) {
      notify({ title: t('conn_disconnect_failed_title'), description: e?.data?.message || undefined, type: 'error' })
      return
    }

    // Inside the packaged apps we stop the routing ourselves, and there is
    // nothing left for the user to run.
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
    session.value = null
    nodes.value = applySession(nodes.value)

    toast.add({
      // In a browser the tunnel stays up until the user runs the command.
      title:       disconnectCmd ? t('conn_disconnect_toast_title') : t('conn_disconnect_done_title'),
      description: disconnectCmd || undefined,
      color:       'neutral',
      duration:    disconnectCmd ? 12000 : 4000,
      icon:        'i-lucide-unplug',
    })
  }

  function deleteNode(id: string) {
    if (session.value?.nodeId === id) session.value = null
    nodes.value = nodes.value.filter(n => n.id !== id)
  }

  function startPolling(intervalMs = 8000) {
    pollSubscribers++
    if (pollHandle) return
    pollHandle = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
      fetchNodes()
      fetchSession()
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

  const pendingNode = computed(() =>
    pendingId.value ? nodes.value.find(n => n.id === pendingId.value) ?? null : null
  )

  const onlineCount = computed(() =>
    nodes.value.filter(n => n.status === 'online' || n.status === 'connected' || n.status === 'warning').length
  )

  // Nodes with a firing alert: a metric over its threshold, or silent. Read
  // through the 'connected' overlay, which hides the node's own status.
  const alertCount = computed(() =>
    nodes.value.filter((n) => {
      const base = n.status === 'connected' ? (savedStatus.value[n.id] ?? 'online') : n.status
      return base === 'warning' || base === 'offline'
    }).length
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
   * lastUsedId lives in localStorage, so without this it outlives a logout —
   * and the next account to sign in on the same browser would inherit it.
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
    session.value = null
    connecting.value = false
    connectCommands.value = null
    lastUsedId.value = null
  }

  return { reset, nodes, loading, error, fetchNodes, fetchSession, session, setConnected, disconnect, deleteNode, startPolling, stopPolling, connectedNode, pendingNode, pendingId, onlineCount, warningCount, alertCount, avgLatency, lastUsedId, connectedAt, savedStatus, connectedId, connecting, uploadSpeed, downloadSpeed, connectCommands }
})
