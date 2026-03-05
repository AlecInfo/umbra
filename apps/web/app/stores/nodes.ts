import { defineStore } from 'pinia'
import { useLocalStorage } from '@vueuse/core'

export type NodeStatus   = 'online' | 'offline' | 'warning' | 'pending' | 'connected'
export type NodeCategory = 'sbc' | 'vps' | 'router' | 'nas' | 'desktop' | 'other'

export interface Node {
  id:        string
  name:      string
  ip:        string
  location:  string
  country:   string
  lat:       number
  lng:       number
  status:    NodeStatus
  category:  NodeCategory
  latency:   number | null
  cpu:       number | null
  ram:       number | null
  disk:      number | null
  temp:      number | null
  uptime:    number | null
  lastSeen:  string | null
}

const MOCK_NODES: Node[] = [
  // ── Genève + région (~120 km) → cluster ──────────────────────────────────────
  {
    id: '1', name: 'raspi-home',
    ip: '100.64.0.1', location: 'Genève, CH', country: 'CH', lat: 46.2044, lng: 6.1432,
    status: 'online', category: 'sbc',
    latency: 3, cpu: 28, ram: 52, disk: 61, temp: 47,
    uptime: 2_160_000, lastSeen: '2026-03-01T18:00:00.000Z',
  },
  {
    id: '2', name: 'synology-home',
    ip: '100.64.0.2', location: 'Genève, CH', country: 'CH', lat: 46.2052, lng: 6.1445,
    status: 'online', category: 'nas',
    latency: 2, cpu: 14, ram: 73, disk: 81, temp: 43,
    uptime: 5_184_000, lastSeen: '2026-03-01T18:00:00.000Z',
  },
  {
    id: '3', name: 'gl-inet-bureau',
    ip: '100.64.0.3', location: 'Genève, CH', country: 'CH', lat: 46.1983, lng: 6.1566,
    status: 'online', category: 'router',
    latency: 5, cpu: 6, ram: 18, disk: 8, temp: 38,
    uptime: 1_296_000, lastSeen: '2026-03-01T18:00:00.000Z',
  },
  {
    id: '4', name: 'macbook-alec',
    ip: '100.64.0.4', location: 'Genève, CH', country: 'CH', lat: 46.2031, lng: 6.1418,
    status: 'offline', category: 'desktop',
    latency: null, cpu: null, ram: null, disk: null, temp: null,
    uptime: null, lastSeen: '2026-03-01T14:22:00.000Z',
  },
  {
    id: '5', name: 'raspi-lausanne',
    ip: '100.64.0.5', location: 'Lausanne, CH', country: 'CH', lat: 46.5197, lng: 6.6323,
    status: 'online', category: 'sbc',
    latency: 4, cpu: 19, ram: 44, disk: 38, temp: 44,
    uptime: 950_000, lastSeen: '2026-03-01T18:00:00.000Z',
  },
  {
    id: '6', name: 'nano-annecy',
    ip: '100.64.0.6', location: 'Annecy, FR', country: 'FR', lat: 45.8992, lng: 6.1294,
    status: 'warning', category: 'sbc',
    latency: 9, cpu: 82, ram: 77, disk: 91, temp: 71,
    uptime: 172_800, lastSeen: '2026-03-01T18:00:00.000Z',
  },
  {
    id: '7', name: 'server-zurich',
    ip: '100.64.0.7', location: 'Zurich, CH', country: 'CH', lat: 47.3769, lng: 8.5417,
    status: 'online', category: 'other',
    latency: 7, cpu: 31, ram: 61, disk: 52, temp: 51,
    uptime: 3_240_000, lastSeen: '2026-03-01T18:00:00.000Z',
  },
  // ── VPS Europe ───────────────────────────────────────────────────────────────
  {
    id: '8', name: 'vps-fra-01',
    ip: '100.64.0.8', location: 'Frankfurt, DE', country: 'DE', lat: 50.1109, lng: 8.6821,
    status: 'online', category: 'vps',
    latency: 14, cpu: 8, ram: 31, disk: 19, temp: null,
    uptime: 7_776_000, lastSeen: '2026-03-01T18:00:00.000Z',
  },
  {
    id: '10', name: 'vps-lon-01',
    ip: '100.64.0.10', location: 'London, GB', country: 'GB', lat: 51.5074, lng: -0.1278,
    status: 'online', category: 'vps',
    latency: 18, cpu: 22, ram: 38, disk: 27, temp: null,
    uptime: 4_320_000, lastSeen: '2026-03-01T18:00:00.000Z',
  },
  // ── VPS Amérique ─────────────────────────────────────────────────────────────
  {
    id: '12', name: 'vps-nyc-01',
    ip: '100.64.0.12', location: 'New York, US', country: 'US', lat: 40.7128, lng: -74.0060,
    status: 'online', category: 'vps',
    latency: 98, cpu: 19, ram: 41, disk: 55, temp: null,
    uptime: 2_592_000, lastSeen: '2026-03-01T18:00:00.000Z',
  },
  {
    id: '13', name: 'vps-sao-01',
    ip: '100.64.0.13', location: 'São Paulo, BR', country: 'BR', lat: -23.5505, lng: -46.6333,
    status: 'online', category: 'vps',
    latency: 182, cpu: 41, ram: 59, disk: 33, temp: null,
    uptime: 2_160_000, lastSeen: '2026-03-01T18:00:00.000Z',
  },
  // ── VPS Asie-Pacifique ───────────────────────────────────────────────────────
  {
    id: '14', name: 'vps-sgp-01',
    ip: '100.64.0.14', location: 'Singapore, SG', country: 'SG', lat: 1.3521, lng: 103.8198,
    status: 'warning', category: 'vps',
    latency: 201, cpu: 11, ram: 28, disk: 44, temp: null,
    uptime: 864_000, lastSeen: '2026-03-01T18:00:00.000Z',
  },
  {
    id: '15', name: 'vps-tok-01',
    ip: '100.64.0.15', location: 'Tokyo, JP', country: 'JP', lat: 35.6762, lng: 139.6503,
    status: 'offline', category: 'vps',
    latency: 241, cpu: 7, ram: 22, disk: 16, temp: null,
    uptime: 1_728_000, lastSeen: '2026-03-01T18:00:00.000Z',
  },
  {
    id: '16', name: 'vps-syd-01',
    ip: '100.64.0.16', location: 'Sydney, AU', country: 'AU', lat: -33.8688, lng: 151.2093,
    status: 'pending', category: 'vps',
    latency: null, cpu: null, ram: null, disk: null, temp: null,
    uptime: null, lastSeen: '2026-03-01T17:58:00.000Z',
  },
]

export const useNodesStore = defineStore('nodes', () => {
  // Persists the connected node ID in localStorage (restored client-side by the plugin)
  const connectedId = useLocalStorage<string | null>('umbra-connected-id', null)
  // Persists the last used node ID so mobile can surface it quickly
  const lastUsedId  = useLocalStorage<string | null>('umbra-last-used-id', null)

  const nodes = ref<Node[]>([...MOCK_NODES])
  const loading = ref(false)
  // Preserves the status before connecting so disconnect can restore it (e.g. warning → connected → warning)
  const savedStatus = ref<Record<string, NodeStatus>>({})

  function fetchNodes() {
    nodes.value = [...MOCK_NODES]
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

  return { nodes, loading, fetchNodes, setConnected, disconnect, deleteNode, connectedNode, onlineCount, warningCount, avgLatency, lastUsedId, connectedAt, savedStatus, connectedId }
})
