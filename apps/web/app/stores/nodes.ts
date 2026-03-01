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
  {
    id: '1', name: 'raspi-home',
    ip: '100.64.0.1', location: 'Paris, FR', country: 'FR', lat: 48.85, lng: 2.35,
    status: 'online', category: 'sbc',
    latency: 12, cpu: 34, ram: 67, disk: 45, temp: 52,
    uptime: 1_296_000,
    lastSeen: '2026-02-28T18:00:00.000Z',
  },
  {
    id: '2', name: 'vps-lon-01',
    ip: '100.64.0.2', location: 'London, GB', country: 'GB', lat: 51.50, lng: -0.12,
    status: 'online', category: 'vps',
    latency: 28, cpu: 12, ram: 41, disk: 23, temp: null,
    uptime: 2_592_000,
    lastSeen: '2026-02-28T18:00:00.000Z',
  },
  {
    id: '3', name: 'openwrt-router',
    ip: '100.64.0.3', location: 'Paris, FR', country: 'FR', lat: 48.87, lng: 2.33,
    status: 'online', category: 'router',
    latency: 5, cpu: 8, ram: 22, disk: 10, temp: 45,
    uptime: 864_000,
    lastSeen: '2026-02-28T18:00:00.000Z',
  },
  {
    id: '4', name: 'synology-nas',
    ip: '100.64.0.4', location: 'Lyon, FR', country: 'FR', lat: 45.74, lng: 4.83,
    status: 'warning', category: 'nas',
    latency: 45, cpu: 78, ram: 89, disk: 92, temp: 68,
    uptime: 432_000,
    lastSeen: '2026-02-28T18:00:00.000Z',
  },
  {
    id: '5', name: 'macbook-pro',
    ip: '100.64.0.5', location: 'Paris, FR', country: 'FR', lat: 48.86, lng: 2.34,
    status: 'offline', category: 'desktop',
    latency: null, cpu: null, ram: null, disk: null, temp: null,
    uptime: null,
    lastSeen: '2026-02-28T16:00:00.000Z',
  },
  {
    id: '6', name: 'vps-sgp-01',
    ip: '100.64.0.6', location: 'Singapore, SG', country: 'SG', lat: 1.35, lng: 103.82,
    status: 'online', category: 'vps',
    latency: 189, cpu: 5, ram: 18, disk: 31, temp: null,
    uptime: 5_184_000,
    lastSeen: '2026-02-28T18:00:00.000Z',
  },
  {
    id: '7', name: 'vps-nyc-01',
    ip: '100.64.0.7', location: 'New York, US', country: 'US', lat: 40.71, lng: -74.01,
    status: 'online', category: 'vps',
    latency: 94, cpu: 22, ram: 55, disk: 61, temp: null,
    uptime: 3_456_000,
    lastSeen: '2026-02-28T18:00:00.000Z',
  },
  {
    id: '8', name: 'raspi-bureau',
    ip: '100.64.0.8', location: 'Bordeaux, FR', country: 'FR', lat: 44.84, lng: -0.58,
    status: 'pending', category: 'sbc',
    latency: null, cpu: null, ram: null, disk: null, temp: null,
    uptime: null,
    lastSeen: '2026-02-28T17:55:00.000Z',
  },
]

export const useNodesStore = defineStore('nodes', () => {
  // Persists the connected node ID in localStorage (restored client-side by the plugin)
  const connectedId = useLocalStorage<string | null>('umbra-connected-id', null)

  const nodes = ref<Node[]>([...MOCK_NODES])
  const loading = ref(false)

  function fetchNodes() {
    nodes.value = [...MOCK_NODES]
  }

  function setConnected(id: string) {
    connectedId.value = id
    nodes.value = nodes.value.map(n => ({
      ...n,
      status: n.id === id
        ? 'connected'
        : n.status === 'connected' ? 'online' : n.status,
    }))
  }

  function disconnect() {
    connectedId.value = null
    nodes.value = nodes.value.map(n => ({
      ...n,
      status: n.status === 'connected' ? 'online' : n.status,
    }))
  }

  const connectedNode = computed(() =>
    nodes.value.find(n => n.status === 'connected') ?? null
  )

  const onlineCount = computed(() =>
    nodes.value.filter(n => n.status === 'online' || n.status === 'connected').length
  )

  const warningCount = computed(() =>
    nodes.value.filter(n => n.status === 'warning').length
  )

  const avgLatency = computed(() => {
    const active = nodes.value.filter(n => n.latency !== null && (n.status === 'online' || n.status === 'connected'))
    if (!active.length) return null
    return Math.round(active.reduce((sum, n) => sum + n.latency!, 0) / active.length)
  })

  return { nodes, loading, fetchNodes, setConnected, disconnect, connectedNode, onlineCount, warningCount, avgLatency }
})
