<script setup lang="ts">
import type { NodeStatus, NodeCategory } from '~/stores/nodes'

definePageMeta({ layout: 'default' })

const store = useNodesStore()
const { t } = useT()
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
  { value: 'all',       label: t('nodes_filter_all'),       count: store.nodes.length },
  { value: 'online',    label: t('nodes_filter_online'),    count: store.nodes.filter(n => n.status === 'online').length },
  { value: 'connected', label: t('nodes_filter_connected'), count: store.nodes.filter(n => n.status === 'connected').length },
  { value: 'warning',   label: t('nodes_filter_warning'),   count: store.nodes.filter(n => n.status === 'warning').length },
  { value: 'offline',   label: t('nodes_filter_offline'),   count: store.nodes.filter(n => n.status === 'offline').length },
])

const categoryFilters = computed(() => [
  { value: 'all',     label: t('nodes_filter_all_f') },
  { value: 'sbc',     label: t('nodes_cat_sbc') },
  { value: 'vps',     label: t('nodes_cat_vps') },
  { value: 'router',  label: t('nodes_cat_router') },
  { value: 'nas',     label: t('nodes_cat_nas') },
  { value: 'desktop', label: t('nodes_cat_desktop') },
])

const subtitleLabel = computed(() => {
  const n = store.nodes.length
  return t(n > 1 ? 'nodes_sub_many' : 'nodes_sub_one', { n })
})
</script>

<template>
  <div class="nodes-page">

    <div class="page-header">
      <div>
        <div class="page-title">{{ t('nodes_title') }}</div>
        <div class="page-sub">{{ subtitleLabel }}</div>
      </div>
      <button class="btn-primary" @click="showAddNode = true">{{ t('dash_new_node') }}</button>
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
        <span>{{ t('node_th_node') }}</span>
        <span>{{ t('node_th_location') }}</span>
        <span>{{ t('node_th_status') }}</span>
        <span>{{ t('node_th_latency') }}</span>
        <span>{{ t('node_th_cpu') }}</span>
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
      <div v-if="!filteredNodes.length" class="t-empty">{{ t('nodes_empty') }}</div>
    </div>

  </div>

  <AddNodeModal v-if="showAddNode" @close="showAddNode = false" />
</template>

<style scoped>
.nodes-page { display: flex; flex-direction: column; }
</style>
