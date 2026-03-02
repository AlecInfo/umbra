<script setup lang="ts">
import type { NodeStatus, NodeCategory } from '~/stores/nodes'

definePageMeta({ layout: 'default' })

const store = useNodesStore()
onMounted(() => { if (!store.nodes.length) store.fetchNodes() })

const showAddNode = ref(false)

const activeStatus   = ref<NodeStatus | 'all'>('all')
const activeCategory = ref<NodeCategory | 'all'>('all')

const filteredNodes = computed(() =>
  store.nodes.filter(n => {
    const statusOk   = activeStatus.value   === 'all' || n.status   === activeStatus.value
    const categoryOk = activeCategory.value === 'all' || n.category === activeCategory.value
    return statusOk && categoryOk
  })
)

const statusFilters = computed(() => [
  { value: 'all',       label: 'Tous',       count: store.nodes.length },
  { value: 'online',    label: 'En ligne',   count: store.nodes.filter(n => n.status === 'online').length },
  { value: 'connected', label: 'Connecté',   count: store.nodes.filter(n => n.status === 'connected').length },
  { value: 'warning',   label: 'Alerte',     count: store.nodes.filter(n => n.status === 'warning').length },
  { value: 'offline',   label: 'Hors ligne', count: store.nodes.filter(n => n.status === 'offline').length },
])

const categoryFilters = [
  { value: 'all',     label: 'Toutes' },
  { value: 'sbc',     label: 'SBC' },
  { value: 'vps',     label: 'VPS' },
  { value: 'router',  label: 'Router' },
  { value: 'nas',     label: 'NAS' },
  { value: 'desktop', label: 'Desktop' },
]
</script>

<template>
  <div class="nodes-page">

    <div class="page-header">
      <div>
        <div class="page-title">Noeuds</div>
        <div class="page-sub">{{ store.nodes.length }} noeuds enregistrés</div>
      </div>
      <button class="btn-primary" @click="showAddNode = true">+ Nouveau noeud</button>
    </div>

    <div class="filters mb">
      <!-- Status filter -->
      <div class="filter-group">
        <button
          v-for="f in statusFilters"
          :key="f.value"
          class="filter-btn"
          :class="{ active: activeStatus === f.value }"
          @click="activeStatus = f.value as typeof activeStatus"
        >
          {{ f.label }}
          <span class="filter-count">{{ f.count }}</span>
        </button>
      </div>
      <!-- Category filter -->
      <div class="filter-group">
        <button
          v-for="c in categoryFilters"
          :key="c.value"
          class="filter-btn"
          :class="{ active: activeCategory === c.value }"
          @click="activeCategory = c.value as typeof activeCategory"
        >
          {{ c.label }}
        </button>
      </div>
    </div>

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
        v-for="node in filteredNodes"
        :key="node.id"
        :node="node"
        @click="navigateTo(`/nodes/${node.id}`)"
        @connect="n => store.setConnected(n.id)"
        @cut="store.disconnect()"
      />
      <div v-if="!filteredNodes.length" class="t-empty">Aucun noeud trouvé</div>
    </div>

  </div>

  <AddNodeModal v-if="showAddNode" @close="showAddNode = false" />
</template>

<style scoped>
.nodes-page { display: flex; flex-direction: column; }
</style>
