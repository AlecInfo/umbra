<template>
  <div v-if="node" class="detail-page">

    <!-- Back -->
    <div class="back-link" @click="navigateTo('/nodes')">← Mes noeuds</div>

    <!-- Page header -->
    <div class="page-header">
      <div class="header-left">
        <div class="node-title">
          <div class="nicon" :class="`cat-${node.category}`">
            <svg width="17" height="17" viewBox="0 0 16 16" fill="none" v-html="categoryIcon" />
          </div>
          <span class="page-title">{{ node.name }}</span>
          <StatusPill :status="node.status" />
          <CategoryBadge :category="node.category" />
        </div>
        <div class="page-sub">{{ node.ip }} · {{ node.location }} · Agent v1.0.0</div>
      </div>
      <div class="header-actions">
        <button class="btn-ghost" @click="showShare = true">Partager</button>
        <button class="btn-ghost">Configurer</button>
        <button
            class="btn-primary"
            :class="{ 'btn-danger': node.status === 'connected' }"
            :disabled="node.status === 'offline'"
            @click="onConnect"
        >
          {{ node.status === 'connected' ? 'Déconnecter' : 'Se connecter' }}
        </button>
      </div>
    </div>

    <!-- VPN bar -->
    <VpnBar
        v-if="node.status === 'connected'"
        :node="node"
        upload="1.2 MB/s"
        download="4.8 MB/s"
        class="mb"
        @cut="store.disconnect()"
    />

    <!-- Main grid -->
    <div class="detail-grid">

      <!-- Left col -->
      <div class="col-left">
        <div class="card">
          <div class="card-header">
            <div class="card-title">Métriques système</div>
            <div class="card-meta">
              <div class="period-group">
                <button
                    v-for="p in periods"
                    :key="p.value"
                    class="period-btn"
                    :class="{ active: period === p.value }"
                    @click="period = p.value"
                >
                  {{ p.label }}
                </button>
              </div>
              <span class="heartbeat">heartbeat il y a 2s</span>
            </div>
          </div>
          <div class="card-body">
            <!-- Metric boxes — step 2 -->
            <!-- Metric boxes -->
            <div class="metrics-grid">
              <div class="metric-box">
                <div class="metric-lbl">CPU</div>
                <div class="metric-val">{{ node.cpu ?? '—' }}<span class="metric-unit">%</span></div>
                <div class="metric-bar"><div class="metric-fill" :style="`width:${node.cpu ?? 0}%;background:${cpuColor}`" /></div>
                <div class="metric-sub">load avg 0.18 · 4 cœurs</div>
              </div>
              <div class="metric-box">
                <div class="metric-lbl">Mémoire</div>
                <div class="metric-val">{{ node.ram ?? '—' }}<span class="metric-unit">%</span></div>
                <div class="metric-bar"><div class="metric-fill" :style="`width:${node.ram ?? 0}%;background:${ramColor}`" /></div>
                <div class="metric-sub">{{ ramUsed }} / {{ ramTotal }} GB</div>
              </div>
              <div class="metric-box">
                <div class="metric-lbl">Disque</div>
                <div class="metric-val">{{ node.disk ?? '—' }}<span class="metric-unit">%</span></div>
                <div class="metric-bar"><div class="metric-fill" :style="`width:${node.disk ?? 0}%;background:${diskColor}`" /></div>
                <div class="metric-sub">15.4 / 29.3 GB</div>
              </div>
              <div class="metric-box">
                <div class="metric-lbl">Température</div>
                <div class="metric-val" :style="tempStyle">{{ node.temp ?? '—' }}<span class="metric-unit">°C</span></div>
                <div class="metric-bar"><div class="metric-fill" :style="`width:${node.temp ?? 0}%;background:${tempColor}`" /></div>
                <div class="metric-sub">seuil critique : 85°C</div>
              </div>
              <div class="metric-box">
                <div class="metric-lbl">Latence VPN</div>
                <div class="metric-val accent">{{ node.latency ?? '—' }}<span class="metric-unit">ms</span></div>
                <div class="metric-bar"><div class="metric-fill fill-green" :style="`width:${Math.min((node.latency ?? 0) / 2, 100)}%`" /></div>
                <div class="metric-sub">ping backend : 14ms</div>
              </div>
              <div class="metric-box">
                <div class="metric-lbl">Uptime</div>
                <div class="metric-val uptime-val">{{ uptimeDisplay }}</div>
                <div class="metric-bar"><div class="metric-fill fill-green" style="width:100%" /></div>
                <div class="metric-sub">depuis le {{ uptimeSince }}</div>
              </div>
            </div>

            <!-- Charts separator -->
            <div class="chart-sep">
              <span class="chart-sep-lbl">Historique — <span class="accent">{{ periodLabel }}</span></span>
              <div class="chart-sep-line" />
            </div>

            <!-- Charts placeholder -->
            <div class="charts-placeholder">Graphiques — à venir</div>
          </div>
        </div>
      </div>

      <!-- Right col -->
      <div class="col-right">

        <!-- Machine -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">Machine</div>
          </div>
          <div class="card-body card-body--tight">
            <div class="info-row"><span class="info-lbl">Hardware</span><span class="info-val">Raspberry Pi 4B</span></div>
            <div class="info-row"><span class="info-lbl">RAM</span><span class="info-val">4 GB</span></div>
            <div class="info-row"><span class="info-lbl">OS</span><span class="info-val">Ubuntu 24.04 LTS</span></div>
            <div class="info-row"><span class="info-lbl">Arch.</span><span class="info-val">arm64</span></div>
            <div class="info-row"><span class="info-lbl">IP publique</span><span class="info-val">203.0.113.42 <span class="badge-blue">IPv4</span></span></div>
            <div class="info-row"><span class="info-lbl">Localisation</span><span class="info-val">{{ node.location }}</span></div>
            <div class="info-row"><span class="info-lbl">ISP</span><span class="info-val">Swisscom AG</span></div>
          </div>
        </div>

        <!-- WireGuard -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">WireGuard</div>
            <span class="badge-accent">interface umbra0</span>
          </div>
          <div class="card-body card-body--tight">
            <div class="info-row"><span class="info-lbl">IP VPN</span><span class="info-val">{{ node.ip }}/32</span></div>
            <div class="info-row"><span class="info-lbl">Port</span><span class="info-val">:51820 UDP</span></div>
            <div class="info-row"><span class="info-lbl">MTU</span><span class="info-val">1420</span></div>
            <div class="info-row"><span class="info-lbl">DNS</span><span class="info-val">1.1.1.1, 8.8.8.8</span></div>
            <div class="info-row">
              <span class="info-lbl">Clé publique</span>
              <span class="info-val">xK3mP2…n9Qa <button class="copy-btn" title="Copier">⧉</button></span>
            </div>
            <div class="info-row"><span class="info-lbl">Pairs</span><span class="info-val">3 autorisés · 2 actifs</span></div>
          </div>
        </div>

        <!-- Agent UMBRA -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">Agent UMBRA</div>
          </div>
          <div class="card-body card-body--tight">
            <div class="info-row">
              <span class="info-lbl">Version</span>
              <span class="info-val">v1.0.0 <span class="badge-green">à jour</span></span>
            </div>
            <div class="info-row"><span class="info-lbl">Dernier heartbeat</span><span class="info-val accent">il y a 2s</span></div>
            <div class="info-row"><span class="info-lbl">Intervalle</span><span class="info-val">30s</span></div>
            <div class="info-row">
              <span class="info-lbl">Auto-update</span>
              <span class="info-val toggle-row">
                <span class="accent">Actif</span>
                <div class="toggle on"><div class="toggle-thumb" /></div>
              </span>
            </div>
            <div class="info-row"><span class="info-lbl">JWT expire</span><span class="info-val">dans 82j</span></div>
          </div>
        </div>

        <!-- Actions -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">Actions</div>
          </div>
          <div class="actions-body">
            <button class="action-btn">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M2 8a6 6 0 1 0 1-3.3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M2 4v4h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
              Redémarrer l'agent
            </button>
            <button class="action-btn">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="5.5" cy="5.5" r="3" stroke="currentColor" stroke-width="1.4"/><line x1="7.5" y1="7.5" x2="14" y2="14" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><line x1="11.5" y1="12" x2="13" y2="10.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
              Régénérer les clés WG
            </button>
            <button class="action-btn">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M8 2v8M5 7l3 3 3-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><rect x="2" y="11" width="12" height="3" rx="1" stroke="currentColor" stroke-width="1.3"/></svg>
              Télécharger config .conf
            </button>
            <button class="action-btn">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="1.5" stroke="currentColor" stroke-width="1.4"/><line x1="5" y1="6" x2="11" y2="6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><line x1="5" y1="9" x2="9" y2="9" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
              Voir les logs
            </button>
            <button class="action-btn danger">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M6 4V2h4v2M5 4v9a1 1 0 001 1h4a1 1 0 001-1V4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
              Supprimer le noeud
            </button>
          </div>
        </div>

      </div><!-- /col-right -->

    </div><!-- /detail-grid -->

    <!-- Share modal -->
    <div v-if="showShare" class="modal-overlay" @click.self="showShare = false">
      <div class="modal">

        <div class="modal-header">
          <div>
            <div class="modal-title">Partager — {{ node.name }}</div>
            <div class="modal-sub">Gérer les accès à ce noeud</div>
          </div>
          <button class="close-btn" @click="showShare = false">✕</button>
        </div>

        <div class="modal-body">

          <!-- Search + invite -->
          <div class="form-group">
            <label class="form-label">Ajouter un utilisateur</label>
            <div class="search-wrap">
              <div class="search-input-row">
                <svg class="search-ico" width="12" height="12" viewBox="0 0 16 16" fill="none">
                  <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" stroke-width="1.4"/>
                  <line x1="10" y1="10" x2="14" y2="14" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
                </svg>
                <input
                    v-model="searchQuery"
                    class="search-input"
                    placeholder="Nom ou email..."
                    @focus="searchFocused = true"
                    @blur="setTimeout(() => searchFocused = false, 150)"
                />
              </div>

              <!-- Autocomplete dropdown -->
              <div v-if="searchFocused && (searchResults.length > 0 || showExternalInvite)" class="search-dropdown">
                <div
                    v-for="u in searchResults" :key="u.id"
                    class="search-result"
                    @mousedown.prevent="selectUser(u)"
                >
                  <div class="result-avatar" :style="`background: ${u.color}`">{{ u.avatar }}</div>
                  <div class="result-info">
                    <div class="result-name">{{ u.name }}</div>
                    <div class="result-email">{{ u.email }}</div>
                  </div>
                  <span class="result-badge">UMBRA</span>
                </div>

                <div v-if="showExternalInvite" class="search-result external" @mousedown.prevent="inviteExternal">
                  <div class="result-avatar ext-avatar">✉</div>
                  <div class="result-info">
                    <div class="result-name">Inviter {{ searchQuery }}</div>
                    <div class="result-email">Envoi d'un email d'invitation</div>
                  </div>
                  <span class="result-badge ext">Nouveau</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Permission picker -->
          <div class="form-group">
            <label class="form-label">Permission par défaut</label>
            <div class="perm-grid">
              <div
                  v-for="p in permOptions" :key="p.value"
                  class="perm-opt" :class="{ selected: sharePerm === p.value }"
                  @click="sharePerm = p.value"
              >
                <div class="perm-icon">{{ p.icon }}</div>
                <div class="perm-name">{{ p.label }}</div>
                <div class="perm-desc">{{ p.desc }}</div>
              </div>
            </div>
          </div>

          <!-- Active members -->
          <div class="form-group" v-if="activeMembers.length > 0">
            <label class="form-label">Accès actifs ({{ activeMembers.length }})</label>
            <div class="members-list">
              <div v-for="m in activeMembers" :key="m.id" class="member-item">
                <div class="member-avatar" :style="`background: ${m.color}`">{{ m.avatar }}</div>
                <div class="member-info">
                  <div class="member-name">{{ m.name }}</div>
                  <div class="member-email">{{ m.email }}</div>
                </div>
                <select class="perm-select" :value="m.perm" @change="m.perm = ($event.target as HTMLSelectElement).value as Permission">
                  <option v-for="p in permOptions" :key="p.value" :value="p.value">{{ p.label }}</option>
                </select>
                <button class="revoke-btn" @click="revokeMember(m.id)">✕</button>
              </div>
            </div>
          </div>

          <!-- Pending invitations -->
          <div class="form-group" v-if="pendingMembers.length > 0">
            <label class="form-label">En attente ({{ pendingMembers.length }})</label>
            <div class="members-list">
              <div v-for="m in pendingMembers" :key="m.id" class="member-item pending">
                <div class="pending-avatar">?</div>
                <div class="member-info">
                  <div class="member-name">{{ m.email }}</div>
                  <div class="member-email pending-lbl">⏳ Invitation envoyée · {{ m.perm }}</div>
                </div>
                <button class="revoke-btn" @click="revokeMember(m.id)">✕</button>
              </div>
            </div>
          </div>

          <div v-if="members.length === 0" class="members-empty">
            Aucun accès partagé pour ce noeud
          </div>

        </div>

        <div class="modal-footer">
          <button class="btn-ghost-sm" @click="showShare = false">Fermer</button>
        </div>

      </div>
    </div>

  </div>

  <!-- Loading / not found -->
  <div v-else-if="store.loading" class="state-msg">Chargement...</div>
  <div v-else class="state-msg">Noeud introuvable</div>
</template>

<script setup lang="ts">
const route = useRoute()
const store = useNodesStore()

onMounted(() => { if (!store.nodes.length) store.fetchNodes() })

const node = computed(() =>
    store.nodes.find(n => n.id === route.params.id) ?? null
)

// ── Share modal ──
const showShare = ref(false)
const searchQuery = ref('')
const sharePerm = ref<'read' | 'connect' | 'manage' | 'admin'>('connect')
const searchFocused = ref(false)

type Permission = 'read' | 'connect' | 'manage' | 'admin'

interface NodeMember {
  id:      string
  email:   string
  name:    string
  perm:    Permission
  avatar:  string
  color:   string
  status:  'active' | 'pending'
}

const members = ref<NodeMember[]>([
  { id: '1', email: 'marie@example.com',  name: 'marie',  perm: 'connect', avatar: 'M', color: 'linear-gradient(135deg,#ff6b6b,#ffa726)',      status: 'active'  },
  { id: '2', email: 'thomas@example.com', name: 'thomas', perm: 'read',    avatar: 'T', color: 'linear-gradient(135deg,#4fa8ff,#7b6ef6)',       status: 'active'  },
  { id: '3', email: 'sam@example.com',    name: 'sam',    perm: 'connect', avatar: 'S', color: 'linear-gradient(135deg,var(--muted),var(--muted))', status: 'pending' },
])

// Mock existing UMBRA users for autocomplete
const umbraUsers = [
  { id: 'u1', email: 'alice@example.com', name: 'alice',  avatar: 'A', color: 'linear-gradient(135deg,#a78bfa,#7b6ef6)' },
  { id: 'u2', email: 'bob@example.com',   name: 'bob',    avatar: 'B', color: 'linear-gradient(135deg,#f59e0b,#ef4444)' },
  { id: 'u3', email: 'lea@example.com',   name: 'léa',    avatar: 'L', color: 'linear-gradient(135deg,#10b981,#3b82f6)' },
  { id: 'u4', email: 'marc@example.com',  name: 'marc',   avatar: 'M', color: 'linear-gradient(135deg,#ec4899,#8b5cf6)' },
]

const existingEmails = computed(() => members.value.map(m => m.email))

const searchResults = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q || q.length < 2) return []
  return umbraUsers.filter(u =>
      !existingEmails.value.includes(u.email) &&
      (u.name.includes(q) || u.email.includes(q))
  )
})

const isValidEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)

const showExternalInvite = computed(() => {
  const q = searchQuery.value.trim()
  if (!q || searchResults.value.length > 0) return false
  return isValidEmail(q) && !existingEmails.value.includes(q)
})

const permOptions: { value: Permission, label: string, desc: string, icon: string }[] = [
  { value: 'read',    label: 'Lecture',   desc: 'Voir les métriques',    icon: '👁️' },
  { value: 'connect', label: 'Connexion', desc: 'Se connecter',          icon: '➡️' },
  { value: 'manage',  label: 'Gestion',   desc: 'Modifier les réglages', icon: '⚙️' },
  { value: 'admin',   label: 'Admin',     desc: 'Partager et révoquer',  icon: '👑' },
]

function selectUser(user: typeof umbraUsers[0]) {
  members.value.push({
    id:     Date.now().toString(),
    email:  user.email,
    name:   user.name,
    perm:   sharePerm.value,
    avatar: user.avatar,
    color:  user.color,
    status: 'active',
  })
  searchQuery.value = ''
}

function inviteExternal() {
  const email = searchQuery.value.trim()
  if (!isValidEmail(email)) return
  members.value.push({
    id:     Date.now().toString(),
    email,
    name:   email.split('@')[0],
    perm:   sharePerm.value,
    avatar: email[0].toUpperCase(),
    color:  'var(--surface2)',
    status: 'pending',
  })
  searchQuery.value = ''
}

function revokeMember(id: string) {
  members.value = members.value.filter(m => m.id !== id)
}

const activeMembers  = computed(() => members.value.filter(m => m.status === 'active'))
const pendingMembers = computed(() => members.value.filter(m => m.status === 'pending'))

const period = ref('1j')
const periods = [
  { value: '1h', label: '1h' },
  { value: '1j', label: '1j' },
  { value: '1s', label: '1s' },
  { value: '1m', label: '1m' },
  { value: '1a', label: '1a' },
]

const categoryIcons: Record<string, string> = {
  sbc:     `<rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" stroke-width="1.4"/><rect x="5" y="5" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.2"/><line x1="4" y1="0" x2="4" y2="2" stroke="currentColor" stroke-width="1.2"/><line x1="8" y1="0" x2="8" y2="2" stroke="currentColor" stroke-width="1.2"/><line x1="12" y1="0" x2="12" y2="2" stroke="currentColor" stroke-width="1.2"/><line x1="4" y1="14" x2="4" y2="16" stroke="currentColor" stroke-width="1.2"/>`,
  vps:     `<rect x="1" y="3" width="14" height="4" rx="1.2" stroke="currentColor" stroke-width="1.3"/><rect x="1" y="9" width="14" height="4" rx="1.2" stroke="currentColor" stroke-width="1.3"/><circle cx="12.5" cy="5" r="1" fill="currentColor"/><circle cx="12.5" cy="11" r="1" fill="currentColor"/>`,
  router:  `<rect x="1" y="6" width="14" height="6" rx="1.5" stroke="currentColor" stroke-width="1.3"/><line x1="4" y1="6" x2="4" y2="4" stroke="currentColor" stroke-width="1.3"/><line x1="8" y1="6" x2="8" y2="2" stroke="currentColor" stroke-width="1.3"/><line x1="12" y1="6" x2="12" y2="4" stroke="currentColor" stroke-width="1.3"/><circle cx="5" cy="9.5" r="1" fill="currentColor"/><circle cx="9" cy="9.5" r="1" fill="currentColor"/>`,
  nas:     `<rect x="2" y="2" width="12" height="4" rx="1" stroke="currentColor" stroke-width="1.3"/><rect x="2" y="7" width="12" height="4" rx="1" stroke="currentColor" stroke-width="1.3"/><circle cx="4.5" cy="4" r=".8" fill="currentColor"/><circle cx="4.5" cy="9" r=".8" fill="currentColor"/>`,
  desktop: `<rect x="1" y="2" width="14" height="10" rx="1.5" stroke="currentColor" stroke-width="1.3"/><line x1="8" y1="12" x2="8" y2="15" stroke="currentColor" stroke-width="1.3"/><line x1="5" y1="15" x2="11" y2="15" stroke="currentColor" stroke-width="1.3"/>`,
  other:   `<circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.3"/><line x1="8" y1="5" x2="8" y2="8.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><circle cx="8" cy="11" r=".8" fill="currentColor" stroke="none"/>`,
}

const categoryIcon = computed(() => categoryIcons[node.value?.category ?? 'other'])

function onConnect() {
  if (!node.value) return
  if (node.value.status === 'connected') store.disconnect()
  else store.setConnected(node.value.id)
}

const ramTotal = 4
const ramUsed  = computed(() => node.value?.ram ? ((node.value.ram / 100) * ramTotal).toFixed(2) : '—')

const cpuColor = computed(() => {
  const v = node.value?.cpu ?? 0
  if (v > 90) return 'var(--offline)'
  if (v > 70) return 'var(--warning)'
  return 'var(--accent)'
})

const ramColor = computed(() => {
  const v = node.value?.ram ?? 0
  if (v > 90) return 'var(--offline)'
  if (v > 75) return 'var(--warning)'
  return 'var(--accent2)'
})

const diskColor = computed(() => {
  const v = node.value?.disk ?? 0
  if (v > 90) return 'var(--offline)'
  if (v > 80) return 'var(--warning)'
  return 'var(--accent)'
})

const tempColor = computed(() => {
  const t = node.value?.temp ?? 0
  if (t > 75) return 'var(--offline)'
  if (t > 60) return 'var(--warning)'
  if (t < 40) return 'var(--pending)'
  return 'var(--accent)'
})

const tempStyle = computed(() => `color: ${tempColor.value}`)

const uptimeDisplay = computed(() => {
  const s = node.value?.uptime
  if (!s) return '—'
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  return d > 0 ? `${d}j ${h}h` : `${h}h`
})

const uptimeSince = computed(() => {
  const s = node.value?.uptime
  if (!s) return '—'
  const d = new Date(Date.now() - s * 1000)
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
})

const periodLabels: Record<string, string> = {
  '1h': 'dernière heure',
  '1j': 'dernières 24h',
  '1s': 'dernière semaine',
  '1m': 'dernier mois',
  '1a': 'dernière année',
}
const periodLabel = computed(() => periodLabels[period.value])

</script>

<style scoped>
/* ── Layout ── */
.detail-page { display: flex; flex-direction: column; }
.mb { margin-bottom: var(--sp-5); }

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: var(--sp-4);
  align-items: start;
}

.col-left  { display: flex; flex-direction: column; }
.col-right { display: flex; flex-direction: column; gap: var(--sp-4); }

/* ── Back link ── */
.back-link {
  font-size: 11px;
  color: var(--muted);
  cursor: pointer;
  margin-bottom: var(--sp-3);
  transition: color .15s;
}
.back-link:hover { color: var(--text); }

/* ── Page header ── */
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: var(--sp-5);
}

.node-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
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
}

/* ── Node icon ── */
.nicon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
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

/* ── Header buttons ── */
.header-actions { display: flex; gap: 7px; align-items: center; }

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

.btn-primary {
  display: inline-flex;
  align-items: center;
  padding: 7px 14px;
  border-radius: var(--r);
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  background: var(--accent);
  color: var(--bg);
  transition: filter .15s;
}
.btn-primary:hover { filter: brightness(1.08); }
.btn-primary:disabled { opacity: .35; cursor: not-allowed; }
.btn-danger {
  background: rgba(255,79,107,.1) !important;
  border: 1px solid rgba(255,79,107,.3) !important;
  color: var(--offline) !important;
}

/* ── Modal ── */
.modal-overlay {
  position: fixed; inset: 0; z-index: 100;
  background: rgba(0,0,0,.6);
  display: flex; align-items: center; justify-content: center;
}
.modal {
  background: var(--surface);
  border: 1px solid var(--border2);
  border-radius: var(--r);
  width: 480px;
  box-shadow: 0 16px 48px rgba(0,0,0,.5);
  max-height: 90vh;
  overflow-y: auto;
}
.modal-header {
  display: flex; align-items: flex-start; justify-content: space-between;
  padding: 16px 20px; border-bottom: 1px solid var(--border);
  position: sticky; top: 0; background: var(--surface); z-index: 1;
}
.modal-title { font-size: 13px; font-weight: 600; color: var(--text); }
.modal-sub   { font-size: 10px; color: var(--muted); margin-top: 2px; }
.close-btn   { background: none; border: none; color: var(--muted); font-size: 14px; cursor: pointer; transition: color .15s; }
.close-btn:hover { color: var(--text); }
.modal-body  { padding: 20px; display: flex; flex-direction: column; gap: 18px; }
.modal-footer {
  display: flex; justify-content: flex-end;
  padding: 14px 20px; border-top: 1px solid var(--border);
}

.form-group { display: flex; flex-direction: column; gap: 7px; }
.form-label { font-size: 9px; color: var(--muted); text-transform: uppercase; letter-spacing: .1em; }

/* ── Search ── */
.search-wrap { position: relative; }

.search-input-row {
  display: flex; align-items: center; gap: 8px;
  background: var(--bg); border: 1px solid var(--border2);
  border-radius: var(--r); padding: 8px 10px;
  transition: border-color .15s;
}
.search-input-row:focus-within { border-color: var(--accent); }

.search-ico   { color: var(--muted); flex-shrink: 0; }
.search-input {
  flex: 1; background: none; border: none; outline: none;
  font-family: var(--font-mono); font-size: 12px; color: var(--text);
}
.search-input::placeholder { color: var(--muted); }

.search-dropdown {
  position: absolute; top: calc(100% + 4px); left: 0; right: 0;
  background: var(--surface); border: 1px solid var(--border2);
  border-radius: var(--r); overflow: hidden;
  box-shadow: 0 8px 24px rgba(0,0,0,.4); z-index: 10;
}

.search-result {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 12px; cursor: pointer; transition: background .1s;
}
.search-result:hover { background: var(--surface2); }
.search-result.external { border-top: 1px solid var(--border); }

.result-avatar {
  width: 28px; height: 28px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 600; color: var(--bg); flex-shrink: 0;
}
.ext-avatar { background: var(--surface2) !important; color: var(--muted); font-size: 13px; border: 1px solid var(--border2); }

.result-info  { flex: 1; min-width: 0; }
.result-name  { font-size: 12px; font-weight: 500; color: var(--text); }
.result-email { font-size: 10px; color: var(--muted); }

.result-badge {
  font-size: 8px; padding: 2px 6px; border-radius: 3px;
  background: rgba(79,255,176,.1); color: var(--accent);
  border: 1px solid rgba(79,255,176,.2);
}
.result-badge.ext {
  background: rgba(79,168,255,.1); color: var(--pending);
  border-color: rgba(79,168,255,.2);
}

/* ── Permission picker ── */
.perm-grid {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px;
}
.perm-opt {
  display: flex; flex-direction: column; align-items: center; gap: 3px;
  padding: 9px 6px; border-radius: var(--r);
  border: 1px solid var(--border2); background: var(--bg);
  cursor: pointer; transition: all .15s; text-align: center;
}
.perm-opt:hover   { border-color: var(--text); }
.perm-opt.selected { border-color: var(--accent); background: rgba(79,255,176,.06); }
.perm-name { font-size: 10px; font-weight: 600; color: var(--text); }
.perm-desc { font-size: 9px; color: var(--muted); }

/* ── Members list ── */
.members-list {
  background: var(--bg); border: 1px solid var(--border);
  border-radius: var(--r); overflow: hidden;
}
.member-item {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 12px; border-bottom: 1px solid var(--border);
  transition: background .1s;
}
.member-item:last-child { border-bottom: none; }
.member-item:hover      { background: var(--surface2); }
.member-item.pending    { opacity: .7; }

.member-avatar {
  width: 26px; height: 26px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 10px; font-weight: 600; color: var(--bg); flex-shrink: 0;
}
.pending-avatar {
  width: 26px; height: 26px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; color: var(--muted); flex-shrink: 0;
  background: var(--surface2); border: 1px dashed var(--border2);
}

.member-info  { flex: 1; min-width: 0; }
.member-name  { font-size: 11px; font-weight: 500; color: var(--text); }
.member-email { font-size: 9px; color: var(--muted); }
.pending-lbl  { color: var(--warning) !important; }

.perm-select {
  font-family: var(--font-mono); font-size: 9px;
  background: rgba(79,168,255,.1); color: var(--pending);
  border: 1px solid rgba(79,168,255,.2);
  border-radius: 3px; padding: 2px 5px; cursor: pointer;
  outline: none;
}

.revoke-btn {
  background: none; border: none; color: var(--muted);
  font-size: 11px; cursor: pointer; padding: 3px 5px;
  border-radius: 3px; transition: all .15s;
}
.revoke-btn:hover { color: var(--offline); background: rgba(255,79,107,.08); }

.members-empty {
  padding: 20px; text-align: center;
  font-size: 11px; color: var(--muted);
}

.btn-ghost-sm {
  display: inline-flex; align-items: center;
  padding: 6px 14px; border-radius: var(--r);
  font-family: var(--font-mono); font-size: 11px;
  cursor: pointer; background: transparent;
  border: 1px solid var(--border2); color: var(--muted);
  transition: all .15s;
}
.btn-ghost-sm:hover { border-color: var(--text); color: var(--text); }

/* Permission grid */
.perm-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
}

.perm-opt {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 10px 6px;
  border-radius: var(--r);
  border: 1px solid var(--border2);
  background: var(--bg);
  cursor: pointer;
  transition: all .15s;
  text-align: center;
}
.perm-opt:hover   { border-color: var(--text); }
.perm-opt.selected {
  border-color: var(--accent);
  background: rgba(79,255,176,.06);
}

.perm-icon { font-size: 14px; }
.perm-name { font-size: 10px; font-weight: 600; color: var(--text); }
.perm-desc { font-size: 9px; color: var(--muted); }

/* Members list */
.members-list {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--r);
  overflow: hidden;
}

.member-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border-bottom: 1px solid var(--border);
  transition: background .1s;
}
.member-item:last-child { border-bottom: none; }
.member-item:hover      { background: var(--surface2); }

.member-avatar {
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

.member-info { flex: 1; min-width: 0; }
.member-name  { font-size: 11px; font-weight: 500; color: var(--text); }
.member-email { font-size: 9px; color: var(--muted); }

.member-perm {
  font-size: 9px;
  font-family: var(--font-mono);
  background: rgba(79,168,255,.1);
  color: var(--pending);
  border: 1px solid rgba(79,168,255,.2);
  padding: 2px 6px;
  border-radius: 3px;
}

.revoke-btn {
  background: none;
  border: none;
  color: var(--muted);
  font-size: 11px;
  cursor: pointer;
  padding: 3px 5px;
  border-radius: 3px;
  transition: all .15s;
}
.revoke-btn:hover { color: var(--offline); background: rgba(255,79,107,.08); }

.members-empty {
  padding: 16px;
  text-align: center;
  font-size: 11px;
  color: var(--muted);
}

.btn-ghost-sm {
  display: inline-flex;
  align-items: center;
  padding: 6px 14px;
  border-radius: var(--r);
  font-family: var(--font-mono);
  font-size: 11px;
  cursor: pointer;
  background: transparent;
  border: 1px solid var(--border2);
  color: var(--muted);
  transition: all .15s;
}
.btn-ghost-sm:hover { border-color: var(--text); color: var(--text); }

/* ── Metric boxes ── */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 16px;
}

.metric-box {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--r);
  padding: 10px 12px;
}

.metric-lbl {
  font-size: 9px;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: .1em;
  margin-bottom: 4px;
}

.metric-val {
  font-family: var(--font-disp);
  font-size: 22px;
  font-weight: 700;
  line-height: 1;
  color: var(--text);
  margin-bottom: 7px;
}

.uptime-val { font-size: 17px; }

.metric-unit {
  font-size: 12px;
  color: var(--muted);
  margin-left: 1px;
}

.metric-bar {
  height: 3px;
  background: var(--border2);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 5px;
}

.metric-fill {
  height: 100%;
  border-radius: 2px;
  transition: width .4s ease;
}

.fill-green  { background: var(--accent); }

.metric-sub {
  font-size: 9px;
  color: var(--muted);
  margin-top: 3px;
}

/* ── Chart separator ── */
.chart-sep {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.chart-sep-lbl {
  font-size: 9px;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: .1em;
  white-space: nowrap;
}

.chart-sep-line {
  flex: 1;
  height: 1px;
  background: var(--border);
}

.charts-placeholder {
  font-size: 11px;
  color: var(--muted);
  padding: var(--sp-5);
  text-align: center;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--r);
}

/* ── Card ── */
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r);
  overflow: hidden;
}

.col-left .card { margin-bottom: var(--sp-4); }

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
}

.card-title        { font-size: 12px; font-weight: 500; color: var(--text); }
.card-meta         { display: flex; align-items: center; gap: 10px; }
.card-body         { padding: 14px 16px; }
.card-body--tight  { padding: 6px 16px; }

/* ── Period selector ── */
.period-group {
  display: flex;
  gap: 2px;
  background: var(--bg);
  border: 1px solid var(--border2);
  border-radius: 5px;
  padding: 2px;
}

.period-btn {
  background: none;
  border: none;
  color: var(--muted);
  font-family: var(--font-mono);
  font-size: 10px;
  padding: 3px 9px;
  border-radius: 4px;
  cursor: pointer;
  transition: all .15s;
}
.period-btn:hover  { color: var(--text); }
.period-btn.active { background: var(--surface); color: var(--accent); }

.heartbeat { font-size: 10px; color: var(--muted); }

/* ── Info rows ── */
.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 7px 0;
  border-bottom: 1px solid var(--border);
  font-size: 11px;
}
.info-row:last-child { border-bottom: none; }
.info-lbl { color: var(--muted); }
.info-val { color: var(--text); font-weight: 500; }
.accent   { color: var(--accent); }

/* ── Badges ── */
.badge-accent {
  font-size: 9px;
  background: rgba(79,255,176,.08);
  color: var(--accent);
  border: 1px solid rgba(79,255,176,.18);
  padding: 2px 7px;
  border-radius: 10px;
}

.badge-green {
  font-size: 9px;
  background: rgba(79,255,176,.1);
  color: var(--accent);
  padding: 1px 5px;
  border-radius: 3px;
}

.badge-blue {
  font-size: 9px;
  background: rgba(79,168,255,.1);
  color: var(--pending);
  padding: 1px 5px;
  border-radius: 3px;
}

/* ── Copy button ── */
.copy-btn {
  background: none;
  border: none;
  color: var(--muted);
  font-size: 10px;
  cursor: pointer;
  padding: 0;
  transition: color .15s;
}
.copy-btn:hover { color: var(--text); }

/* ── Toggle ── */
.toggle-row { display: flex; align-items: center; gap: 7px; }

.toggle {
  display: inline-block;
  width: 28px;
  height: 15px;
  border-radius: 8px;
  position: relative;
  cursor: pointer;
}
.toggle.on    { background: var(--accent); }
.toggle-thumb {
  position: absolute;
  right: 2px;
  top: 2px;
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: var(--bg);
}

/* ── Action buttons ── */
.actions-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 16px;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  padding: 7px 10px;
  border-radius: var(--r);
  font-family: var(--font-mono);
  font-size: 11px;
  cursor: pointer;
  background: transparent;
  border: 1px solid var(--border2);
  color: var(--muted);
  transition: all .15s;
}
.action-btn:hover        { border-color: var(--text); color: var(--text); }
.action-btn.danger       { border-color: rgba(255,79,107,.3); color: var(--offline); }
.action-btn.danger:hover { background: rgba(255,79,107,.08); }

/* ── Placeholders / states ── */
.metrics-placeholder {
  font-size: 11px;
  color: var(--muted);
  padding: var(--sp-6);
  text-align: center;
}

.state-msg {
  text-align: center;
  padding: var(--sp-10);
  font-size: 11px;
  color: var(--muted);
}
</style>