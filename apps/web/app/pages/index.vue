<template>
  <div class="dashboard">

    <!-- Page header -->
    <div class="page-header">
      <div>
        <div class="page-title">Dashboard</div>
        <div class="page-sub">{{ today }}</div>
      </div>
      <button class="btn-primary">+ Nouveau noeud</button>
    </div>

    <!-- VPN bar (visible si connexion active) -->
    <VpnBar
        v-if="connectedNode"
        :node="connectedNode"
        upload="1.2 MB/s"
        download="4.8 MB/s"
        class="mb"
        @cut="onCut"
    />

    <!-- Stat cards -->
    <div class="stat-grid mb">
      <StatCard label="Noeuds actifs"   value="10" suffix="/12" sub="2 hors ligne · 1 alerte" />
      <StatCard label="Appareils"       value="2"              sub="enregistrés"   color="default" />
      <StatCard label="Bande passante"  value="1.2" suffix="GB" sub="aujourd'hui"  color="default" />
      <StatCard label="Latence moy."    value="110" suffix="ms" sub="sur 10 noeuds" />
    </div>

    <!-- Carte monde (placeholder) -->
    <div class="map-card mb">
      <div class="map-header">
        <span class="map-title">Carte des noeuds</span>
        <span class="map-hint">Cliquer sur un noeud pour se connecter</span>
      </div>
      <div class="map-body">
        <span class="map-placeholder">Carte — à venir</span>
      </div>
    </div>

    <!-- Table noeuds -->
    <div class="section-header">
      <span class="section-title">Noeuds</span>
      <NuxtLink to="/nodes" class="section-link">Voir tout →</NuxtLink>
    </div>
    <NodeTable
        :nodes="mockNodes"
        @connect="onConnect"
        @cut="onCut"
        @click-node="onClickNode"
    />

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

const connectedNode = computed(() =>
    mockNodes.find(n => n.status === 'connected') ?? null
)

const today = computed(() => {
  return new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })
})

function onConnect(node: Node)   { console.log('connect', node.name) }
function onCut(node: Node)       { console.log('cut', node.name) }
function onClickNode(node: Node) { console.log('detail', node.name) }
</script>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.mb { margin-bottom: var(--sp-5); }

/* Page header */
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: var(--sp-5);
}

.page-title {
  font-family: var(--font-disp);
  font-size: 21px;
  font-weight: 700;
  color: var(--text);
}

.page-sub {
  font-size: 11px;
  color: var(--muted);
  margin-top: 3px;
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  padding: 7px 14px;
  border-radius: var(--r);
  font-family: var(--font-mono);
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  background: var(--accent);
  color: var(--bg);
  transition: filter .15s;
}

.btn-primary:hover { filter: brightness(1.08); }

/* Stat grid */
.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--sp-3);
  margin-bottom: var(--sp-5);
}

/* Map */
.map-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r);
  overflow: hidden;
  margin-bottom: var(--sp-5);
}

.map-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
}

.map-title { font-size: 12px; font-weight: 500; color: var(--text); }
.map-hint  { font-size: 10px; color: var(--muted); }

.map-body {
  height: 270px;
  background: var(--bg);
  display: flex;
  align-items: center;
  justify-content: center;
}

.map-placeholder {
  font-size: 11px;
  color: var(--muted);
}

/* Section header */
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.section-title {
  font-size: 12px;
  font-weight: 500;
  color: var(--text);
}

.section-link {
  font-size: 10px;
  color: var(--accent);
  transition: opacity .15s;
}

.section-link:hover { opacity: .7; }
</style>