<script setup lang="ts">
definePageMeta({ layout: 'default' })

const { t } = useT()

type Severity = 'critical' | 'warning' | 'info'

interface Alert {
  id:             string
  type:           string
  severity:       Severity
  node:           string
  thresholdValue: number | null
  triggeredAt:    string | null
  read:           boolean
}

const alerts  = ref<Alert[]>([])
const loading = ref(false)
const error   = ref<string | null>(null)

function alertTitle(type: string): string {
  return t(`alert_type_${type}`)
}
function alertDetail(type: string, value: number | null): string {
  return t(`alert_detail_${type}`, value !== null ? { value: String(value) } : {})
}
function alertTime(iso: string | null): string {
  if (!iso) return t('common_dash')
  const d    = new Date(iso)
  const diff = (Date.now() - d.getTime()) / 1000
  if (diff < 120)            return t('common_just_now')
  if (diff < 3600)           return t('common_min_ago', { n: Math.floor(diff / 60) })
  if (diff < 86400)          return t('common_hour_ago', { n: Math.floor(diff / 3600) })
  return t('common_day_ago', { n: Math.floor(diff / 86400) })
}

async function fetchAlerts() {
  loading.value = true
  error.value   = null
  try {
    const api = useApi()
    const res = await api<{ data: any[] }>('/alerts')
    alerts.value = res.data.map((a) => ({ ...a, read: !a.isActive }))
  } catch {
    error.value = t('alerts_empty')
  } finally {
    loading.value = false
  }
}

onMounted(fetchAlerts)

const activeSeverity = ref<Severity | 'all'>('all')

const filteredAlerts = computed(() =>
  alerts.value.filter(a =>
    activeSeverity.value === 'all' || a.severity === activeSeverity.value
  )
)

const unread = computed(() => alerts.value.filter(a => !a.read).length)

const severityFilters = computed(() => [
  { value: 'all',      label: t('alerts_filter_all'),      count: alerts.value.length },
  { value: 'critical', label: t('alerts_filter_critical'), count: alerts.value.filter(a => a.severity === 'critical').length },
  { value: 'warning',  label: t('alerts_filter_warning'),  count: alerts.value.filter(a => a.severity === 'warning').length },
  { value: 'info',     label: t('alerts_filter_info'),     count: alerts.value.filter(a => a.severity === 'info').length },
])

const severityLabel = computed<Record<Severity, string>>(() => ({
  critical: t('alerts_sev_critical'),
  warning:  t('alerts_sev_warning'),
  info:     t('alerts_sev_info'),
}))

function markAllRead() {
  alerts.value.forEach(a => { a.read = true })
}
</script>

<template>
  <div class="alerts-page">

    <div class="page-header">
      <div>
        <div class="page-title">{{ t('alerts_title') }}</div>
        <div class="page-sub">{{ t('alerts_sub', { unread, total: alerts.length }) }}</div>
      </div>
      <button class="btn-ghost" @click="markAllRead">{{ t('alerts_mark_all') }}</button>
    </div>

    <div class="filters mb">
      <div class="filter-group">
        <button
          v-for="f in severityFilters"
          :key="f.value"
          class="filter-btn"
          :class="{ active: activeSeverity === f.value }"
          @click="activeSeverity = f.value as typeof activeSeverity"
        >
          {{ f.label }}
          <span class="filter-count">{{ f.count }}</span>
        </button>
      </div>
    </div>

    <div v-if="loading" class="empty">{{ t('common_loading') }}</div>

    <div v-else class="alert-list">
      <div
        v-for="alert in filteredAlerts"
        :key="alert.id"
        class="alert-row"
        :class="[`sev-${alert.severity}`, { unread: !alert.read }]"
        @click="alert.read = true"
      >
        <div class="alert-icon" :class="`icon-${alert.severity}`">
          <UIcon v-if="alert.severity === 'critical'" name="i-lucide-triangle-alert" style="width:13px;height:13px" />
          <UIcon v-else-if="alert.severity === 'warning'" name="i-lucide-circle-alert" style="width:13px;height:13px" />
          <UIcon v-else name="i-lucide-circle-check" style="width:13px;height:13px" />
        </div>

        <div class="alert-body">
          <div class="alert-title">
            {{ alertTitle(alert.type) }}
            <span v-if="!alert.read" class="unread-dot" />
          </div>
          <div class="alert-detail">{{ alertDetail(alert.type, alert.thresholdValue) }}</div>
          <div class="alert-meta">
            <span class="alert-node">{{ alert.node }}</span>
            <span>·</span>
            <span>{{ alertTime(alert.triggeredAt) }}</span>
          </div>
        </div>

        <div class="alert-sev-badge" :class="`badge-${alert.severity}`">
          {{ severityLabel[alert.severity] }}
        </div>
      </div>

      <div v-if="filteredAlerts.length === 0 && !loading" class="empty">{{ t('alerts_empty') }}</div>
    </div>

  </div>
</template>

<style scoped>
.alerts-page { display: flex; flex-direction: column; }
</style>
