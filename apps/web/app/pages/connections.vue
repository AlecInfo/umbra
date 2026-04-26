<script setup lang="ts">
import type { NodeCategory } from '~/stores/nodes'
import { categoryIcons } from '~/composables/useCategoryIcons'

definePageMeta({ layout: 'default' })

const { t } = useT()

interface Connection {
  id:             string
  user:           string
  device:         string | null
  node:           string
  location:       string
  category:       NodeCategory
  connectedAt:    string
  disconnectedAt: string | null
  upload:         string
  download:       string
  clientIp:       string | null
  status:         'active' | 'ended'
}

const connections = ref<Connection[]>([])
const loading     = ref(false)
const error       = ref<string | null>(null)

function fmtDuration(connectedAt: string, disconnectedAt: string | null): string {
  if (!disconnectedAt) return t('conn_duration_live')
  const ms = new Date(disconnectedAt).getTime() - new Date(connectedAt).getTime()
  const h  = Math.floor(ms / 3_600_000)
  const m  = Math.floor((ms % 3_600_000) / 60_000)
  if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}min`
  return `${m}min`
}

function fmtTime(iso: string): string {
  const d    = new Date(iso)
  const now  = new Date()
  const loc  = t('date_locale')
  const diff = (now.getTime() - d.getTime()) / 1000
  if (diff < 86400) return d.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' })
  if (diff < 172800) return d.toLocaleString(loc, { weekday: 'long', hour: '2-digit', minute: '2-digit' })
  return d.toLocaleString(loc, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

async function fetchConnections() {
  loading.value = true
  error.value   = null
  try {
    const api = useApi()
    const res = await api<{ data: Connection[] }>('/connections')
    connections.value = res.data
  } catch {
    error.value = t('conn_empty')
  } finally {
    loading.value = false
  }
}

onMounted(fetchConnections)

const activeStatus = ref<'all' | 'active' | 'ended'>('all')

const filteredConns = computed(() =>
  connections.value.filter(c =>
    activeStatus.value === 'all' || c.status === activeStatus.value
  )
)

const statusFilters = computed(() => [
  { value: 'all',    label: t('conn_filter_all'),    count: connections.value.length },
  { value: 'active', label: t('conn_filter_active'), count: connections.value.filter(c => c.status === 'active').length },
  { value: 'ended',  label: t('conn_filter_ended'),  count: connections.value.filter(c => c.status === 'ended').length },
])

// Stats computed from real data
const todayConns    = computed(() => connections.value.filter(c => new Date(c.connectedAt).toDateString() === new Date().toDateString()).length)
const activeNode    = computed(() => {
  const active = connections.value.find(c => c.status === 'active')
  return active?.node ?? t('common_dash')
})
</script>

<template>
  <div class="connections-page">

    <div class="page-header">
      <div>
        <div class="page-title">{{ t('conn_title') }}</div>
        <div class="page-sub">{{ t('conn_sub') }}</div>
      </div>
    </div>

    <div class="stat-grid mb">
      <div class="stat-card">
        <div class="stat-lbl">{{ t('conn_stat_today') }}</div>
        <div class="stat-val"><span style="color: var(--accent)">{{ todayConns }}</span></div>
        <div class="stat-sub">{{ t('conn_stat_today_sub') }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-lbl">{{ t('conn_stat_dur') }}</div>
        <div class="stat-val"><span>{{ connections.length }}</span><span class="stat-suffix"></span></div>
        <div class="stat-sub">{{ t('conn_stat_dur_sub') }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-lbl">{{ t('conn_stat_data') }}</div>
        <div class="stat-val"><span style="color: var(--accent)">{{ statusFilters[1].count }}</span></div>
        <div class="stat-sub">{{ t('conn_stat_data_sub') }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-lbl">{{ t('conn_stat_fav') }}</div>
        <div class="stat-val" style="font-size: 18px"><span>{{ activeNode }}</span></div>
        <div class="stat-sub">{{ t('conn_stat_fav_sub') }}</div>
      </div>
    </div>

    <div class="filters mb">
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
    </div>

    <div v-if="loading" class="empty">{{ t('common_loading') }}</div>

    <div v-else class="conn-table">
      <div class="t-head">
        <span>{{ t('conn_th_user') }}</span>
        <span>{{ t('conn_th_node') }}</span>
        <span>{{ t('conn_th_start') }}</span>
        <span>{{ t('conn_th_duration') }}</span>
        <span>{{ t('conn_th_traffic') }}</span>
        <span>{{ t('conn_th_ip') }}</span>
        <span>{{ t('conn_th_status') }}</span>
      </div>

      <div
        v-for="conn in filteredConns"
        :key="conn.id"
        class="conn-row"
        :class="{ active: conn.status === 'active' }"
      >
        <div class="user-cell">
          <div class="avatar" style="background: linear-gradient(135deg, var(--accent2), var(--accent))">
            {{ (conn.user[0] ?? '?').toUpperCase() }}
          </div>
          <div>
            <div class="user-name">{{ conn.user }}</div>
            <div class="user-device">{{ conn.device ?? t('common_dash') }}</div>
          </div>
        </div>

        <div class="node-cell">
          <div class="nicon" :class="`cat-${conn.category}`">
            <UIcon :name="categoryIcons[conn.category]" style="width:13px;height:13px" />
          </div>
          <div>
            <div class="node-name">{{ conn.node }}</div>
            <div class="node-loc">{{ conn.location }}</div>
          </div>
        </div>

        <span class="cell-mono">{{ fmtTime(conn.connectedAt) }}</span>
        <span class="cell-mono">{{ fmtDuration(conn.connectedAt, conn.disconnectedAt) }}</span>

        <div class="traffic-cell">
          <span class="cell-mono up">↑ {{ conn.upload }}</span>
          <span class="cell-mono dn">↓ {{ conn.download }}</span>
        </div>

        <span class="cell-mono">{{ conn.clientIp ?? t('common_dash') }}</span>

        <span>
          <span class="status-badge" :class="`s-${conn.status}`">
            <span class="sdot" />
            {{ conn.status === 'active' ? t('conn_status_active') : t('conn_status_ended') }}
          </span>
        </span>
      </div>

      <div v-if="filteredConns.length === 0" class="empty">{{ t('conn_empty') }}</div>
    </div>

  </div>
</template>

<style scoped>
.connections-page { display: flex; flex-direction: column; }
</style>
