<script setup lang="ts">
import type {Node} from '~/stores/nodes'

definePageMeta({layout: 'default'})

const store = useNodesStore()
onMounted(() => { if (!store.nodes.length) store.fetchNodes() })

const showAddNode = ref(false)

const today = computed(() =>
  new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
)

const mapPoints = computed(() =>
  store.nodes
    .filter(n => n.status !== 'offline')
    .map(n => ({lat: n.lat, lng: n.lng, label: n.name}))
)

function onConnect(node: Node) {
  store.setConnected(node.id)
}

function onCut() {
  store.disconnect()
}
</script>

<template>
  <div class="dashboard">

    <!-- Header -->
    <div class="page-header">
      <div>
        <div class="page-title">Dashboard</div>
        <div class="page-sub">{{ today }}</div>
      </div>
      <button class="btn-primary" @click="showAddNode = true">+ Nouveau noeud</button>
    </div>

    <!-- VPN bar -->
    <VpnBar
      v-if="store.connectedNode"
      :node="store.connectedNode"
      upload="1.2 MB/s"
      download="4.8 MB/s"
      :show-cut="true"
      class="mb"
      @cut="store.disconnect()"
    />

    <!-- Stat cards -->
    <div class="stat-grid mb">
      <div class="stat-card">
        <div class="stat-lbl">Noeuds actifs</div>
        <div class="stat-val">
          <span style="color: var(--accent)">{{ store.onlineCount }}</span>
          <span class="stat-suffix">/{{ store.nodes.length }}</span>
        </div>
        <div class="stat-sub">{{ store.nodes.length - store.onlineCount }} hors ligne · {{ store.warningCount }}
          alerte
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-lbl">Appareils</div>
        <div class="stat-val"><span>{{ store.nodes.length }}</span></div>
        <div class="stat-sub">enregistrés</div>
      </div>
      <div class="stat-card">
        <div class="stat-lbl">Bande passante</div>
        <div class="stat-val">
          <span>1.2</span>
          <span class="stat-suffix">GB</span>
        </div>
        <div class="stat-sub">aujourd'hui</div>
      </div>
      <div class="stat-card">
        <div class="stat-lbl">Latence moy.</div>
        <div class="stat-val">
          <span style="color: var(--accent)">{{ store.avgLatency ?? '—' }}</span>
          <span v-if="store.avgLatency" class="stat-suffix">ms</span>
        </div>
        <div class="stat-sub">sur les noeuds actifs</div>
      </div>
    </div>

    <!-- World map -->
    <div class="map-card mb">
      <div class="map-header">
        <span class="map-title">Carte des noeuds</span>
        <span class="map-hint">Clic pour se connecter</span>
      </div>
      <div class="map-body">
        <ClientOnly>
          <DottedMap :points="mapPoints" :dot-size="0.3" class="w-full h-full"/>
        </ClientOnly>
      </div>
    </div>

    <!-- Nodes section -->
    <div class="section-header">
      <span class="section-title">Noeuds</span>
      <NuxtLink to="/nodes" class="section-link">Voir tout →</NuxtLink>
    </div>

    <!-- Node table -->
    <div class="node-table">
      <div class="t-head">
        <span>Noeud</span>
        <span>Localisation</span>
        <span>Statut</span>
        <span>Latence</span>
        <span>CPU</span>
        <span></span>
      </div>
      <NodeTableRow
        v-for="node in store.nodes"
        :key="node.id"
        :node="node"
        @click="navigateTo(`/nodes/${node.id}`)"
        @connect="onConnect"
        @cut="onCut"
      />
      <div v-if="!store.nodes.length" class="t-empty">Aucun noeud</div>
    </div>

  </div>

  <AddNodeModal v-if="showAddNode" @close="showAddNode = false" />
</template>

<style scoped>
.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}
</style>
