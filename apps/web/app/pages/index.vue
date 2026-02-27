<template>
  <div class="dashboard">

    <div class="page-header">
      <div>
        <div class="page-title">Dashboard</div>
        <div class="page-sub">{{ today }}</div>
      </div>
      <button class="btn-primary">+ Nouveau noeud</button>
    </div>

    <VpnBar
        v-if="store.connectedNode"
        :node="store.connectedNode"
        upload="1.2 MB/s"
        download="4.8 MB/s"
        class="mb"
        @cut="store.disconnect()"
    />

    <div class="stat-grid mb">
      <StatCard label="Noeuds actifs"  :value="store.onlineCount" :suffix="`/${store.nodes.length}`" :sub="`${store.offlineCount} hors ligne · ${store.warningCount} alerte`" />
      <StatCard label="Appareils"      value="2"   sub="enregistrés"    color="default" />
      <StatCard label="Bande passante" value="1.2" suffix="GB" sub="aujourd'hui" color="default" />
      <StatCard label="Latence moy."   :value="store.avgLatency ?? '—'" suffix="ms" sub="sur les noeuds actifs" />
    </div>

    <WorldMap :nodes="mapNodes" @connect="onMapConnect" />

    <div class="section-header">
      <span class="section-title">Noeuds</span>
      <NuxtLink to="/nodes" class="section-link">Voir tout →</NuxtLink>
    </div>

    <NodeTable
        :nodes="store.nodes"
        @connect="n => store.setConnected(n.id)"
        @cut="store.disconnect()"
        @click-node="onClickNode"
    />

  </div>
</template>

<script setup lang="ts">
import type { Node } from '@umbra/types'

const store = useNodesStore()

onMounted(() => store.fetchNodes())

const today = computed(() =>
    new Date().toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    })
)

function onClickNode(node: Node) {
  navigateTo(`/nodes/${node.id}`)
}

import WorldMap from '~/components/WorldMap.vue'

const mapNodes = [
  { id: '0',  name: 'RPi maison',       category: 'sbc',     location: 'Genève, CH',      status: 'online'  as const, x: 23.6, y: 40.5, latency: 8,   cpu: 12 },
  { id: '1',  name: 'VPS Hetzner',      category: 'vps',     location: 'Frankfurt, DE',   status: 'online'  as const, x: 25.4, y: 34.5, latency: 14,  cpu: 4  },
  { id: '2',  name: 'VPS Tokyo',        category: 'vps',     location: 'Tokyo, JP',       status: 'online'  as const, x: 77.5, y: 37,   latency: 92,  cpu: 6  },
  { id: '3',  name: 'NanoPi bureau',    category: 'sbc',     location: 'Paris, FR',       status: 'offline' as const, x: 21.4, y: 38                          },
  { id: '4',  name: 'GL.iNet home',     category: 'router',  location: 'New York, US',    status: 'online'  as const, x: 13.5, y: 38.5, latency: 45,  cpu: 3  },
  { id: '5',  name: 'Synology DS923+',  category: 'nas',     location: 'Sydney, AU',      status: 'online'  as const, x: 77,   y: 68,   latency: 210, cpu: 8  },
  { id: '6',  name: 'VPS Vultr SP',     category: 'vps',     location: 'São Paulo, BR',   status: 'online'  as const, x: 23,   y: 69,   latency: 130, cpu: 5  },
  { id: '7',  name: 'MacBook Pro M3',   category: 'desktop', location: 'Londres, UK',     status: 'offline' as const, x: 20,   y: 32                          },
  { id: '8',  name: 'Orange Pi 5',      category: 'sbc',     location: 'Mumbai, IN',      status: 'warning' as const, x: 59.5, y: 49,   latency: 68,  cpu: 94 },
  { id: '9',  name: 'VPS OVH',          category: 'vps',     location: 'Montréal, CA',    status: 'online'  as const, x: 11,   y: 33.5, latency: 38,  cpu: 2  },
  { id: '10', name: 'GL.iNet travel',   category: 'router',  location: 'Nairobi, KE',     status: 'online'  as const, x: 34,   y: 58.5, latency: 85,  cpu: 7  },
  { id: '11', name: 'VPS DigitalOcean', category: 'vps',     location: 'Singapour, SG',   status: 'online'  as const, x: 69.5, y: 54.5, latency: 55,  cpu: 9  },
]

function onMapConnect(node: typeof mapNodes[0]) {
  console.log('connect to', node.name)
  // TODO: brancher sur le store
}

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