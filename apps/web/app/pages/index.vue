<template>
  <div class="node-table">
    <div class="t-head">
      <span>Noeud</span>
      <span>Localisation</span>
      <span>Statut</span>
      <span>Latence</span>
      <span>CPU</span>
      <span></span>
    </div>
    <NodeRow v-for="node in mockNodes" :key="node.id" :node="node" @connect="onConnect" @cut="onCut" />
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

function onConnect(node: Node) { console.log('connect', node.name) }
function onCut(node: Node)     { console.log('cut', node.name) }
</script>

<style scoped>
.node-table {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r);
  overflow: hidden;
}

.t-head {
  display: grid;
  grid-template-columns: 2fr 1.1fr 1fr 0.9fr 0.9fr 88px;
  padding: 9px 16px;
  border-bottom: 1px solid var(--border);
  font-size: 9px;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: .1em;
}
</style>