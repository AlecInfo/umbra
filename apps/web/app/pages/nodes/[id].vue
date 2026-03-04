<script setup lang="ts">
// TODO: Comment récupérer les données en temps réel ? WebSocket, Server-Sent Events, ou polling régulier ?
// TODO: Comment le noeud communique-t-il son statut de connexion et ses métriques ? Via l'agent qui pousse les données vers le backend, ou via des requêtes régulières du frontend ?
// TODO: Comment l'agent récupère-t-il les métriques système (CPU, RAM, disque, température, Uptime, Bp Upload/Download, latence VPN) ? Via des commandes système (ex: top, free, df, sensors) ou via une bibliothèque dédiée ?
// TODO: Mettre les rpis dans des ipv6 2001 qui ne sont pas localisables géographiquement, pour éviter les confusions sur la localisation affichée


import { categoryIcons } from '~/composables/useCategoryIcons'

definePageMeta({ layout: 'default' })

const route = useRoute()
const store = useNodesStore()
onMounted(() => { if (!store.nodes.length) store.fetchNodes() })

const node = computed(() => store.nodes.find(n => n.id === route.params.id) ?? null)

// Period
const period = ref('1j')
const periods = [
  { label: '1h', value: '1h' },
  { label: '1j', value: '1j' },
  { label: '1s', value: '1s' },
  { label: '1m', value: '1m' },
  { label: '1a', value: '1a' },
]

const periodLabels: Record<string, string> = {
  '1h': 'dernière heure',
  '1j': 'dernières 24h',
  '1s': 'dernière semaine',
  '1m': 'dernier mois',
  '1a': 'dernière année',
}
const periodLabel = computed(() => periodLabels[period.value])

// Category icons
const categoryIcon = computed(() => categoryIcons[node.value?.category ?? 'other'])

// Connect
function onConnect() {
  if (!node.value) return
  if (node.value.status === 'connected') store.disconnect()
  else store.setConnected(node.value.id)
}

// Metric colors
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

const ramTotal = 4
const ramUsed  = computed(() => node.value?.ram ? ((node.value.ram / 100) * ramTotal).toFixed(2) : '—')

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

// Mock time-series
const counts: Record<string, number> = { '1h': 60, '1j': 24, '1s': 168, '1m': 30, '1a': 52 }
// ms between data points for each period
const stepMs: Record<string, number> = {
  '1h':        60_000,   // 1 min
  '1j':     3_600_000,   // 1 h
  '1s':     3_600_000,   // 1 h  (168 pts = 7 days)
  '1m':    86_400_000,   // 1 day
  '1a':   604_800_000,   // 1 week
}

function makeSeries(count: number, keys: string[], mins: number[], maxs: number[], decimals: number[] = [], interval = 3_600_000) {
  const now = Date.now()
  return Array.from({ length: count }, (_, i) => {
    const pt: Record<string, number> = { ts: now - (count - i) * interval }
    keys.forEach((k, idx) => {
      const raw = Math.random() * ((maxs[idx] ?? 0) - (mins[idx] ?? 0)) + (mins[idx] ?? 0)
      const dec = decimals[idx] ?? 0
      pt[k] = dec > 0 ? +raw.toFixed(dec) : Math.round(raw)
    })
    return pt
  })
}

const step          = computed(() => stepMs[period.value] ?? 3_600_000)
const bandwidthData = computed(() => makeSeries(counts[period.value] ?? 24, ['up', 'down'], [0.5, 1], [10, 25], [1, 1], step.value))
const systemData    = computed(() => makeSeries(counts[period.value] ?? 24, ['cpu', 'ram', 'temp'], [5, 30, 40], [90, 90, 75], [1, 0, 0], step.value))
const peersData     = computed(() => makeSeries(counts[period.value] ?? 24, ['peers'], [0], [8], [], step.value))

// X-axis formatter adapts to the selected period
function fmtHHmm(ts: number) {
  const d = new Date(ts)
  return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0')
}
const xFormatters: Record<string, (ts: number) => string> = {
  '1h': fmtHHmm,
  '1j': fmtHHmm,
  '1s': (ts) => { const d = new Date(ts); return d.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '') + ' ' + d.getHours() + 'h' },
  '1m': (ts) => { const d = new Date(ts); return d.getDate() + '\u00a0' + d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '') },
  '1a': (ts) => { const d = new Date(ts); return d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '') },
}
const xFmt = computed(() => xFormatters[period.value] ?? fmtHHmm)

// WireGuard peers
const wgPeers = [
  { id: '1', name: 'alecptt',  device: 'MacBook Pro',    pubkey: 'xK3mP2…n9Qa', ip: '100.64.0.10', latency: 4,    upMb: 240,  downGb: '1.2 GB', handshake: 'il y a 4s',   status: 'active',   avatar: 'A', color: 'linear-gradient(135deg,#4fffb0,#3b82f6)' },
  { id: '2', name: 'marie',    device: 'iPhone 15',      pubkey: 'pR7kL4…m2Xj', ip: '100.64.0.11', latency: null, upMb: 18,   downGb: '95 MB',  handshake: 'il y a 2h',   status: 'inactive', avatar: 'M', color: 'linear-gradient(135deg,#ff6b6b,#ffa726)' },
  { id: '3', name: 'thomas',   device: 'Linux Desktop',  pubkey: 'yN8vQ5…k6Wz', ip: '100.64.0.12', latency: 11,   upMb: 560,  downGb: '2.8 GB', handshake: 'il y a 28s',  status: 'active',   avatar: 'T', color: 'linear-gradient(135deg,#4fa8ff,#7b6ef6)' },
  { id: '4', name: 'sam',      device: 'Raspberry Pi',   pubkey: 'qM2bN9…p5Ry', ip: '100.64.0.13', latency: null, upMb: 0,    downGb: '—',      handshake: '—',            status: 'inactive', avatar: 'S', color: 'var(--surface2)' },
  { id: '5', name: 'backup',   device: 'VPS Hetzner',    pubkey: 'wX4cP8…r3Lm', ip: '100.64.0.14', latency: 22,   upMb: 1200, downGb: '8.4 GB', handshake: 'il y a 1min', status: 'active',   avatar: 'B', color: 'linear-gradient(135deg,#a78bfa,#7b6ef6)' },
]
const wgActiveCount = computed(() => wgPeers.filter(p => p.status === 'active').length)

// Recent activity
const recentActivity = [
  {
    id: 1, type: 'connect',
    icon: 'i-lucide-circle-check',
    iconColor: 'var(--accent)', iconBg: 'rgba(79,255,176,.1)',
    main: "alecptt s'est connecté depuis MacBook Pro",
    sub: '100.64.0.10 · IP source 82.120.44.16 · WireGuard',
    time: '14:28:04',
  },
  {
    id: 2, type: 'disconnect',
    icon: 'i-lucide-circle-x',
    iconColor: 'var(--offline)', iconBg: 'rgba(255,79,107,.1)',
    main: "marie s'est déconnectée",
    sub: 'Session de 1h 14min · 95 MB transférés',
    time: '12:14:37',
  },
  {
    id: 3, type: 'warning',
    icon: 'i-lucide-triangle-alert',
    iconColor: 'var(--warning)', iconBg: 'rgba(255,183,79,.1)',
    main: 'Pic de température détecté',
    sub: '68°C pendant 4 min · retour à la normale',
    time: '11:02:15',
  },
  {
    id: 4, type: 'update',
    icon: 'i-lucide-rotate-cw',
    iconColor: 'var(--pending)', iconBg: 'rgba(79,168,255,.1)',
    main: 'Agent mis à jour vers v1.0.0',
    sub: 'Mise à jour automatique depuis v0.9.4',
    time: 'hier 08:30',
  },
  {
    id: 5, type: 'register',
    icon: 'i-lucide-square-check',
    iconColor: 'var(--accent)', iconBg: 'rgba(79,255,176,.1)',
    main: "Noeud enregistré",
    sub: "Première connexion de l'agent · token umbra_reg_a4f2...",
    time: '11 fév.',
  },
]

// Share modal
type Permission = 'read' | 'connect' | 'manage' | 'admin'

interface NodeMember {
  id:     string
  email:  string
  name:   string
  perm:   Permission
  avatar: string
  color:  string
  status: 'active' | 'pending'
}

const showShare    = ref(false)
const searchQuery  = ref('')
const sharePerm    = ref<Permission>('connect')
const searchFocused = ref(false)

const members = ref<NodeMember[]>([
  { id: '1', email: 'marie@example.com',  name: 'marie',  perm: 'connect', avatar: 'M', color: 'linear-gradient(135deg,#ff6b6b,#ffa726)',      status: 'active'  },
  { id: '2', email: 'thomas@example.com', name: 'thomas', perm: 'read',    avatar: 'T', color: 'linear-gradient(135deg,#4fa8ff,#7b6ef6)',       status: 'active'  },
  { id: '3', email: 'sam@example.com',    name: 'sam',    perm: 'connect', avatar: 'S', color: 'var(--surface2)',                               status: 'pending' },
])

const umbraUsers = [
  { id: 'u1', email: 'alice@example.com', name: 'alice', avatar: 'A', color: 'linear-gradient(135deg,#a78bfa,#7b6ef6)' },
  { id: 'u2', email: 'bob@example.com',   name: 'bob',   avatar: 'B', color: 'linear-gradient(135deg,#f59e0b,#ef4444)' },
  { id: 'u3', email: 'lea@example.com',   name: 'léa',   avatar: 'L', color: 'linear-gradient(135deg,#10b981,#3b82f6)' },
  { id: 'u4', email: 'marc@example.com',  name: 'marc',  avatar: 'M', color: 'linear-gradient(135deg,#ec4899,#8b5cf6)' },
]

const existingEmails = computed(() => members.value.map(m => m.email))
const searchResults  = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q || q.length < 2) return []
  return umbraUsers.filter(u =>
    !existingEmails.value.includes(u.email) && (u.name.includes(q) || u.email.includes(q))
  )
})
const isValidEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
const showExternalInvite = computed(() => {
  const q = searchQuery.value.trim()
  if (!q || searchResults.value.length > 0) return false
  return isValidEmail(q) && !existingEmails.value.includes(q)
})

const permOptions = [
  { value: 'read'    as Permission, label: 'Lecture',   desc: 'Voir les métriques',    icon: 'i-lucide-eye',         color: '#4fa8ff' },
  { value: 'connect' as Permission, label: 'Connexion', desc: 'Se connecter',          icon: 'i-lucide-plug',        color: '#4fffb0' },
  { value: 'manage'  as Permission, label: 'Gestion',   desc: 'Modifier les réglages', icon: 'i-lucide-settings',    color: '#ffb74f' },
  { value: 'admin'   as Permission, label: 'Admin',     desc: 'Partager et révoquer',  icon: 'i-lucide-chess-queen', color: '#7b6ef6' },
]

function selectUser(user: typeof umbraUsers[0]) {
  members.value.push({ id: Date.now().toString(), email: user.email, name: user.name, perm: sharePerm.value, avatar: user.avatar, color: user.color, status: 'active' })
  searchQuery.value = ''
}
function inviteExternal() {
  const email = searchQuery.value.trim()
  if (!isValidEmail(email)) return
  members.value.push({ id: Date.now().toString(), email, name: email.split('@')[0] ?? email, perm: sharePerm.value, avatar: (email[0] ?? '?').toUpperCase(), color: 'var(--surface2)', status: 'pending' })
  searchQuery.value = ''
}
function blurSearch() { setTimeout(() => { searchFocused.value = false }, 150) }

function revokeMember(id: string) {
  members.value = members.value.filter(m => m.id !== id)
}
const activeMembers  = computed(() => members.value.filter(m => m.status === 'active'))
const pendingMembers = computed(() => members.value.filter(m => m.status === 'pending'))

</script>

<template>
  <div v-if="node" class="detail-page">

    <!-- Back -->
    <div class="back-link" @click="navigateTo('/nodes')">← Mes noeuds</div>

    <!-- Page header -->
    <div class="page-header">
      <div class="header-left">
        <div class="node-title">
          <div class="nicon" :class="`cat-${node.category}`">
            <UIcon :name="categoryIcon" style="width:17px;height:17px" />
          </div>
          <span class="page-title">{{ node.name }}</span>
          <StatusBadge :status="node.status" />
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
                  v-for="p in periods" :key="p.value"
                  class="period-btn"
                  :class="{ active: period === p.value }"
                  @click="period = p.value"
                >{{ p.label }}</button>
              </div>
              <span class="heartbeat">heartbeat il y a 2s</span>
            </div>
          </div>
          <div class="card-body">

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

            <!-- Chart separator -->
            <div class="chart-sep">
              <span class="chart-sep-lbl">Historique — <span class="accent">{{ periodLabel }}</span></span>
              <div class="chart-sep-line" />
            </div>

            <!-- Charts -->
            <ClientOnly>
              <div class="charts-section">
                <NodeChart
                  title="Bande passante"
                  :data="bandwidthData"
                  :categories="{
                    up:   { name: '↑ Upload',   color: '#4fffb0', fmt: (v: number) => `${Math.round(v)} MB/s` },
                    down: { name: '↓ Download', color: '#7b6ef6', fmt: (v: number) => `${Math.round(v)} MB/s` },
                  }"
                  :height="120"
                  chart-type="area"
                  :x-fmt="xFmt"
                />
                <NodeChart
                  title="CPU · Mémoire · Température"
                  :data="systemData"
                  :categories="{
                    cpu:  { name: 'CPU',  color: '#4fffb0', fmt: (v: number) => `${Math.round(v)}%`  },
                    ram:  { name: 'RAM',  color: '#7b6ef6', fmt: (v: number) => `${Math.round(v)}%`  },
                    temp: { name: 'Temp', color: '#ffb74f', fmt: (v: number) => `${Math.round(v)}°C` },
                  }"
                  :height="120"
                  chart-type="line"
                  val-color="var(--text)"
                  :x-fmt="xFmt"
                />
                <NodeChart
                  title="Pairs connectés simultanément"
                  :data="peersData"
                  :categories="{
                    peers: { name: 'Pairs', color: '#4fa8ff', fmt: (v: number) => `${Math.round(v)} pairs` },
                  }"
                  :height="120"
                  chart-type="area"
                  curve-type="step"
                  :x-fmt="xFmt"
                />
              </div>
            </ClientOnly>

          </div>
        </div>

        <!-- WireGuard peers -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">Pairs WireGuard autorisés</div>
            <span class="peers-count">{{ wgActiveCount }} / {{ wgPeers.length }} connectés</span>
            <button class="btn-ghost-sm">Gérer</button>
          </div>
          <div class="peers-table">
            <div class="peers-head">
              <span>Pair</span>
              <span>Clé publique</span>
              <span>IP VPN</span>
              <span>Latence</span>
              <span>Trafic ↑↓</span>
              <span>Handshake</span>
              <span>Statut</span>
            </div>
            <div v-for="p in wgPeers" :key="p.id" class="peer-row">
              <div class="peer-identity">
                <div class="peer-avatar" :style="`background:${p.color}`">{{ p.avatar }}</div>
                <div>
                  <div class="peer-name">{{ p.name }}</div>
                  <div class="peer-device">{{ p.device }}</div>
                </div>
              </div>
              <span class="peer-key">{{ p.pubkey }}</span>
              <span class="peer-ip">{{ p.ip }}</span>
              <span class="peer-latency" :class="{ accent: p.latency !== null }">
                {{ p.latency !== null ? `${p.latency} ms` : '—' }}
              </span>
              <div class="peer-traffic">
                <span class="traffic-up">↑ {{ p.upMb >= 1000 ? `${(p.upMb/1000).toFixed(1)} GB` : `${p.upMb} MB` }}</span>
                <span class="traffic-down">↓ {{ p.downGb }}</span>
              </div>
              <span class="peer-handshake">{{ p.handshake }}</span>
              <span class="peer-status" :class="p.status === 'active' ? 'ps-active' : 'ps-inactive'">
                <span class="peer-sdot" />{{ p.status === 'active' ? 'Actif' : 'Inactif' }}
              </span>
            </div>
          </div>
        </div>

        <!-- Recent activity -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">Activité récente</div>
            <span class="section-link" style="margin-left:auto;cursor:pointer">Tout voir →</span>
          </div>
          <div class="activity-list">
            <div v-for="ev in recentActivity" :key="ev.id" class="activity-item">
              <div class="activity-icon" :style="`background:${ev.iconBg};color:${ev.iconColor}`">
                <UIcon :name="ev.icon" style="width:14px;height:14px" />
              </div>
              <div class="activity-body">
                <div class="activity-main">{{ ev.main }}</div>
                <div class="activity-sub">{{ ev.sub }}</div>
              </div>
              <span class="activity-time">{{ ev.time }}</span>
            </div>
          </div>
        </div>

      </div>

      <!-- Right col -->
      <div class="col-right">

        <!-- Machine -->
        <div class="card">
          <div class="card-header"><div class="card-title">Machine</div></div>
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
          <div class="card-header"><div class="card-title">Agent UMBRA</div></div>
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
                <span class="toggle on"><span class="toggle-thumb" /></span>
              </span>
            </div>
            <div class="info-row"><span class="info-lbl">JWT expire</span><span class="info-val">dans 82j</span></div>
          </div>
        </div>

        <!-- Actions -->
        <div class="card">
          <div class="card-header"><div class="card-title">Actions</div></div>
          <div class="actions-body">
            <button class="action-btn">
              <UIcon name="i-lucide-rotate-ccw" style="width:13px;height:13px" />
              Redémarrer l'agent
            </button>
            <button class="action-btn">
              <UIcon name="i-lucide-key" style="width:13px;height:13px" />
              Régénérer les clés WG
            </button>
            <button class="action-btn">
              <UIcon name="i-lucide-download" style="width:13px;height:13px" />
              Télécharger config .conf
            </button>
            <button class="action-btn">
              <UIcon name="i-lucide-file-text" style="width:13px;height:13px" />
              Voir les logs
            </button>
            <button class="action-btn danger">
              <UIcon name="i-lucide-trash-2" style="width:13px;height:13px" />
              Supprimer le noeud
            </button>
          </div>
        </div>

      </div>
    </div>

    <!-- Share modal -->
    <div v-if="showShare" class="modal-overlay" @click.self="showShare = false">
      <div class="modal share-modal">
        <div class="modal-header">
          <div>
            <div class="modal-title">Partager — {{ node.name }}</div>
            <div class="modal-sub">Gérer les accès à ce noeud</div>
          </div>
          <button class="close-btn" @click="showShare = false"><UIcon name="i-lucide-x" style="width:12px;height:12px" /></button>
        </div>
        <div class="modal-body">

          <!-- Search -->
          <div class="form-group">
            <label class="form-label">Ajouter un utilisateur</label>
            <div class="search-wrap">
              <div class="search-input-row">
                <UIcon name="i-lucide-search" class="search-ico" style="width:13px;height:13px" />
                <input
                  v-model="searchQuery"
                  class="search-input"
                  placeholder="Nom ou email..."
                  @focus="searchFocused = true"
                  @blur="blurSearch()"
                />
              </div>
              <div v-if="searchFocused && (searchResults.length > 0 || showExternalInvite)" class="search-dropdown">
                <div v-for="u in searchResults" :key="u.id" class="search-result" @mousedown.prevent="selectUser(u)">
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
            <div class="share-perm-grid">
              <div
                v-for="p in permOptions" :key="p.value"
                class="share-perm-opt" :class="{ selected: sharePerm === p.value }"
                @click="sharePerm = p.value"
              >
                <div class="perm-icon" :style="`--perm-c: ${p.color}`"><UIcon :name="p.icon" style="width:16px;height:16px" /></div>
                <div class="perm-name">{{ p.label }}</div>
                <div class="perm-desc">{{ p.desc }}</div>
              </div>
            </div>
          </div>

          <!-- Active members -->
          <div v-if="activeMembers.length > 0" class="form-group">
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
                <button class="revoke-btn" @click="revokeMember(m.id)"><UIcon name="i-lucide-x" style="width:10px;height:10px" /></button>
              </div>
            </div>
          </div>

          <!-- Pending -->
          <div v-if="pendingMembers.length > 0" class="form-group">
            <label class="form-label">En attente ({{ pendingMembers.length }})</label>
            <div class="members-list">
              <div v-for="m in pendingMembers" :key="m.id" class="member-item pending">
                <div class="pending-avatar">?</div>
                <div class="member-info">
                  <div class="member-name">{{ m.email }}</div>
                  <div class="member-email pending-lbl"><UIcon name="i-lucide-hourglass" style="width:10px;height:10px" /> Invitation envoyée · {{ m.perm }}</div>
                </div>
                <button class="revoke-btn" @click="revokeMember(m.id)"><UIcon name="i-lucide-x" style="width:10px;height:10px" /></button>
              </div>
            </div>
          </div>

          <div v-if="members.length === 0" class="members-empty">Aucun accès partagé pour ce noeud</div>

        </div>
        <div class="modal-footer">
          <button class="btn-ghost-sm" @click="showShare = false">Fermer</button>
        </div>
      </div>
    </div>

  </div>

  <div v-else-if="store.loading" class="state-msg">Chargement...</div>
  <div v-else class="state-msg">Noeud introuvable</div>
</template>

<style scoped>
.detail-page { display: flex; flex-direction: column; }
</style>
