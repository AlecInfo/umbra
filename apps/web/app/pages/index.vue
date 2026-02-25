<template>
  <div style="display:flex;flex-direction:column;gap:var(--sp-6)">

    <div class="stat-grid">
      <StatCard label="Noeuds actifs" value="10" suffix="/12" sub="2 hors ligne · 1 alerte" />
      <StatCard label="Appareils" value="2" sub="enregistrés" color="default" />
      <StatCard label="Bande passante" value="1.2" suffix="GB" sub="aujourd'hui" color="default" />
      <StatCard label="Latence moy." value="110" suffix="ms" sub="sur 10 noeuds" />
    </div>

    <VpnBar
        :node="mockNodes[0]"
        upload="1.2 MB/s"
        download="4.8 MB/s"
        @cut="onCut"
    />

    <NodeTable :nodes="mockNodes" @connect="onConnect" @cut="onCut" @click-node="onClickNode" />

  </div>
</template>

<script setup lang="ts">
import type { Node } from '@umbra/types'

const mockNodes: Node[] = [
  {
    id: '1', name: 'RPi maison', ip: '100.64.0.1',
    location: 'Geneva, CH', country: 'CH',
    status: 'connected', category: 'sbc',
    latency: 8, cpu: 12, ram: 34, disk: 45, temp: 52, uptime: 864000, lastSeen: null,
  },
  {
    id: '2', name: 'Hetzner Frankfurt', ip: '100.64.0.3',
    location: 'Frankfurt, DE', country: 'DE',
    status: 'online', category: 'vps',
    latency: 24, cpu: 8, ram: 20, disk: 30, temp: 40, uptime: 432000, lastSeen: null,
  },
  {
    id: '3', name: 'Orange Pi Mumbai', ip: '100.64.0.7',
    location: 'Mumbai, IN', country: 'IN',
    status: 'warning', category: 'sbc',
    latency: 112, cpu: 94, ram: 78, disk: 60, temp: 71, uptime: 172800, lastSeen: null,
  },
  {
    id: '4', name: 'GL.iNet Nairobi', ip: '100.64.0.12',
    location: 'Nairobi, KE', country: 'KE',
    status: 'offline', category: 'router',
    latency: null, cpu: null, ram: null, disk: null, temp: null, uptime: null, lastSeen: '2026-02-25T14:32:00Z',
  },
]

function onConnect(node: Node)   { console.log('connect', node.name) }
function onCut(node: Node)       { console.log('cut', node.name) }
function onClickNode(node: Node) { console.log('detail', node.name) }
</script>

<style scoped>
.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--sp-3);
}
</style>