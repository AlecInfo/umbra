<template>
  <div class="nodes-page">

    <!-- Page header -->
    <div class="page-header">
      <div>
        <div class="page-title">Noeuds</div>
        <div class="page-sub">{{ store.nodes.length }} noeuds enregistrés</div>
      </div>
      <button class="btn-primary">+ Nouveau noeud</button>
    </div>

    <!-- Filters -->
    <div class="filters mb">
      <div class="filter-group">
        <button
            v-for="f in statusFilters"
            :key="f.value"
            class="filter-btn"
            :class="{ active: activeStatus === f.value }"
            @click="activeStatus = f.value"
        >
          {{ f.label }}
          <span class="filter-count">{{ f.count }}</span>
        </button>
      </div>
      <div class="filter-group">
        <button
            v-for="c in categoryFilters"
            :key="c.value"
            class="filter-btn"
            :class="{ active: activeCategory === c.value }"
            @click="activeCategory = c.value"
        >
          {{ c.label }}
        </button>
      </div>
    </div>

    <!-- Table -->
    <NodeTable
        :nodes="filteredNodes"
        @connect="n => store.setConnected(n.id)"
        @cut="store.disconnect()"
        @click-node="n => navigateTo(`/nodes/${n.id}`)"
    />
  </div>
</template>

<script setup lang="ts">
import type { NodeStatus, NodeCategory } from '@umbra/types'

const store = useNodesStore()
onMounted(() => { if (!store.nodes.length) store.fetchNodes() })

const activeStatus   = ref<NodeStatus | 'all'>('all')
const activeCategory = ref<NodeCategory | 'all'>('all')

const filteredNodes = computed(() => {
  return store.nodes.filter(n => {
    const statusOk   = activeStatus.value   === 'all' || n.status   === activeStatus.value
    const categoryOk = activeCategory.value === 'all' || n.category === activeCategory.value
    return statusOk && categoryOk
  })
})

const statusFilters = computed(() => [
  { value: 'all',       label: 'Tous',        count: store.nodes.length },
  { value: 'online',    label: 'En ligne',    count: store.nodes.filter(n => n.status === 'online').length },
  { value: 'connected', label: 'Connecté',    count: store.nodes.filter(n => n.status === 'connected').length },
  { value: 'warning',   label: 'Alerte',      count: store.nodes.filter(n => n.status === 'warning').length },
  { value: 'offline',   label: 'Hors ligne',  count: store.nodes.filter(n => n.status === 'offline').length },
])

const categoryFilters = computed(() => [
  { value: 'all',     label: 'Toutes' },
  { value: 'sbc',     label: 'SBC' },
  { value: 'vps',     label: 'VPS' },
  { value: 'router',  label: 'Router' },
  { value: 'nas',     label: 'NAS' },
  { value: 'desktop', label: 'Desktop' },
])
</script>

<style scoped>
.nodes-page {
  display: flex;
  flex-direction: column;
}

.mb { margin-bottom: var(--sp-5); }

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

.filters {
  display: flex;
  gap: var(--sp-4);
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  gap: var(--sp-1);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r);
  padding: 3px;
}

.filter-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 4px;
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--muted);
  background: none;
  border: none;
  cursor: pointer;
  transition: all .15s;
}

.filter-btn:hover { color: var(--text); }

.filter-btn.active {
  background: var(--surface2);
  color: var(--text);
}

.filter-count {
  font-size: 9px;
  color: var(--muted);
  background: var(--surface2);
  padding: 1px 5px;
  border-radius: 3px;
}

.filter-btn.active .filter-count {
  background: var(--border2);
}
</style>