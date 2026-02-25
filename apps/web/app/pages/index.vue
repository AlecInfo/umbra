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

    <div class="map-card mb">
      <div class="map-header">
        <span class="map-title">Carte des noeuds</span>
        <span class="map-hint">Cliquer sur un noeud pour se connecter</span>
      </div>
      <div class="map-body">
        <span class="map-placeholder">Carte — à venir</span>
      </div>
    </div>

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