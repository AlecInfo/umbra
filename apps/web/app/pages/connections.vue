<script setup lang="ts">
definePageMeta({ layout: 'default' })

type NodeCategory = 'sbc' | 'vps' | 'router' | 'nas' | 'desktop' | 'other'

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
  { id: '1', user: 'alecptt', device: 'MacBook Pro',   node: 'raspi-home',    location: 'Paris, FR',     category: 'sbc',    start: 'auj. 14:28', duration: 'en cours',  upload: '1.2 MB/s', download: '4.8 MB/s', ip: '82.120.44.16', status: 'active' },
  { id: '2', user: 'alecptt', device: 'iPhone 15',     node: 'vps-lon-01',   location: 'London, GB',    category: 'vps',    start: 'auj. 12:14', duration: '1h 14min',  upload: '240 MB',   download: '1.2 GB',   ip: '82.120.44.16', status: 'ended'  },
  { id: '3', user: 'marie',   device: 'iPhone 15',     node: 'vps-sgp-01',   location: 'Singapore, SG', category: 'vps',    start: 'auj. 09:02', duration: '45min',     upload: '88 MB',    download: '420 MB',   ip: '92.14.33.11',  status: 'ended'  },
  { id: '4', user: 'alecptt', device: 'MacBook Pro',   node: 'raspi-home',   location: 'Paris, FR',     category: 'sbc',    start: 'hier 22:30', duration: '2h 08min',  upload: '560 MB',   download: '2.8 GB',   ip: '82.120.44.16', status: 'ended'  },
  { id: '5', user: 'thomas',  device: 'Linux Desktop', node: 'openwrt-router',location: 'Paris, FR',    category: 'router', start: 'hier 18:11', duration: '32min',     upload: '18 MB',    download: '95 MB',    ip: '41.90.64.22',  status: 'ended'  },
  { id: '6', user: 'thomas',  device: 'Linux Desktop', node: 'vps-lon-01',   location: 'London, GB',    category: 'vps',    start: 'hier 14:55', duration: '3h 22min',  upload: '1.1 GB',   download: '4.2 GB',   ip: '41.90.64.22',  status: 'ended'  },
  { id: '7', user: 'alecptt', device: 'iPad Pro',      node: 'raspi-home',   location: 'Paris, FR',     category: 'sbc',    start: 'hier 08:00', duration: '58min',     upload: '120 MB',   download: '680 MB',   ip: '82.120.44.16', status: 'ended'  },
  { id: '8', user: 'marie',   device: 'MacBook Air',   node: 'vps-sgp-01',   location: 'Singapore, SG', category: 'vps',    start: '22 fév.',    duration: '1h 40min',  upload: '340 MB',   download: '1.8 GB',   ip: '92.14.33.11',  status: 'ended'  },
])

const activeStatus = ref<'all' | 'active' | 'ended'>('all')

const filteredConns = computed(() =>
  connections.value.filter(c =>
    activeStatus.value === 'all' || c.status === activeStatus.value
  )
)

const statusFilters = computed(() => [
  { value: 'all',    label: 'Toutes',    count: connections.value.length },
  { value: 'active', label: 'Actives',   count: connections.value.filter(c => c.status === 'active').length },
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

<template>
  <div class="connections-page">

    <div class="page-header">
      <div>
        <div class="page-title">Connexions</div>
        <div class="page-sub">Historique des sessions VPN</div>
      </div>
    </div>

    <div class="stat-grid mb">
      <div class="stat-card">
        <div class="stat-lbl">Sessions aujourd'hui</div>
        <div class="stat-val"><span style="color: var(--accent)">8</span></div>
        <div class="stat-sub">+3 vs hier</div>
      </div>
      <div class="stat-card">
        <div class="stat-lbl">Durée totale</div>
        <div class="stat-val"><span>4.2</span><span class="stat-suffix">h</span></div>
        <div class="stat-sub">aujourd'hui</div>
      </div>
      <div class="stat-card">
        <div class="stat-lbl">Données transférées</div>
        <div class="stat-val"><span style="color: var(--accent)">2.8</span><span class="stat-suffix">GB</span></div>
        <div class="stat-sub">aujourd'hui</div>
      </div>
      <div class="stat-card">
        <div class="stat-lbl">Noeud favori</div>
        <div class="stat-val" style="font-size: 18px"><span>raspi-home</span></div>
        <div class="stat-sub">5 sessions</div>
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
        <div class="user-cell">
          <div class="avatar" :style="`background: ${avatarColors[conn.user] ?? 'var(--surface2)'}`">
            {{ conn.user[0].toUpperCase() }}
          </div>
          <div>
            <div class="user-name">{{ conn.user }}</div>
            <div class="user-device">{{ conn.device }}</div>
          </div>
        </div>

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

<style scoped>
.connections-page { display: flex; flex-direction: column; }
</style>
