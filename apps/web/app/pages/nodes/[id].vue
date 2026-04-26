<script setup lang="ts">
// TODO: Comment récupérer les données en temps réel ? WebSocket, Server-Sent Events, ou polling régulier ?
// TODO: Comment le noeud communique-t-il son statut de connexion et ses métriques ? Via l'agent qui pousse les données vers le backend, ou via des requêtes régulières du frontend ?
// TODO: Comment l'agent récupère-t-il les métriques système (CPU, RAM, disque, température, Uptime, Bp Upload/Download, latence VPN) ? Via des commandes système (ex: top, free, df, sensors) ou via une bibliothèque dédiée ?
// TODO: Mettre les rpis dans des ipv6 2001 qui ne sont pas localisables géographiquement, pour éviter les confusions sur la localisation affichée


import { categoryIcons } from '~/composables/useCategoryIcons'

definePageMeta({ layout: 'default' })

const route = useRoute()
const store = useNodesStore()
const { t } = useT()
onMounted(() => { if (!store.nodes.length) store.fetchNodes() })

const node = computed(() => store.nodes.find(n => n.id === route.params.id) ?? null)

// Period
const period = ref('1j')
const periods = computed(() => [
  { label: t('nd_period_1h'), value: '1h' },
  { label: t('nd_period_1d'), value: '1j' },
  { label: t('nd_period_1w'), value: '1s' },
  { label: t('nd_period_1m'), value: '1m' },
  { label: t('nd_period_1y'), value: '1a' },
])

const periodLabel = computed(() => {
  const map: Record<string, string> = {
    '1h': t('nd_period_1h_label'),
    '1j': t('nd_period_1d_label'),
    '1s': t('nd_period_1w_label'),
    '1m': t('nd_period_1m_label'),
    '1a': t('nd_period_1y_label'),
  }
  return map[period.value] ?? ''
})

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
const tempStyle = computed(() => ({ color: tempColor.value }))

const ramTotal = 4
const ramUsed  = computed(() => node.value?.ram ? ((node.value.ram / 100) * ramTotal).toFixed(2) : t('common_dash'))

const uptimeDisplay = computed(() => {
  const s = node.value?.uptime
  if (!s) return t('common_dash')
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  return d > 0 ? `${d}j ${h}h` : `${h}h`
})
const uptimeSince = computed(() => {
  const s = node.value?.uptime
  if (!s) return t('common_dash')
  const d = new Date(Date.now() - s * 1000)
  return d.toLocaleDateString(t('date_locale'), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
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
const xFormatters = computed<Record<string, (ts: number) => string>>(() => {
  const loc = t('date_locale')
  return {
    '1h': fmtHHmm,
    '1j': fmtHHmm,
    '1s': (ts) => { const d = new Date(ts); return d.toLocaleDateString(loc, { weekday: 'short' }).replace('.', '') + ' ' + d.getHours() + 'h' },
    '1m': (ts) => { const d = new Date(ts); return d.getDate() + '\u00a0' + d.toLocaleDateString(loc, { month: 'short' }).replace('.', '') },
    '1a': (ts) => { const d = new Date(ts); return d.toLocaleDateString(loc, { month: 'short' }).replace('.', '') },
  }
})
const xFmt = computed(() => xFormatters.value[period.value] ?? fmtHHmm)

// WireGuard peers
const wgPeersLocal = ref([
  { id: '1', name: 'alecptt',  device: 'MacBook Pro',    pubkey: 'xK3mP2…n9Qa', ip: '100.64.0.10', latency: 4,    upMb: 240,  downGb: '1.2 GB', handshakeKey: 'nd_peer_hs_4s',   status: 'active',   avatar: 'A', color: 'linear-gradient(135deg,#4fffb0,#3b82f6)' },
  { id: '2', name: 'marie',    device: 'iPhone 15',      pubkey: 'pR7kL4…m2Xj', ip: '100.64.0.11', latency: null, upMb: 18,   downGb: '95 MB',  handshakeKey: 'nd_peer_hs_2h',   status: 'inactive', avatar: 'M', color: 'linear-gradient(135deg,#ff6b6b,#ffa726)' },
  { id: '3', name: 'thomas',   device: 'Linux Desktop',  pubkey: 'yN8vQ5…k6Wz', ip: '100.64.0.12', latency: 11,   upMb: 560,  downGb: '2.8 GB', handshakeKey: 'nd_peer_hs_28s',  status: 'active',   avatar: 'T', color: 'linear-gradient(135deg,#4fa8ff,#7b6ef6)' },
  { id: '4', name: 'sam',      device: 'Raspberry Pi',   pubkey: 'qM2bN9…p5Ry', ip: '100.64.0.13', latency: null, upMb: 0,    downGb: '—',      handshakeKey: '',                status: 'inactive', avatar: 'S', color: 'var(--surface2)' },
  { id: '5', name: 'backup',   device: 'VPS Hetzner',    pubkey: 'wX4cP8…r3Lm', ip: '100.64.0.14', latency: 22,   upMb: 1200, downGb: '8.4 GB', handshakeKey: 'nd_peer_hs_1min', status: 'active',   avatar: 'B', color: 'linear-gradient(135deg,#a78bfa,#7b6ef6)' },
])
const wgActiveCount = computed(() => wgPeersLocal.value.filter(p => p.status === 'active').length)
function peerHandshake(key: string) { return key ? t(key) : t('common_dash') }


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

const permOptions = computed(() => [
  { value: 'read'    as Permission, label: t('nd_share_perm_read'),  desc: t('nd_share_perm_read_d'),  icon: 'i-lucide-eye',         color: '#4fa8ff' },
  { value: 'connect' as Permission, label: t('nd_share_perm_conn'),  desc: t('nd_share_perm_conn_d'),  icon: 'i-lucide-plug',        color: '#4fffb0' },
  { value: 'manage'  as Permission, label: t('nd_share_perm_mgmt'),  desc: t('nd_share_perm_mgmt_d'),  icon: 'i-lucide-settings',    color: '#ffb74f' },
  { value: 'admin'   as Permission, label: t('nd_share_perm_admin'), desc: t('nd_share_perm_admin_d'), icon: 'i-lucide-chess-queen', color: '#7b6ef6' },
])

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

// WireGuard config modal
const showConfig    = ref(false)
const cfgPort       = ref('51820')
const cfgMtu        = ref('1420')
const cfgDns        = ref('1.1.1.1, 8.8.8.8')
const cfgAllowedIPs = ref('100.64.0.0/10')

// Peers management modal
const showPeersMgmt = ref(false)
const newPeerKey    = ref('')
const newPeerIp     = ref('')
function removePeer(id: string) { wgPeersLocal.value = wgPeersLocal.value.filter(p => p.id !== id) }
function addPeer() {
  if (!newPeerKey.value || !newPeerIp.value) return
  const key = newPeerKey.value
  wgPeersLocal.value.push({
    id: Date.now().toString(), name: t('nd_peer_default_name'), device: t('nd_peer_default_device'),
    pubkey: key.length > 12 ? key.slice(0, 6) + '…' + key.slice(-4) : key,
    ip: newPeerIp.value, latency: null, upMb: 0, downGb: '—', handshakeKey: '',
    status: 'inactive', avatar: '?', color: 'var(--surface2)',
  })
  newPeerKey.value = ''
  newPeerIp.value  = ''
}

// Activity log (first 5 shown by default, all when expanded)
const extendedActivity = computed(() => [
  { id: 1, icon: 'i-lucide-circle-check',   iconColor: 'var(--accent)',  iconBg: 'rgba(79,255,176,.1)',  main: t('nd_act_e1_main'), sub: t('nd_act_e1_sub'), time: t('nd_act_e1_time') },
  { id: 2, icon: 'i-lucide-circle-x',       iconColor: 'var(--offline)', iconBg: 'rgba(255,79,107,.1)',  main: t('nd_act_e2_main'), sub: t('nd_act_e2_sub'), time: t('nd_act_e2_time') },
  { id: 3, icon: 'i-lucide-triangle-alert', iconColor: 'var(--warning)', iconBg: 'rgba(255,183,79,.1)',  main: t('nd_act_e3_main'), sub: t('nd_act_e3_sub'), time: t('nd_act_e3_time') },
  { id: 4, icon: 'i-lucide-rotate-cw',      iconColor: 'var(--pending)', iconBg: 'rgba(79,168,255,.1)',  main: t('nd_act_e4_main'), sub: t('nd_act_e4_sub'), time: t('nd_act_e4_time') },
  { id: 5, icon: 'i-lucide-square-check',   iconColor: 'var(--accent)',  iconBg: 'rgba(79,255,176,.1)',  main: t('nd_act_e5_main'), sub: t('nd_act_e5_sub'), time: t('nd_act_e5_time') },
  { id: 6, icon: 'i-lucide-circle-check',   iconColor: 'var(--accent)',  iconBg: 'rgba(79,255,176,.1)',  main: t('nd_act_e6_main'), sub: t('nd_act_e6_sub'), time: t('nd_act_e6_time') },
  { id: 7, icon: 'i-lucide-circle-x',       iconColor: 'var(--offline)', iconBg: 'rgba(255,79,107,.1)',  main: t('nd_act_e7_main'), sub: t('nd_act_e7_sub'), time: t('nd_act_e7_time') },
  { id: 8, icon: 'i-lucide-triangle-alert', iconColor: 'var(--warning)', iconBg: 'rgba(255,183,79,.1)',  main: t('nd_act_e8_main'), sub: t('nd_act_e8_sub'), time: t('nd_act_e8_time') },
])
const showAllActivity = ref(false)
const visibleActivity = computed(() => showAllActivity.value ? extendedActivity.value : extendedActivity.value.slice(0, 5))

// Copy pubkey
const copiedKey = ref(false)
function copyPubkey() {
  navigator.clipboard.writeText('xK3mP2vTn8sFqLd4mBrJkHgYpWzXiCeN9Qa')
  copiedKey.value = true
  setTimeout(() => copiedKey.value = false, 2000)
}

const { notify } = useNotifications()

// Actions
const restarting = ref(false)

// Agent auto-update
const autoUpdate      = ref(true)
const updateAvailable = ref(false)   // mock: pas de mise à jour dispo par défaut
const latestVersion   = '1.2.0'
const currentVersion  = '1.0.0'

watch(autoUpdate, (val) => { updateAvailable.value = !val })

function doUpdate() {
  notify(t('nd_update_started', { v: latestVersion }), 'info')
  updateAvailable.value = false
}
let restartTimer: ReturnType<typeof setTimeout> | null = null
function restartAgent() {
  restarting.value = true
  restartTimer = setTimeout(() => {
    restarting.value = false
    if (node.value?.status === 'connected') {
      notify(t('nd_restart_warn'), 'warning')
    } else {
      notify(t('nd_restart_ok'), 'success')
    }
  }, 2500)
}
onUnmounted(() => { if (restartTimer) clearTimeout(restartTimer) })
function downloadConf() {
  if (!node.value) return
  const conf = [
    '[Interface]',
    'PrivateKey = <PRIVATE_KEY>',
    `Address = ${node.value.ip}/32`,
    `DNS = ${cfgDns.value}`,
    '',
    '[Peer]',
    'PublicKey = xK3mP2vTn8sFqLd4mBrJkHgYpWzXiCeN9Qa',
    `AllowedIPs = ${cfgAllowedIPs.value}`,
    'Endpoint = 203.0.113.42:51820',
    'PersistentKeepalive = 25',
  ].join('\n')
  const blob = new Blob([conf], { type: 'text/plain' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = `umbra-${node.value.name}.conf`; a.click()
  URL.revokeObjectURL(url)
  notify(t('nd_dl_notif', { name: node.value.name }), 'success')
}
const showRegenConfirm  = ref(false)
function regenKeys() { showRegenConfirm.value = false; notify(t('nd_regen_notif'), 'warning') }
const showLogsModal     = ref(false)
const showDeleteConfirm = ref(false)
const deleting = ref(false)
async function deleteNode() {
  if (!node.value || deleting.value) return
  deleting.value = true
  try {
    const api = useApi()
    await api(`/nodes/${node.value.id}`, { method: 'DELETE' })
    store.deleteNode(node.value.id)
    showDeleteConfirm.value = false
    navigateTo('/nodes')
  } catch (e: any) {
    notify(e?.data?.message || t('nd_delete_notif_fail'), 'warning')
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <div v-if="node" class="detail-page">

    <!-- Back -->
    <div class="back-link" @click="navigateTo('/nodes')">{{ t('nd_back_link') }}</div>

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
        <div class="page-sub">{{ t('nd_subtitle', { ip: node.ip, v: currentVersion }) }}</div>
      </div>
      <div class="header-actions">
        <button class="btn-ghost" @click="showShare = true">{{ t('nd_share') }}</button>
        <button class="btn-ghost" @click="showConfig = true">{{ t('nd_configure') }}</button>
        <button
          class="btn-primary"
          :class="{ 'btn-danger': node.status === 'connected' }"
          :disabled="node.status === 'offline'"
          @click="onConnect"
        >
          {{ node.status === 'connected' ? t('nd_disconnect') : t('nd_connect') }}
        </button>
      </div>
    </div>

    <!-- Main grid -->
    <div class="detail-grid">

      <!-- Left col -->
      <div class="col-left">
        <div class="card">
          <div class="card-header">
            <div class="card-title">{{ t('nd_metrics_title') }}</div>
            <div class="card-meta">
              <div class="period-group">
                <button
                  v-for="p in periods" :key="p.value"
                  class="period-btn"
                  :class="{ active: period === p.value }"
                  @click="period = p.value"
                >{{ p.label }}</button>
              </div>
              <span class="heartbeat">{{ t('nd_heartbeat_ago') }}</span>
            </div>
          </div>
          <div class="card-body">

            <!-- Metric boxes -->
            <div class="metrics-grid">
              <div class="metric-box">
                <div class="metric-lbl">{{ t('nd_metric_cpu') }}</div>
                <div class="metric-val">{{ node.cpu ?? t('common_dash') }}<span class="metric-unit">%</span></div>
                <div class="metric-bar"><div class="metric-fill" :style="`width:${node.cpu ?? 0}%;background:${cpuColor}`" /></div>
                <div class="metric-sub">{{ t('nd_metric_load_avg') }}</div>
              </div>
              <div class="metric-box">
                <div class="metric-lbl">{{ t('nd_metric_memory') }}</div>
                <div class="metric-val">{{ node.ram ?? t('common_dash') }}<span class="metric-unit">%</span></div>
                <div class="metric-bar"><div class="metric-fill" :style="`width:${node.ram ?? 0}%;background:${ramColor}`" /></div>
                <div class="metric-sub">{{ ramUsed }} / {{ ramTotal }} GB</div>
              </div>
              <div class="metric-box">
                <div class="metric-lbl">{{ t('nd_metric_disk_label') }}</div>
                <div class="metric-val">{{ node.disk ?? t('common_dash') }}<span class="metric-unit">%</span></div>
                <div class="metric-bar"><div class="metric-fill" :style="`width:${node.disk ?? 0}%;background:${diskColor}`" /></div>
                <div class="metric-sub">15.4 / 29.3 GB</div>
              </div>
              <div class="metric-box">
                <div class="metric-lbl">{{ t('nd_metric_temp_label') }}</div>
                <div class="metric-val" :style="tempStyle">{{ node.temp ?? t('common_dash') }}<span class="metric-unit">°C</span></div>
                <div class="metric-bar"><div class="metric-fill" :style="`width:${node.temp ?? 0}%;background:${tempColor}`" /></div>
                <div class="metric-sub">{{ t('nd_metric_temp_thresh') }}</div>
              </div>
              <div class="metric-box">
                <div class="metric-lbl">{{ t('nd_metric_latency_vpn') }}</div>
                <div class="metric-val accent">{{ node.latency ?? t('common_dash') }}<span class="metric-unit">ms</span></div>
                <div class="metric-bar"><div class="metric-fill fill-green" :style="`width:${Math.min((node.latency ?? 0) / 2, 100)}%`" /></div>
                <div class="metric-sub">{{ t('nd_metric_ping') }}</div>
              </div>
              <div class="metric-box">
                <div class="metric-lbl">{{ t('nd_metric_uptime') }}</div>
                <div class="metric-val uptime-val">{{ uptimeDisplay }}</div>
                <div class="metric-bar"><div class="metric-fill fill-green" style="width:100%" /></div>
                <div class="metric-sub">{{ t('nd_metric_uptime_since', { date: uptimeSince }) }}</div>
              </div>
            </div>

            <!-- Chart separator -->
            <div class="chart-sep">
              <span class="chart-sep-lbl">{{ t('nd_history_label') }} <span class="accent">{{ periodLabel }}</span></span>
              <div class="chart-sep-line" />
            </div>

            <!-- Charts -->
            <ClientOnly>
              <div class="charts-section">
                <NodeChart
                  :title="t('nd_chart_bandwidth')"
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
                  :title="t('nd_chart_cpu_ram_temp')"
                  :data="systemData"
                  :categories="{
                    cpu:  { name: t('nd_metric_cpu'),    color: '#4fffb0', fmt: (v: number) => `${Math.round(v)}%`  },
                    ram:  { name: t('nd_metric_ram'),    color: '#7b6ef6', fmt: (v: number) => `${Math.round(v)}%`  },
                    temp: { name: t('nd_metric_temp'),   color: '#ffb74f', fmt: (v: number) => `${Math.round(v)}°C` },
                  }"
                  :height="120"
                  chart-type="line"
                  val-color="var(--text)"
                  :x-fmt="xFmt"
                />
                <NodeChart
                  :title="t('nd_chart_peers')"
                  :data="peersData"
                  :categories="{
                    peers: { name: t('nd_chart_peers_cat'), color: '#4fa8ff', fmt: (v: number) => t('nd_chart_peers_unit', { n: Math.round(v) }) },
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
            <div class="card-title">{{ t('nd_peers_card_title') }}</div>
            <span class="peers-count">{{ t('nd_peers_count', { active: wgActiveCount, total: wgPeersLocal.length }) }}</span>
            <button class="btn-ghost-sm" @click="showPeersMgmt = true">{{ t('common_manage') }}</button>
          </div>
          <div class="peers-table">
            <div class="peers-head">
              <span>{{ t('nd_peers_th_peer') }}</span>
              <span>{{ t('nd_peers_th_pubkey') }}</span>
              <span>{{ t('nd_peers_th_vpnip') }}</span>
              <span>{{ t('nd_peers_th_latency') }}</span>
              <span>{{ t('nd_peers_th_traffic') }}</span>
              <span>{{ t('nd_peers_th_handshake') }}</span>
              <span>{{ t('nd_peers_th_status') }}</span>
            </div>
            <div v-for="p in wgPeersLocal" :key="p.id" class="peer-row">
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
                {{ p.latency !== null ? `${p.latency} ms` : t('common_dash') }}
              </span>
              <div class="peer-traffic">
                <span class="traffic-up">↑ {{ p.upMb >= 1000 ? `${(p.upMb/1000).toFixed(1)} GB` : `${p.upMb} MB` }}</span>
                <span class="traffic-down">↓ {{ p.downGb }}</span>
              </div>
              <span class="peer-handshake">{{ peerHandshake(p.handshakeKey) }}</span>
              <span class="peer-status" :class="p.status === 'active' ? 'ps-active' : 'ps-inactive'">
                <span class="peer-sdot" />{{ p.status === 'active' ? t('nd_peer_active') : t('nd_peer_inactive') }}
              </span>
            </div>
          </div>
        </div>

        <!-- Recent activity -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">{{ t('nd_activity_title') }}</div>
            <span class="section-link" style="margin-left:auto;cursor:pointer" @click="showAllActivity = !showAllActivity">{{ showAllActivity ? t('nd_activity_collapse') : t('nd_activity_view_all') }}</span>
          </div>
          <div class="activity-list">
            <div v-for="ev in visibleActivity" :key="ev.id" class="activity-item">
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
          <div class="card-header"><div class="card-title">{{ t('nd_machine_title') }}</div></div>
          <div class="card-body card-body--tight">
            <div class="info-row"><span class="info-lbl">{{ t('nd_info_hardware') }}</span><span class="info-val">{{ t('nd_info_hw_value') }}</span></div>
            <div class="info-row"><span class="info-lbl">{{ t('nd_metric_ram') }}</span><span class="info-val">4 GB</span></div>
            <div class="info-row"><span class="info-lbl">{{ t('nd_machine_os') }}</span><span class="info-val">Ubuntu 24.04 LTS</span></div>
            <div class="info-row"><span class="info-lbl">{{ t('nd_info_arch') }}</span><span class="info-val">arm64</span></div>
            <div class="info-row"><span class="info-lbl">{{ t('nd_info_pubip') }}</span><span class="info-val">203.0.113.42 <span class="badge-blue">IPv4</span></span></div>
            <div class="info-row"><span class="info-lbl">{{ t('nd_info_loc') }}</span><span class="info-val">{{ node.location }}</span></div>
            <div class="info-row"><span class="info-lbl">{{ t('nd_info_isp') }}</span><span class="info-val">{{ t('nd_info_isp_value') }}</span></div>
          </div>
        </div>

        <!-- WireGuard -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">{{ t('nd_card_wireguard') }}</div>
            <span class="badge-accent">{{ t('nd_wg_iface_badge') }}</span>
          </div>
          <div class="card-body card-body--tight">
            <div class="info-row"><span class="info-lbl">{{ t('nd_wg_vpnip_label') }}</span><span class="info-val">{{ node.ip }}/32</span></div>
            <div class="info-row">
              <span class="info-lbl">{{ t('nd_wg_port_label') }}<InfoTip :text="t('nd_wg_info_port')" /></span>
              <span class="info-val">:51820 UDP</span>
            </div>
            <div class="info-row">
              <span class="info-lbl">{{ t('nd_wg_mtu') }}<InfoTip :text="t('nd_wg_info_mtu')" /></span>
              <span class="info-val">1420</span>
            </div>
            <div class="info-row">
              <span class="info-lbl">{{ t('nd_wg_dns') }}<InfoTip :text="t('nd_wg_info_dns')" /></span>
              <span class="info-val">1.1.1.1, 8.8.8.8</span>
            </div>
            <div class="info-row">
              <span class="info-lbl">{{ t('nd_wg_pubkey_label') }}<InfoTip :text="t('nd_wg_info_pubkey')" /></span>
              <span class="info-val">xK3mP2…n9Qa <button class="copy-btn" :title="copiedKey ? t('nd_wg_pubkey_copied') : t('nd_wg_pubkey_copy')" @click="copyPubkey"><UIcon :name="copiedKey ? 'i-lucide-check' : 'i-lucide-copy'" style="width:10px;height:10px" /></button></span>
            </div>
            <div class="info-row">
              <span class="info-lbl">{{ t('nd_wg_peers') }}<InfoTip :text="t('nd_wg_info_peers')" /></span>
              <span class="info-val">{{ t('nd_wg_peers_short') }}</span>
            </div>
          </div>
        </div>

        <!-- Agent UMBRA -->
        <div class="card">
          <div class="card-header"><div class="card-title">{{ t('nd_agent_title') }}</div></div>
          <div class="card-body card-body--tight">
            <div class="info-row">
              <span class="info-lbl">{{ t('nd_version_label') }}</span>
              <span class="info-val">
                v{{ currentVersion }}
                <span v-if="!updateAvailable" class="badge-green">{{ t('nd_version_uptodate') }}</span>
                <span v-else class="badge-warning">{{ t('nd_version_avail', { v: latestVersion }) }}</span>
              </span>
            </div>
            <div class="info-row">
              <span class="info-lbl">{{ t('nd_agent_heartbeat_label') }}<InfoTip :text="t('nd_agent_info_hb')" /></span>
              <span class="info-val accent">{{ t('nd_agent_heartbeat_val') }}</span>
            </div>
            <div class="info-row">
              <span class="info-lbl">{{ t('nd_agent_interval_label') }}<InfoTip :text="t('nd_agent_info_int')" /></span>
              <span class="info-val">30s</span>
            </div>
            <div class="info-row">
              <span class="info-lbl">{{ t('nd_agent_autoupdate_label') }}<InfoTip :text="t('nd_agent_info_au')" /></span>
              <span class="info-val toggle-row" style="cursor:pointer" @click="autoUpdate = !autoUpdate">
                <span :class="autoUpdate ? 'accent' : 'muted'">{{ autoUpdate ? t('nd_agent_active') : t('nd_agent_inactive') }}</span>
                <span class="toggle" :class="{ on: autoUpdate }"><span class="toggle-thumb" /></span>
              </span>
            </div>
            <div class="info-row">
              <span class="info-lbl">{{ t('nd_agent_jwt_label') }}<InfoTip :text="t('nd_agent_info_jwt')" position="bottom" /></span>
              <span class="info-val">{{ t('nd_agent_jwt_val') }}</span>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="card">
          <div class="card-header"><div class="card-title">{{ t('nd_actions_title') }}</div></div>
          <div class="actions-body">
            <button v-if="updateAvailable" class="action-btn update" @click="doUpdate">
              <UIcon name="i-lucide-arrow-up-circle" style="width:13px;height:13px" />
              {{ t('nd_action_update_to', { v: latestVersion }) }}
            </button>
            <button class="action-btn" :disabled="restarting" @click="restartAgent">
              <UIcon name="i-lucide-rotate-ccw" style="width:13px;height:13px" :class="{ 'icon-spin': restarting }" />
              {{ restarting ? t('nd_action_restarting') : t('nd_action_restart') }}
            </button>
            <button class="action-btn" @click="showRegenConfirm = true">
              <UIcon name="i-lucide-key" style="width:13px;height:13px" />
              {{ t('nd_action_regen_wg') }}
            </button>
            <button class="action-btn" @click="downloadConf">
              <UIcon name="i-lucide-download" style="width:13px;height:13px" />
              {{ t('nd_action_dl_conf') }}
            </button>
            <button class="action-btn" @click="showLogsModal = true">
              <UIcon name="i-lucide-file-text" style="width:13px;height:13px" />
              {{ t('nd_action_view_logs') }}
            </button>
            <div class="actions-separator" />
            <button class="action-btn danger" @click="showDeleteConfirm = true">
              <UIcon name="i-lucide-trash-2" style="width:13px;height:13px" />
              {{ t('nd_action_delete') }}
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
            <div class="modal-title">{{ t('nd_share_title', { name: node.name }) }}</div>
            <div class="modal-sub">{{ t('nd_share_sub') }}</div>
          </div>
          <button class="close-btn" @click="showShare = false"><UIcon name="i-lucide-x" style="width:12px;height:12px" /></button>
        </div>
        <div class="modal-body">

          <!-- Search -->
          <div class="form-group">
            <label class="form-label">{{ t('nd_share_add_user') }}</label>
            <div class="search-wrap">
              <div class="search-input-row">
                <UIcon name="i-lucide-search" class="search-ico" style="width:13px;height:13px" />
                <input
                  v-model="searchQuery"
                  class="search-input"
                  :placeholder="t('nd_share_search_ph')"
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
                  <span class="result-badge">{{ t('nd_share_badge_umbra') }}</span>
                </div>
                <div v-if="showExternalInvite" class="search-result external" @mousedown.prevent="inviteExternal">
                  <div class="result-avatar ext-avatar">✉</div>
                  <div class="result-info">
                    <div class="result-name">{{ t('nd_share_invite', { q: searchQuery }) }}</div>
                    <div class="result-email">{{ t('nd_share_invite_sub') }}</div>
                  </div>
                  <span class="result-badge ext">{{ t('nd_share_badge_new') }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Permission picker -->
          <div class="form-group">
            <label class="form-label">{{ t('nd_share_default_perm') }}</label>
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
            <label class="form-label">{{ t('nd_share_active', { n: activeMembers.length }) }}</label>
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
            <label class="form-label">{{ t('nd_share_pending', { n: pendingMembers.length }) }}</label>
            <div class="members-list">
              <div v-for="m in pendingMembers" :key="m.id" class="member-item pending">
                <div class="pending-avatar">?</div>
                <div class="member-info">
                  <div class="member-name">{{ m.email }}</div>
                  <div class="member-email pending-lbl"><UIcon name="i-lucide-hourglass" style="width:10px;height:10px" /> {{ t('nd_share_pending_lbl', { p: m.perm }) }}</div>
                </div>
                <button class="revoke-btn" @click="revokeMember(m.id)"><UIcon name="i-lucide-x" style="width:10px;height:10px" /></button>
              </div>
            </div>
          </div>

          <div v-if="members.length === 0" class="members-empty">{{ t('nd_share_empty') }}</div>

        </div>
        <div class="modal-footer">
          <button class="btn-ghost-sm" @click="showShare = false">{{ t('common_close') }}</button>
        </div>
      </div>
    </div>


    <!-- WireGuard Config modal -->
    <div v-if="showConfig" class="modal-overlay" @click.self="showConfig = false">
      <div class="modal">
        <div class="modal-header">
          <div><div class="modal-title">{{ t('nd_cfg_title') }}</div><div class="modal-sub">{{ t('nd_cfg_sub', { name: node.name }) }}</div></div>
          <button class="close-btn" @click="showConfig = false"><UIcon name="i-lucide-x" style="width:12px;height:12px" /></button>
        </div>
        <div class="modal-body">
          <div class="cfg-grid">
            <div class="form-group">
              <label class="form-label">
                <span class="form-label-text">{{ t('nd_cfg_port_label') }}<InfoTip :text="t('nd_cfg_info_port')" position="bottom" /></span>
              </label>
              <input v-model="cfgPort" class="form-input" placeholder="51820" />
            </div>
            <div class="form-group">
              <label class="form-label">
                <span class="form-label-text">{{ t('nd_cfg_mtu_label') }}<InfoTip :text="t('nd_cfg_info_mtu')" position="bottom" /></span>
              </label>
              <input v-model="cfgMtu" class="form-input" placeholder="1420" />
            </div>
            <div class="form-group" style="grid-column: span 2">
              <label class="form-label">
                <span class="form-label-text">{{ t('nd_cfg_dns_label') }}<InfoTip :text="t('nd_cfg_info_dns')" position="bottom" /></span>
              </label>
              <input v-model="cfgDns" class="form-input" placeholder="1.1.1.1, 8.8.8.8" />
            </div>
            <div class="form-group" style="grid-column: span 2">
              <label class="form-label">
                <span class="form-label-text">{{ t('nd_cfg_allowed_label') }}<InfoTip :text="t('nd_cfg_info_allowed')" position="bottom" /></span>
              </label>
              <input v-model="cfgAllowedIPs" class="form-input" placeholder="100.64.0.0/10" />
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-ghost-sm" @click="showConfig = false">{{ t('common_cancel') }}</button>
          <button class="btn-accent-sm" @click="showConfig = false; notify(t('nd_cfg_save_notif'), 'success')">{{ t('nd_cfg_save') }}</button>
        </div>
      </div>
    </div>

    <!-- WG Peers management modal -->
    <div v-if="showPeersMgmt" class="modal-overlay" @click.self="showPeersMgmt = false">
      <div class="modal">
        <div class="modal-header">
          <div><div class="modal-title">{{ t('nd_peers_mgmt_title') }}</div><div class="modal-sub">{{ t('nd_peers_mgmt_sub', { total: wgPeersLocal.length, active: wgActiveCount }) }}</div></div>
          <button class="close-btn" @click="showPeersMgmt = false"><UIcon name="i-lucide-x" style="width:12px;height:12px" /></button>
        </div>
        <div class="modal-body">
          <div class="peers-mgmt-list">
            <div v-for="p in wgPeersLocal" :key="p.id" class="peers-mgmt-row">
              <div class="peer-avatar" :style="`background:${p.color}`">{{ p.avatar }}</div>
              <div class="peers-mgmt-info">
                <div class="peer-name">{{ p.name }}</div>
                <div class="peer-device">{{ p.device }} · {{ p.ip }}</div>
              </div>
              <span class="peer-status" :class="p.status === 'active' ? 'ps-active' : 'ps-inactive'" style="margin-right:8px">
                <span class="peer-sdot" />{{ p.status === 'active' ? t('nd_peer_active') : t('nd_peer_inactive') }}
              </span>
              <button class="revoke-btn" @click="removePeer(p.id)"><UIcon name="i-lucide-x" style="width:10px;height:10px" /></button>
            </div>
          </div>
          <div class="form-group" style="margin-top:14px">
            <label class="form-label">{{ t('nd_peers_add_label') }}</label>
            <div class="peers-add-row">
              <input v-model="newPeerKey" class="form-input" :placeholder="t('nd_peers_add_key_ph')" style="flex:2" />
              <input v-model="newPeerIp"  class="form-input" :placeholder="t('nd_peers_add_ip_ph')" style="flex:1" />
              <button class="btn-accent-sm" :disabled="!newPeerKey || !newPeerIp" @click="addPeer">{{ t('nd_peers_add_btn') }}</button>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-ghost-sm" @click="showPeersMgmt = false">{{ t('common_close') }}</button>
        </div>
      </div>
    </div>

    <!-- Logs modal -->
    <div v-if="showLogsModal" class="modal-overlay" @click.self="showLogsModal = false">
      <div class="modal">
        <div class="modal-header">
          <div><div class="modal-title">{{ t('nd_logs_modal_title', { name: node.name }) }}</div><div class="modal-sub">{{ t('nd_logs_modal_sub') }}</div></div>
          <button class="close-btn" @click="showLogsModal = false"><UIcon name="i-lucide-x" style="width:12px;height:12px" /></button>
        </div>
        <div class="modal-body" style="max-height:360px;overflow-y:auto">
          <div class="activity-list">
            <div v-for="ev in extendedActivity" :key="ev.id" class="activity-item">
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
        <div class="modal-footer">
          <button class="btn-ghost-sm" @click="showLogsModal = false">{{ t('common_close') }}</button>
        </div>
      </div>
    </div>

    <!-- Regen keys confirm -->
    <div v-if="showRegenConfirm" class="modal-overlay" @click.self="showRegenConfirm = false">
      <div class="modal confirm-modal">
        <div class="modal-header">
          <div class="modal-title">{{ t('nd_regen_modal_title') }}</div>
          <button class="close-btn" @click="showRegenConfirm = false"><UIcon name="i-lucide-x" style="width:12px;height:12px" /></button>
        </div>
        <div class="modal-body">
          <div class="confirm-warn">
            <UIcon name="i-lucide-triangle-alert" style="width:14px;height:14px;flex-shrink:0" />
            {{ t('nd_regen_modal_warn') }}
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-ghost-sm" @click="showRegenConfirm = false">{{ t('common_cancel') }}</button>
          <button class="btn-danger-sm" @click="regenKeys">{{ t('nd_regen_modal_btn') }}</button>
        </div>
      </div>
    </div>

    <!-- Delete node confirm -->
    <div v-if="showDeleteConfirm" class="modal-overlay" @click.self="showDeleteConfirm = false">
      <div class="modal confirm-modal">
        <div class="modal-header">
          <div class="modal-title">{{ t('nd_delete_modal_title', { name: node.name }) }}</div>
          <button class="close-btn" @click="showDeleteConfirm = false"><UIcon name="i-lucide-x" style="width:12px;height:12px" /></button>
        </div>
        <div class="modal-body">
          <div class="confirm-warn">
            <UIcon name="i-lucide-triangle-alert" style="width:14px;height:14px;flex-shrink:0" />
            {{ t('nd_delete_modal_warn') }}
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-ghost-sm" @click="showDeleteConfirm = false">{{ t('common_cancel') }}</button>
          <button class="btn-danger-sm" :disabled="deleting" @click="deleteNode">{{ deleting ? t('nd_delete_progress') : t('nd_delete_modal_btn') }}</button>
        </div>
      </div>
    </div>

  </div>

  <div v-else-if="store.loading" class="state-msg">{{ t('nd_state_loading') }}</div>
  <div v-else class="state-msg">{{ t('nd_state_not_found') }}</div>
</template>

<style scoped>
.detail-page { display: flex; flex-direction: column; }

.cfg-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

.peers-mgmt-list { display: flex; flex-direction: column; gap: 2px; }
.peers-mgmt-row { display: flex; align-items: center; gap: 10px; padding: 8px 4px; border-bottom: 1px solid var(--border); }
.peers-mgmt-row:last-child { border-bottom: none; }
.peers-mgmt-info { flex: 1; min-width: 0; }

.peers-add-row { display: flex; gap: 8px; align-items: center; }

.confirm-modal { max-width: 420px; }
@keyframes spin { to { transform: rotate(-360deg); } }
.icon-spin { animation: spin 1s linear infinite; display: inline-block; }

.restart-msg {
  display: flex; align-items: flex-start; gap: 8px;
  padding: 8px 12px; border-radius: var(--r);
  font-size: 11px; line-height: 1.4; margin-top: 2px;
}
.restart-msg-ok {
  background: color-mix(in srgb, var(--accent) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent) 20%, transparent);
  color: var(--accent);
}
.restart-msg-warn {
  background: color-mix(in srgb, var(--warning) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--warning) 20%, transparent);
  color: var(--warning);
}

.confirm-warn {
  display: flex; align-items: flex-start; gap: 10px;
  padding: 12px 14px; border-radius: var(--r);
  background: color-mix(in srgb, var(--warning) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--warning) 25%, transparent);
  color: var(--warning); font-size: 12px; line-height: 1.5;
}

</style>
