import { defineStore } from 'pinia'
import type { Node } from '@umbra/types'

export const useNodesStore = defineStore('nodes', () => {
    // State
    const nodes = ref<Node[]>([])
    const loading = ref(false)
    const error = ref<string | null>(null)

    // Getters
    const connectedNode = computed(() =>
        nodes.value.find(n => n.status === 'connected') ?? null
    )

    const onlineCount = computed(() =>
        nodes.value.filter(n => n.status === 'online' || n.status === 'connected' || n.status === 'warning').length
    )

    const offlineCount = computed(() =>
        nodes.value.filter(n => n.status === 'offline').length
    )

    const warningCount = computed(() =>
        nodes.value.filter(n => n.status === 'warning').length
    )

    const avgLatency = computed(() => {
        const active = nodes.value.filter(n => n.latency !== null)
        if (active.length === 0) return null
        return Math.round(active.reduce((sum, n) => sum + (n.latency ?? 0), 0) / active.length)
    })

    // Actions
    async function fetchNodes() {
        loading.value = true
        error.value = null
        try {
            // TODO: replace with real API call
            await new Promise(r => setTimeout(r, 300))
            nodes.value = MOCK_NODES
        } catch (e) {
            error.value = 'Impossible de charger les noeuds'
        } finally {
            loading.value = false
        }
    }

    function setConnected(nodeId: string) {
        nodes.value = nodes.value.map(n => ({
            ...n,
            status: n.id === nodeId ? 'connected' : n.status === 'connected' ? 'online' : n.status,
        }))
    }

    function disconnect() {
        nodes.value = nodes.value.map(n => ({
            ...n,
            status: n.status === 'connected' ? 'online' : n.status,
        }))
    }

    return {
        nodes, loading, error,
        connectedNode, onlineCount, offlineCount, warningCount, avgLatency,
        fetchNodes, setConnected, disconnect,
    }
})

// Mock data — remove when the API is ready
const MOCK_NODES: Node[] = [
    {
        id: '1', name: 'RPi maison', ip: '100.64.0.1',
        location: 'Geneva, CH', country: 'CH',
        status: 'online', category: 'sbc',
        latency: 8, cpu: 12, ram: 34, disk: 45, temp: 52, uptime: 864000, lastSeen: null,
    },
    {
        id: '2', name: 'Hetzner Frankfurt', ip: '100.64.0.3',
        location: 'Frankfurt, DE', country: 'DE',
        status: 'online', category: 'vps',
        latency: 24, cpu: 8, ram: 20, disk: 30, temp: 39, uptime: 432000, lastSeen: null,
    },
    {
        id: '3', name: 'Orange Pi Mumbai', ip: '100.64.0.7',
        location: 'Mumbai, IN', country: 'IN',
        status: 'warning', category: 'sbc',
        latency: 112, cpu: 94, ram: 78, disk: 61, temp: 71, uptime: 172800, lastSeen: null,
    },
    {
        id: '4', name: 'GL.iNet Nairobi', ip: '100.64.0.12',
        location: 'Nairobi, KE', country: 'KE',
        status: 'offline', category: 'router',
        latency: null, cpu: null, ram: null, disk: null, temp: null, uptime: null, lastSeen: '2026-02-25T14:32:00Z',
    },
]