<script setup lang="ts">
definePageMeta({ layout: 'default' })

const { t } = useT()

type Severity = 'critical' | 'warning' | 'info'

interface Alert {
  id:             string
  type:           string
  severity:       Severity
  node:           string
  nodeId:         string
  thresholdValue: number | null
  thresholdUnit:  string | null
  // The reading when the rule last fired — not the threshold.
  lastValue:      number | null
  firing:         boolean
  triggeredAt:    string | null
  resolvedAt:     string | null
}

const alerts  = ref<Alert[]>([])
const loading = ref(false)
const error   = ref(false)

function alertTitle(type: string): string {
  return t(`alert_type_${type}`)
}

function alertDetail(a: Alert): string {
  if (a.lastValue === null || a.thresholdValue === null) return t(`alert_detail_${a.type}`)
  const unit = a.thresholdUnit ?? ''
  return t('alert_detail_metric', {
    value:     `${Math.round(a.lastValue)}${unit}`,
    threshold: `${a.thresholdValue}${unit}`,
  })
}

function ago(iso: string | null): string {
  if (!iso) return t('common_dash')
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 120)   return t('common_just_now')
  if (diff < 3600)  return t('common_min_ago', { n: Math.floor(diff / 60) })
  if (diff < 86400) return t('common_hour_ago', { n: Math.floor(diff / 3600) })
  return t('common_day_ago', { n: Math.floor(diff / 86400) })
}

async function fetchAlerts() {
  loading.value = true
  error.value   = false
  try {
    const api = useApi()
    const res = await api<{ data: Alert[] }>('/alerts')
    alerts.value = res.data
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
}

// Alerts change with heartbeats; keep the page current while it is open.
let timer: ReturnType<typeof setInterval> | null = null
onMounted(() => { fetchAlerts(); timer = setInterval(fetchAlerts, 15_000) })
onUnmounted(() => { if (timer) clearInterval(timer) })

const activeFilter = ref<'all' | 'firing' | 'resolved'>('all')

const filteredAlerts = computed(() =>
  alerts.value.filter(a =>
    activeFilter.value === 'all' || (activeFilter.value === 'firing') === a.firing
  )
)

const firingCount = computed(() => alerts.value.filter(a => a.firing).length)

const filters = computed(() => [
  { value: 'all',      label: t('alerts_filter_all'),      count: alerts.value.length },
  { value: 'firing',   label: t('alerts_filter_firing'),   count: firingCount.value },
  { value: 'resolved', label: t('alerts_filter_resolved'), count: alerts.value.length - firingCount.value },
])

const severityLabel = computed<Record<Severity, string>>(() => ({
  critical: t('alerts_sev_critical'),
  warning:  t('alerts_sev_warning'),
  info:     t('alerts_sev_info'),
}))
</script>

<template>
  <div class="alerts-page">

    <div class="page-header">
      <div>
        <div class="page-title">{{ t('alerts_title') }}</div>
        <div class="page-sub">{{ t('alerts_sub', { firing: firingCount, total: alerts.length }) }}</div>
      </div>
    </div>

    <div class="filters mb">
      <div class="filter-group">
        <button
          v-for="f in filters"
          :key="f.value"
          class="filter-btn"
          :class="{ active: activeFilter === f.value }"
          @click="activeFilter = f.value as typeof activeFilter"
        >
          {{ f.label }}
          <span class="filter-count">{{ f.count }}</span>
        </button>
      </div>
    </div>

    <div v-if="loading && !alerts.length" class="empty">{{ t('common_loading') }}</div>
    <div v-else-if="error && !alerts.length" class="empty">{{ t('alerts_load_failed') }}</div>

    <div v-else class="alert-list">
      <NuxtLink
        v-for="alert in filteredAlerts"
        :key="alert.id"
        :to="`/nodes/${alert.nodeId}`"
        class="alert-row"
        :class="[alert.firing ? `sev-${alert.severity}` : 'sev-resolved', { unread: alert.firing }]"
      >
        <div class="alert-icon" :class="alert.firing ? `icon-${alert.severity}` : 'icon-info'">
          <UIcon v-if="!alert.firing" name="i-lucide-circle-check" style="width:13px;height:13px" />
          <UIcon v-else-if="alert.severity === 'critical'" name="i-lucide-triangle-alert" style="width:13px;height:13px" />
          <UIcon v-else name="i-lucide-circle-alert" style="width:13px;height:13px" />
        </div>

        <div class="alert-body">
          <div class="alert-title">
            {{ alertTitle(alert.type) }}
            <span v-if="alert.firing" class="unread-dot" />
          </div>
          <div class="alert-detail">{{ alertDetail(alert) }}</div>
          <div class="alert-meta">
            <span class="alert-node">{{ alert.node }}</span>
            <span>·</span>
            <span>{{ t('alerts_since', { when: ago(alert.triggeredAt) }) }}</span>
            <template v-if="!alert.firing">
              <span>·</span>
              <span>{{ t('alerts_resolved_when', { when: ago(alert.resolvedAt) }) }}</span>
            </template>
          </div>
        </div>

        <div class="alert-sev-badge" :class="alert.firing ? `badge-${alert.severity}` : 'badge-info'">
          {{ alert.firing ? severityLabel[alert.severity] : t('alerts_resolved') }}
        </div>
      </NuxtLink>

      <div v-if="filteredAlerts.length === 0" class="empty">{{ t('alerts_empty') }}</div>
    </div>

  </div>
</template>

<style scoped>
.alerts-page { display: flex; flex-direction: column; }
.alert-row { text-decoration: none; color: inherit; }
/* A resolved alert is history: same row, no colour shouting for attention. */
.sev-resolved { border-left: 2px solid var(--border2); padding-left: 14px; opacity: .75; }
</style>
