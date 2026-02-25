<template>
  <div class="alerts-page">

    <!-- Header -->
    <div class="page-header">
      <div>
        <div class="page-title">Alertes</div>
        <div class="page-sub">{{ unread }} non lues · {{ alerts.length }} au total</div>
      </div>
      <button class="btn-ghost" @click="markAllRead">Tout marquer comme lu</button>
    </div>

    <!-- Filters -->
    <div class="filters mb">
      <div class="filter-group">
        <button v-for="f in severityFilters" :key="f.value"
                class="filter-btn" :class="{ active: activeSeverity === f.value }"
                @click="activeSeverity = f.value">
          {{ f.label }}
          <span class="filter-count">{{ f.count }}</span>
        </button>
      </div>
    </div>

    <!-- List -->
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

      <div v-if="filteredAlerts.length === 0" class="empty">
        Aucune alerte
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
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
  { id: '1', severity: 'critical', title: 'CPU critique',         detail: 'CPU à 94% depuis plus de 10 minutes.',          node: 'Orange Pi Mumbai',   time: 'il y a 3min',  read: false },
  { id: '2', severity: 'critical', title: 'Noeud hors ligne',     detail: 'GL.iNet Nairobi ne répond plus depuis 2 heures.', node: 'GL.iNet Nairobi',    time: 'il y a 2h',    read: false },
  { id: '3', severity: 'warning',  title: 'Température élevée',   detail: 'Température à 71°C, seuil à 85°C.',              node: 'Orange Pi Mumbai',   time: 'il y a 8min',  read: false },
  { id: '4', severity: 'warning',  title: 'Disque presque plein', detail: 'Disque à 87%, espace restant : 3.8 GB.',         node: 'RPi maison',         time: 'il y a 1h',    read: true  },
  { id: '5', severity: 'warning',  title: 'Latence élevée',       detail: 'Latence VPN à 280ms, pic détecté.',              node: 'Hetzner Frankfurt',  time: 'il y a 3h',    read: true  },
  { id: '6', severity: 'info',     title: 'Agent mis à jour',     detail: 'Agent mis à jour vers v1.0.0 avec succès.',      node: 'RPi maison',         time: 'hier 08:30',   read: true  },
  { id: '7', severity: 'info',     title: 'Nouveau pair connecté', detail: 'thomas (Linux Desktop) s\'est connecté.',       node: 'RPi maison',         time: 'hier 14:28',   read: true  },
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
  alerts.value.forEach(a => a.read = true)
}
</script>

<style scoped>
.alerts-page { display: flex; flex-direction: column; }
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

.page-sub { font-size: 11px; color: var(--muted); margin-top: 3px; }

.btn-ghost {
  display: inline-flex;
  align-items: center;
  padding: 7px 14px;
  border-radius: var(--r);
  font-family: var(--font-mono);
  font-size: 11px;
  cursor: pointer;
  background: transparent;
  border: 1px solid var(--border2);
  color: var(--muted);
  transition: all .15s;
}
.btn-ghost:hover { border-color: var(--text); color: var(--text); }

/* Filters */
.filters { display: flex; gap: var(--sp-4); }

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
.filter-btn.active { background: var(--surface2); color: var(--text); }

.filter-count {
  font-size: 9px;
  color: var(--muted);
  background: var(--surface2);
  padding: 1px 5px;
  border-radius: 3px;
}

/* Alert list */
.alert-list {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r);
  overflow: hidden;
}

.alert-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  transition: background .1s;
}
.alert-row:last-child { border-bottom: none; }
.alert-row:hover { background: var(--surface2); }
.alert-row.unread { background: rgba(255,255,255,.02); }

/* Left border accent */
.sev-critical { border-left: 2px solid var(--offline);  padding-left: 14px; }
.sev-warning  { border-left: 2px solid var(--warning);  padding-left: 14px; }
.sev-info     { border-left: 2px solid var(--pending);  padding-left: 14px; }

/* Icon */
.alert-icon {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 1px;
}
.icon-critical { background: rgba(255,79,107,.1);  color: var(--offline); }
.icon-warning  { background: rgba(255,183,79,.1);  color: var(--warning); }
.icon-info     { background: rgba(79,168,255,.1);  color: var(--pending); }

/* Body */
.alert-body { flex: 1; min-width: 0; }

.alert-title {
  font-size: 12px;
  font-weight: 500;
  color: var(--text);
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 3px;
}

.unread-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--accent);
  flex-shrink: 0;
}

.alert-detail {
  font-size: 11px;
  color: var(--muted);
  margin-bottom: 5px;
}

.alert-meta {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 10px;
  color: var(--muted);
}

.alert-node { color: var(--text); font-weight: 500; }

/* Severity badge */
.alert-sev-badge {
  font-size: 9px;
  font-weight: 500;
  padding: 2px 7px;
  border-radius: 10px;
  flex-shrink: 0;
  margin-top: 2px;
}
.badge-critical { background: rgba(255,79,107,.1);  color: var(--offline); border: 1px solid rgba(255,79,107,.2); }
.badge-warning  { background: rgba(255,183,79,.1);  color: var(--warning); border: 1px solid rgba(255,183,79,.2); }
.badge-info     { background: rgba(79,168,255,.1);  color: var(--pending); border: 1px solid rgba(79,168,255,.2); }

.empty {
  padding: 32px;
  text-align: center;
  font-size: 11px;
  color: var(--muted);
}
</style>