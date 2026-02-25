<template>
  <div class="connections-page">

    <!-- Header -->
    <div class="page-header">
      <div>
        <div class="page-title">Connexions</div>
        <div class="page-sub">Historique des sessions VPN</div>
      </div>
    </div>

    <!-- Stats -->
    <div class="stat-grid mb">
      <StatCard label="Sessions aujourd'hui" value="8"   sub="+3 vs hier"      color="accent" />
      <StatCard label="Durée totale"         value="4.2" suffix="h" sub="aujourd'hui" color="default" />
      <StatCard label="Données transférées"  value="2.8" suffix="GB" sub="aujourd'hui" color="accent" />
      <StatCard label="Noeud favori"         value="RPi maison" sub="5 sessions" color="default" />
    </div>

    <!-- Filters -->
    <div class="filters mb">
      <div class="filter-group">
        <button v-for="f in statusFilters" :key="f.value"
                class="filter-btn" :class="{ active: activeStatus === f.value }"
                @click="activeStatus = f.value">
          {{ f.label }}
          <span class="filter-count">{{ f.count }}</span>
        </button>
      </div>
    </div>

    <!-- Table -->
    <div class="conn-table">
      <div class="t-head">
        <span>Utilisateur</span>
        <span>Noeud</span>
        <span>Début</span>
        <span>Durée</span>
        <span>↑↓ Trafic</span>
        <span>IP source</span>
        <span>Statut</span>
      </div>

      <div
          v-for="conn in filteredConns"
          :key="conn.id"
          class="conn-row"
          :class="{ active: conn.status === 'active' }"
      >
        <!-- User + device -->
        <div class="user-cell">
          <div class="avatar" :style="`background: ${avatarColors[conn.user] ?? 'var(--surface2)'}`">
            {{ conn.user[0].toUpperCase() }}
          </div>
          <div>
            <div class="user-name">{{ conn.user }}</div>
            <div class="user-device">{{ conn.device }}</div>
          </div>
        </div>

        <!-- Node -->
        <div class="node-cell">
          <div class="nicon" :class="`cat-${conn.category}`">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" v-html="categoryIcons[conn.category]" />
          </div>
          <div>
            <div class="node-name">{{ conn.node }}</div>
            <div class="node-loc">{{ conn.location }}</div>
          </div>
        </div>

        <span class="cell-mono">{{ conn.start }}</span>
        <span class="cell-mono">{{ conn.duration }}</span>
        <div class="traffic-cell">
          <span class="cell-mono up">↑ {{ conn.upload }}</span>
          <span class="cell-mono dn">↓ {{ conn.download }}</span>
        </div>
        <span class="cell-mono">{{ conn.ip }}</span>
        <span>
    <span class="status-badge" :class="`s-${conn.status}`">
      <span class="sdot" />
      {{ conn.status === 'active' ? 'Active' : 'Terminée' }}
    </span>
  </span>
      </div>

      <div v-if="filteredConns.length === 0" class="empty">Aucune connexion</div>
    </div>

  </div>
</template>

<script setup lang="ts">
import type { NodeCategory } from '@umbra/types'

interface Connection {
  id:       string
  user:     string
  device:   string
  node:     string
  location: string
  category: NodeCategory
  start:    string
  duration: string
  upload:   string
  download: string
  ip:       string
  status:   'active' | 'ended'
}

const connections = ref<Connection[]>([
  { id: '1', user: 'alecptt', device: 'MacBook Pro',    node: 'RPi maison',        location: 'Geneva, CH',    category: 'sbc',    start: "auj. 14:28", duration: 'en cours',  upload: '1.2 MB/s', download: '4.8 MB/s', ip: '82.120.44.16', status: 'active' },
  { id: '2', user: 'alecptt', device: 'iPhone 15',      node: 'Hetzner Frankfurt', location: 'Frankfurt, DE', category: 'vps',    start: "auj. 12:14", duration: '1h 14min',  upload: '240 MB',   download: '1.2 GB',   ip: '82.120.44.16', status: 'ended'  },
  { id: '3', user: 'marie',   device: 'iPhone 15',      node: 'VPS Tokyo',         location: 'Tokyo, JP',     category: 'vps',    start: "auj. 09:02", duration: '45min',     upload: '88 MB',    download: '420 MB',   ip: '92.14.33.11',  status: 'ended'  },
  { id: '4', user: 'alecptt', device: 'MacBook Pro',    node: 'RPi maison',        location: 'Geneva, CH',    category: 'sbc',    start: "hier 22:30", duration: '2h 08min',  upload: '560 MB',   download: '2.8 GB',   ip: '82.120.44.16', status: 'ended'  },
  { id: '5', user: 'thomas',  device: 'Linux Desktop',  node: 'GL.iNet Nairobi',   location: 'Nairobi, KE',   category: 'router', start: "hier 18:11", duration: '32min',     upload: '18 MB',    download: '95 MB',    ip: '41.90.64.22',  status: 'ended'  },
  { id: '6', user: 'thomas',  device: 'Linux Desktop',  node: 'Hetzner Frankfurt', location: 'Frankfurt, DE', category: 'vps',    start: "hier 14:55", duration: '3h 22min',  upload: '1.1 GB',   download: '4.2 GB',   ip: '41.90.64.22',  status: 'ended'  },
  { id: '7', user: 'alecptt', device: 'iPad Pro',       node: 'RPi maison',        location: 'Geneva, CH',    category: 'sbc',    start: "hier 08:00", duration: '58min',     upload: '120 MB',   download: '680 MB',   ip: '82.120.44.16', status: 'ended'  },
  { id: '8', user: 'marie',   device: 'MacBook Air',    node: 'DO Singapore',      location: 'Singapore, SG', category: 'vps',    start: "22 fév.",    duration: '1h 40min',  upload: '340 MB',   download: '1.8 GB',   ip: '92.14.33.11',  status: 'ended'  },
])

const activeStatus = ref<'all' | 'active' | 'ended'>('all')

const filteredConns = computed(() =>
    connections.value.filter(c =>
        activeStatus.value === 'all' || c.status === activeStatus.value
    )
)

const statusFilters = computed(() => [
  { value: 'all',    label: 'Toutes',   count: connections.value.length },
  { value: 'active', label: 'Actives',  count: connections.value.filter(c => c.status === 'active').length },
  { value: 'ended',  label: 'Terminées', count: connections.value.filter(c => c.status === 'ended').length },
])

const categoryIcons: Record<string, string> = {
  sbc:     `<rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" stroke-width="1.4"/><rect x="5" y="5" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.2"/>`,
  vps:     `<rect x="1" y="3" width="14" height="4" rx="1.2" stroke="currentColor" stroke-width="1.3"/><rect x="1" y="9" width="14" height="4" rx="1.2" stroke="currentColor" stroke-width="1.3"/><circle cx="12.5" cy="5" r="1" fill="currentColor"/><circle cx="12.5" cy="11" r="1" fill="currentColor"/>`,
  router:  `<rect x="1" y="6" width="14" height="6" rx="1.5" stroke="currentColor" stroke-width="1.3"/><line x1="4" y1="6" x2="4" y2="4" stroke="currentColor" stroke-width="1.3"/><line x1="8" y1="6" x2="8" y2="2" stroke="currentColor" stroke-width="1.3"/><line x1="12" y1="6" x2="12" y2="4" stroke="currentColor" stroke-width="1.3"/>`,
  nas:     `<rect x="2" y="2" width="12" height="4" rx="1" stroke="currentColor" stroke-width="1.3"/><rect x="2" y="7" width="12" height="4" rx="1" stroke="currentColor" stroke-width="1.3"/>`,
  desktop: `<rect x="1" y="2" width="14" height="10" rx="1.5" stroke="currentColor" stroke-width="1.3"/><line x1="8" y1="12" x2="8" y2="15" stroke="currentColor" stroke-width="1.3"/>`,
  other:   `<circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.3"/>`,
}

const avatarColors: Record<string, string> = {
  alecptt: 'linear-gradient(135deg, var(--accent2), var(--accent))',
  marie:   'linear-gradient(135deg, #ff6b6b, #ffa726)',
  thomas:  'linear-gradient(135deg, #4fa8ff, var(--accent2))',
}
</script>

<style scoped>
.connections-page { display: flex; flex-direction: column; }
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

/* Stat grid */
.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--sp-3);
}

/* Filters */
.filters { display: flex; }

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
.filter-btn:hover  { color: var(--text); }
.filter-btn.active { background: var(--surface2); color: var(--text); }

.filter-count {
  font-size: 9px;
  color: var(--muted);
  background: var(--surface2);
  padding: 1px 5px;
  border-radius: 3px;
}

/* Table */
.conn-table {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r);
  overflow: hidden;
}

.t-head {
  display: grid;
  grid-template-columns: 1.4fr 1.6fr 0.9fr 0.7fr 1fr 1fr 0.8fr;
  padding: 9px 16px;
  border-bottom: 1px solid var(--border);
  font-size: 9px;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: .1em;
}


.conn-row {
  display: grid;
  grid-template-columns: 1.4fr 1.6fr 0.9fr 0.7fr 1fr 1fr 0.8fr;
  padding: 11px 16px;
  border-bottom: 1px solid var(--border);
  align-items: center;
  transition: background .1s;
}
.conn-row:last-child { border-bottom: none; }
.conn-row:hover      { background: var(--surface2); }
.conn-row.active     { background: rgba(79,255,176,.04); border-left: 2px solid var(--accent); padding-left: 14px; }

.user-cell {
  display: flex;
  align-items: center;
  gap: 9px;
}

.avatar {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 600;
  color: var(--bg);
  flex-shrink: 0;
}

.user-name   { font-size: 12px; font-weight: 500; color: var(--text); }
.user-device { font-size: 9px; color: var(--muted); margin-top: 1px; }

.traffic-cell {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.up { color: var(--accent) !important; }
.dn { color: var(--accent2) !important; }

/* Node cell */
.node-cell {
  display: flex;
  align-items: center;
  gap: 9px;
}

.nicon {
  width: 26px;
  height: 26px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.cat-sbc     { background: rgba(79,255,176,.12);  color: var(--accent);  }
.cat-vps     { background: rgba(79,168,255,.15);  color: #4fa8ff;        }
.cat-router  { background: rgba(255,183,79,.12);  color: var(--warning); }
.cat-nas     { background: rgba(123,110,246,.15); color: var(--accent2); }
.cat-desktop { background: rgba(200,200,220,.1);  color: var(--muted);   }
.cat-other   { background: var(--surface2);       color: var(--muted);   }

.node-name { font-size: 12px; font-weight: 500; color: var(--text); }
.node-loc  { font-size: 9px;  color: var(--muted); margin-top: 1px; }

.cell-mono { font-size: 11px; color: var(--muted); font-family: var(--font-mono); }

/* Status badge */
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 10px;
  padding: 3px 8px;
  border-radius: 4px;
  font-weight: 500;
}

.sdot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  flex-shrink: 0;
}

.s-active {
  background: rgba(79,255,176,.1);
  color: var(--accent);
  border: 1px solid rgba(79,255,176,.25);
}
.s-active .sdot { background: var(--accent); animation: pulse 2s infinite; }

.s-ended { background: var(--surface2); color: var(--muted); }
.s-ended .sdot { background: var(--muted); }

.empty {
  padding: 32px;
  text-align: center;
  font-size: 11px;
  color: var(--muted);
}

@keyframes pulse {
  0%,100% { box-shadow: 0 0 0 0 rgba(79,255,176,.4); }
  50%     { box-shadow: 0 0 0 4px rgba(79,255,176,0); }
}
</style>