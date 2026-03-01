<script setup lang="ts">
definePageMeta({ layout: 'default' })

type Severity = 'critical' | 'warning' | 'info'

interface Alert {
  id:       string
  severity: Severity
  title:    string
  detail:   string
  node:     string
  time:     string
  read:     boolean
}

const alerts = ref<Alert[]>([
  { id: '1', severity: 'critical', title: 'CPU critique',          detail: 'CPU à 94% depuis plus de 10 minutes.',          node: 'synology-nas',   time: 'il y a 3min',  read: false },
  { id: '2', severity: 'critical', title: 'Noeud hors ligne',      detail: 'macbook-pro ne répond plus depuis 2 heures.',    node: 'macbook-pro',    time: 'il y a 2h',    read: false },
  { id: '3', severity: 'warning',  title: 'Température élevée',    detail: 'Température à 68°C, seuil à 85°C.',             node: 'synology-nas',   time: 'il y a 8min',  read: false },
  { id: '4', severity: 'warning',  title: 'Disque presque plein',  detail: 'Disque à 92%, espace restant : 3.8 GB.',         node: 'synology-nas',   time: 'il y a 1h',    read: true  },
  { id: '5', severity: 'warning',  title: 'Latence élevée',        detail: 'Latence VPN à 280ms, pic détecté.',              node: 'vps-nyc-01',     time: 'il y a 3h',    read: true  },
  { id: '6', severity: 'info',     title: 'Agent mis à jour',      detail: 'Agent mis à jour vers v0.2.1 avec succès.',      node: 'raspi-home',     time: 'hier 08:30',   read: true  },
  { id: '7', severity: 'info',     title: 'Nouveau pair connecté', detail: 'thomas (Linux Desktop) s\'est connecté.',        node: 'raspi-home',     time: 'hier 14:28',   read: true  },
])

const activeSeverity = ref<Severity | 'all'>('all')

const filteredAlerts = computed(() =>
  alerts.value.filter(a =>
    activeSeverity.value === 'all' || a.severity === activeSeverity.value
  )
)

const unread = computed(() => alerts.value.filter(a => !a.read).length)

const severityFilters = computed(() => [
  { value: 'all',      label: 'Toutes',    count: alerts.value.length },
  { value: 'critical', label: 'Critiques', count: alerts.value.filter(a => a.severity === 'critical').length },
  { value: 'warning',  label: 'Avertiss.', count: alerts.value.filter(a => a.severity === 'warning').length },
  { value: 'info',     label: 'Info',      count: alerts.value.filter(a => a.severity === 'info').length },
])

const severityLabel: Record<Severity, string> = {
  critical: 'Critique',
  warning:  'Avertiss.',
  info:     'Info',
}

function markAllRead() {
  alerts.value.forEach(a => { a.read = true })
}
</script>

<template>
  <div class="alerts-page">

    <div class="page-header">
      <div>
        <div class="page-title">Alertes</div>
        <div class="page-sub">{{ unread }} non lues · {{ alerts.length }} au total</div>
      </div>
      <button class="btn-ghost" @click="markAllRead">Tout marquer comme lu</button>
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

    <div class="alert-list">
      <div
        v-for="alert in filteredAlerts"
        :key="alert.id"
        class="alert-row"
        :class="[`sev-${alert.severity}`, { unread: !alert.read }]"
        @click="alert.read = true"
      >
        <div class="alert-icon" :class="`icon-${alert.severity}`">
          <svg v-if="alert.severity === 'critical'" width="13" height="13" viewBox="0 0 16 16" fill="none">
            <path d="M8 2L14.5 13H1.5L8 2z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
            <line x1="8" y1="6" x2="8" y2="9.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
            <circle cx="8" cy="11.5" r=".8" fill="currentColor"/>
          </svg>
          <svg v-else-if="alert.severity === 'warning'" width="13" height="13" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.4"/>
            <line x1="8" y1="5" x2="8" y2="8.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
            <circle cx="8" cy="11" r=".8" fill="currentColor"/>
          </svg>
          <svg v-else width="13" height="13" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.4"/>
            <path d="M5 8l2 2 4-4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
          </svg>
        </div>

        <div class="alert-body">
          <div class="alert-title">
            {{ alert.title }}
            <span v-if="!alert.read" class="unread-dot" />
          </div>
          <div class="alert-detail">{{ alert.detail }}</div>
          <div class="alert-meta">
            <span class="alert-node">{{ alert.node }}</span>
            <span>·</span>
            <span>{{ alert.time }}</span>
          </div>
        </div>

        <div class="alert-sev-badge" :class="`badge-${alert.severity}`">
          {{ severityLabel[alert.severity] }}
        </div>
      </div>

      <div v-if="filteredAlerts.length === 0" class="empty">Aucune alerte</div>
    </div>

  </div>
</template>

<style scoped>
.alerts-page { display: flex; flex-direction: column; }
</style>
