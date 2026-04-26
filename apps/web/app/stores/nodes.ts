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
}

interface ApiNode {
  id: string
  name: string
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
  }
}

export const useNodesStore = defineStore('nodes', () => {
  const connectedId = useLocalStorage<string | null>('umbra-connected-id', null)
  const lastUsedId  = useLocalStorage<string | null>('umbra-last-used-id', null)

  const nodes = ref<Node[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const savedStatus = ref<Record<string, NodeStatus>>({})
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
    } catch (e: any) {
      error.value = e?.data?.message || 'Impossible de charger les noeuds.'
      nodes.value = []
    } finally {
      loading.value = false
    }
  }

  const connectedAt = ref<number | null>(null)

  function setConnected(id: string) {
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

  function disconnect() {
    connectedId.value = null
    connectedAt.value = null
    nodes.value = nodes.value.map(n => {
      if (n.status !== 'connected') return n
      const orig = savedStatus.value[n.id] ?? 'online'
      return { ...n, status: orig }
    })
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

  return { nodes, loading, error, fetchNodes, setConnected, disconnect, deleteNode, startPolling, stopPolling, connectedNode, onlineCount, warningCount, avgLatency, lastUsedId, connectedAt, savedStatus, connectedId }
})
