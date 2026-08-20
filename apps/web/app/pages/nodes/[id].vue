<script setup lang="ts">
import { categoryIcons } from '~/composables/useCategoryIcons'

definePageMeta({ layout: 'default' })

const route = useRoute()
const store = useNodesStore()
const { t } = useT()

// ── API state ────────────────────────────────────────────
const apiNode    = ref<any>(null)
const rawMetrics = ref<any[]>([])
const rawPeers   = ref<any[]>([])
const loading    = ref(true)

// Period must be declared before fetch functions (used in fetchMetrics)
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

function periodSince(p: string): string {
  const now = new Date()
  switch (p) {
    case '1h': now.setHours(now.getHours() - 1); break
    case '1j': now.setDate(now.getDate() - 1); break
    case '1s': now.setDate(now.getDate() - 7); break
    case '1m': now.setMonth(now.getMonth() - 1); break
    case '1a': now.setFullYear(now.getFullYear() - 1); break
  }
  return now.toISOString()
}

async function fetchNode() {
  const api = useApi()
  const res = await api<{ node: any }>(`/nodes/${route.params.id}`)
  apiNode.value = res.node
}
async function fetchMetrics() {
  const api = useApi()
  const res = await api<{ metrics: any[] }>(`/nodes/${route.params.id}/metrics`, {
    params: { since: periodSince(period.value), limit: 5000 },
  })
  rawMetrics.value = res.metrics
}
async function fetchPeers() {
  const api = useApi()
  const res = await api<{ peers: any[] }>(`/nodes/${route.params.id}/peers`)
  rawPeers.value = res.peers
}
async function loadAll() {
  loading.value = true
  try { await Promise.all([fetchNode(), fetchMetrics(), fetchPeers()]) } finally { loading.value = false }
}

let pollTimer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  if (!store.nodes.length) store.fetchNodes()
  loadAll()
  pollTimer = setInterval(() => { fetchNode(); fetchMetrics() }, 10_000)
  liveTickHandle = setInterval(() => { liveNow.value = Date.now() }, 1000)
})

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
  if (liveTickHandle) clearInterval(liveTickHandle)
  if (enrollTickHandle) clearInterval(enrollTickHandle)
})

watch(period, fetchMetrics)

// ── Unified node object ──────────────────────────────────
const storeNode     = computed(() => store.nodes.find(n => n.id === route.params.id) ?? null)
const latestMetric  = computed(() => rawMetrics.value[0] ?? null)

const node = computed(() => {
  if (!apiNode.value && !storeNode.value) return null
  const a = apiNode.value
  const s = storeNode.value
  const m = latestMetric.value
  return {
    id:       a?.id       ?? s?.id,
    name:     a?.name     ?? s?.name     ?? '—',
    status:   s?.status   ?? a?.status   ?? 'offline',
    category: a?.category ?? s?.category ?? 'other',
    ip:            a?.wireguardIp  ?? s?.ip       ?? '—',
    ipAddress:     a?.ipAddress    ?? null,
    location:      a ? ([a.city, a.countryCode].filter(Boolean).join(', ') || '—') : (s?.location ?? '—'),
    country:       a?.countryCode  ?? s?.country  ?? '—',
    lat:           a?.latitude     ?? s?.lat ?? 0,
    lng:           a?.longitude    ?? s?.lng ?? 0,
    latency:       m?.latencyMs            ?? null,
    cpu:           m?.cpuPercent           ?? null,
    cpuCores:      m?.cpuCores             ?? null,
    loadAvg:       m?.loadAvg              ?? null,
    ram:           m?.memoryPercent        ?? null,
    ramTotalGb:    m?.memTotalGb           ?? null,
    disk:          m?.diskPercent          ?? null,
    diskTotalGb:   m?.diskTotalGb          ?? null,
    temp:          m?.temperatureCelsius   ?? null,
    uptime:        m?.uptimeSeconds        ?? null,
    lastSeen:      a?.lastSeenAt           ?? s?.lastSeen ?? null,
    wireguardPubkey: a?.wireguardPubkey    ?? null,
    wireguardPort:   a?.wireguardPort      ?? 51820,
    hardwareModel:   a?.hardwareModel      ?? null,
    arch:            a?.arch               ?? null,
    osVersion:       a?.osVersion          ?? null,
    agentVersion:    a?.agentVersion       ?? null,
    activePeers:     m?.activePeers        ?? null,
  }
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

const ramTotalGb = computed(() => node.value?.ramTotalGb ?? null)
const ramUsed    = computed(() => {
  const pct = node.value?.ram
  const tot = ramTotalGb.value
  if (!pct || !tot) return t('common_dash')
  return ((pct / 100) * tot).toFixed(1)
})
const diskTotalGb = computed(() => node.value?.diskTotalGb ?? null)
const diskUsed    = computed(() => {
  const pct = node.value?.disk
  const tot = diskTotalGb.value
  if (!pct || !tot) return t('common_dash')
  return ((pct / 100) * tot).toFixed(1)
})

const uptimeDisplay = computed(() => {
  const s = node.value?.uptime
  if (!s) return t('common_dash')
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (d > 0) return `${d}j ${h}h`
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${sec}s`
  return `${sec}s`
})
const uptimeSince = computed(() => {
  const s = node.value?.uptime
  if (!s) return t('common_dash')
  const d = new Date(Date.now() - s * 1000)
  return d.toLocaleDateString(t('date_locale'), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
})

// ── Chart data from real metrics ─────────────────────────
// API returns newest-first; charts need oldest-first
const sortedMetrics = computed(() => [...rawMetrics.value].reverse())

const systemData = computed(() =>
  sortedMetrics.value.map(m => ({
    ts:   new Date(m.recordedAt).getTime(),
    cpu:  +(m.cpuPercent ?? 0).toFixed(1),
    ram:  +(m.memoryPercent ?? 0).toFixed(1),
    temp: +(m.temperatureCelsius ?? 0).toFixed(1),
  }))
)

const bandwidthData = computed(() => {
  const ms = sortedMetrics.value
  if (ms.length < 2) return []
  return ms.slice(1).map((cur, i) => {
    const prev  = ms[i]!
    const dtSec = (new Date(cur.recordedAt).getTime() - new Date(prev.recordedAt).getTime()) / 1000
    const up    = dtSec > 0 && cur.bytesSent     != null && prev.bytesSent     != null
      ? Math.max(0, (cur.bytesSent - prev.bytesSent) / dtSec / 1_000_000) : 0
    const down  = dtSec > 0 && cur.bytesReceived != null && prev.bytesReceived != null
      ? Math.max(0, (cur.bytesReceived - prev.bytesReceived) / dtSec / 1_000_000) : 0
    return { ts: new Date(cur.recordedAt).getTime(), up: +up.toFixed(2), down: +down.toFixed(2) }
  })
})

const peersData = computed(() =>
  sortedMetrics.value.map(m => ({
    ts:    new Date(m.recordedAt).getTime(),
    peers: m.activePeers ?? 0,
  }))
)

// X-axis formatter adapts to the actual data span (not the selected period)
function fmtHHmm(ts: number) {
  const d = new Date(ts)
  return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0')
}
const xFmt = computed(() => {
  const ms = sortedMetrics.value
  const loc = t('date_locale')
  if (ms.length < 2) return fmtHHmm
  const spanMs = new Date(ms[ms.length - 1]!.recordedAt).getTime() - new Date(ms[0]!.recordedAt).getTime()
  const spanDays = spanMs / 86_400_000
  if (spanDays >= 60)
    return (ts: number) => new Date(ts).toLocaleDateString(loc, { month: 'short' }).replace('.', '')
  if (spanDays >= 4)
    return (ts: number) => { const d = new Date(ts); return d.toLocaleDateString(loc, { weekday: 'short' }).replace('.', '') + '\u00a0' + d.getDate() }
  if (spanDays >= 1)
    return (ts: number) => { const d = new Date(ts); return d.getDate() + '\u00a0' + d.toLocaleDateString(loc, { month: 'short' }).replace('.', '') + ' ' + d.getHours() + 'h' }
  return fmtHHmm
})

// ── WireGuard peers from API ─────────────────────────────
const PEER_COLORS = [
  'linear-gradient(135deg,#4fffb0,#3b82f6)',
  'linear-gradient(135deg,#ff6b6b,#ffa726)',
  'linear-gradient(135deg,#4fa8ff,#7b6ef6)',
  'linear-gradient(135deg,#a78bfa,#7b6ef6)',
  'linear-gradient(135deg,#10b981,#3b82f6)',
]
function mapPeer(p: any, i: number) {
  const mb = (bytes: number | null) => bytes != null ? bytes / 1_000_000 : null
  const downMb = mb(p.bytesReceived)
  return {
    id:      p.id,
    name:    p.peerName ?? p.peerPubkey.slice(0, 8),
    device:  p.endpoint ?? '—',
    pubkey:  p.peerPubkey.length > 12 ? p.peerPubkey.slice(0, 6) + '…' + p.peerPubkey.slice(-4) : p.peerPubkey,
    ip:      p.allowedIps?.[0] ?? '—',
    latency: null,
    upMb:    Math.round(mb(p.bytesSent) ?? 0),
    downGb:  downMb != null ? (downMb >= 1000 ? `${(downMb / 1000).toFixed(1)} GB` : `${Math.round(downMb)} MB`) : '—',
    handshakeAt: p.lastHandshakeAt,
    status:  p.isActive ? 'active' : 'inactive',
    avatar:  (p.peerName?.[0] ?? '?').toUpperCase(),
    color:   PEER_COLORS[i % PEER_COLORS.length]!,
  }
}
const wgPeersLocal  = ref<any[]>([])
watch(rawPeers, (peers) => { wgPeersLocal.value = peers.map(mapPeer) }, { immediate: true })
const wgActiveCount = computed(() => wgPeersLocal.value.filter(p => p.status === 'active').length)
function peerHandshake(p: any) {
  if (!p.handshakeAt) return t('common_dash')
  const diff = Date.now() - new Date(p.handshakeAt).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60)  return t('nd_peer_hs_Xs',  { n: s })
  if (s < 3600) return t('nd_peer_hs_Xm', { n: Math.floor(s / 60) })
  return t('nd_peer_hs_Xh', { n: Math.floor(s / 3600) })
}


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
  const key = node.value?.wireguardPubkey
  if (!key) return
  navigator.clipboard.writeText(key)
  copiedKey.value = true
  setTimeout(() => copiedKey.value = false, 2000)
}

const { notify } = useNotifications()

// Migrate node modal
const showEnrollModal   = ref(false)
const enrollLoading     = ref(false)
const enrollToken       = ref<string | null>(null)
const enrollInstallCommand = ref<string | null>(null)
const enrollExpiresAt   = ref<string | null>(null)
const enrollExpired     = ref(false)
const enrollRegenerating = ref(false)
const enrollCopiedCmd   = ref(false)
const enrollNow         = ref(Date.now())
let enrollTickHandle: ReturnType<typeof setInterval> | null = null

const liveNow = ref(Date.now())
let liveTickHandle: ReturnType<typeof setInterval> | null = null

const lastSeenAgo = computed(() => {
  const ls = node.value?.lastSeen
  if (!ls) return '—'
  const diff = Math.max(0, Math.floor((liveNow.value - new Date(ls).getTime()) / 1000))
  if (diff < 60) return `il y a ${diff}s`
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)}m`
  return `il y a ${Math.floor(diff / 3600)}h`
})

watch(enrollNow, () => {
  if (enrollExpired.value || !enrollExpiresAt.value) return
  if (new Date(enrollExpiresAt.value).getTime() <= enrollNow.value) enrollExpired.value = true
})

const enrollExpiresLabel = computed(() => {
  if (!enrollExpiresAt.value) return null
  const diff = new Date(enrollExpiresAt.value).getTime() - enrollNow.value
  if (diff <= 0) return t('onb_token_expired')
  const m = Math.floor(diff / 60_000)
  const s = Math.floor((diff % 60_000) / 1_000)
  return `${m}m ${s.toString().padStart(2, '0')}s`
})

const enrollInstallCmd = computed(() => {
  if (!enrollToken.value || !node.value) return null
  return enrollInstallCommand.value ?? `curl -sSL http://localhost:3333/install.sh | bash -s -- --name=${node.value.name} --category=${node.value.category} --token=${enrollToken.value}`
})

async function generateEnrollToken() {
  enrollLoading.value  = true
  enrollToken.value    = null
  enrollExpiresAt.value = null
  enrollExpired.value  = false
  showEnrollModal.value = true
  if (!enrollTickHandle) enrollTickHandle = setInterval(() => { enrollNow.value = Date.now() }, 1000)
  try {
    const api = useApi()
    const res = await api<{ enrollToken: string; expiresAt: string; installCommand: string }>(
      `/nodes/${route.params.id}/enroll-token`, { method: 'POST' }
    )
    enrollToken.value          = res.enrollToken
    enrollExpiresAt.value      = res.expiresAt
    enrollInstallCommand.value = res.installCommand
  } catch {
    notify('Erreur lors de la génération du token', 'error')
    showEnrollModal.value = false
  } finally {
    enrollLoading.value = false
  }
}

async function regenerateEnrollToken() {
  enrollRegenerating.value = true
  try {
    const api = useApi()
    const res = await api<{ enrollToken: string; expiresAt: string; installCommand: string }>(
      `/nodes/${route.params.id}/enroll-token`, { method: 'POST' }
    )
    enrollToken.value          = res.enrollToken
    enrollExpiresAt.value      = res.expiresAt
    enrollInstallCommand.value = res.installCommand
    enrollExpired.value        = false
  } catch {
    notify('Erreur lors du renouvellement', 'error')
  } finally {
    enrollRegenerating.value = false
  }
}

function closeEnrollModal() {
  showEnrollModal.value = false
  if (enrollTickHandle) { clearInterval(enrollTickHandle); enrollTickHandle = null }
}

const enrollCopiedStop = ref(false)
function copyEnrollStop() {
  navigator.clipboard.writeText('sudo umbra-agent stop')
  enrollCopiedStop.value = true
  setTimeout(() => enrollCopiedStop.value = false, 2000)
}
function copyEnrollCmd() {
  if (!enrollInstallCmd.value) return
  navigator.clipboard.writeText(enrollInstallCmd.value)
  enrollCopiedCmd.value = true
  setTimeout(() => enrollCopiedCmd.value = false, 2000)
}

// Actions
const restarting = ref(false)

// Agent auto-update
const autoUpdate      = ref(true)
const updateAvailable = ref(false)   // mock: pas de mise à jour dispo par défaut
const latestVersion   = '1.2.0'

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
/* ── Transfert de propriété ─────────────────────────────────────────────── */
interface TransferTarget { id: string | null; name: string }
const showTransfer   = ref(false)
const transferring   = ref(false)
const transferTarget = ref<string | null>(null)
const myOrgs         = ref<{ id: string; name: string; role: string }[]>([])

// Personal plus every org the caller administers — the only moves the API takes.
const transferTargets = computed<TransferTarget[]>(() => [
  { id: null, name: t('addnode_owner_personal') },
  ...myOrgs.value.map((o) => ({ id: o.id, name: o.name })),
])

onMounted(async () => {
  try {
    const api = useApi()
    const res = await api<{ data: { id: string; name: string; role: string }[] }>('/orgs')
    myOrgs.value = res.data.filter((o) => o.role === 'owner' || o.role === 'admin')
  } catch { myOrgs.value = [] }
})

function openTransfer() {
  transferTarget.value = apiNode.value?.ownerOrgId ?? null
  showTransfer.value = true
}

async function doTransfer() {
  if (transferring.value || !node.value) return
  transferring.value = true
  try {
    const api = useApi()
    await api(`/nodes/${node.value.id}/transfer`, {
      method: 'POST',
      body: { orgId: transferTarget.value },
    })
    showTransfer.value = false
    await fetchNode()
    notify({ title: t('notif_transfer_done'), type: 'success' })
  } catch (e: any) {
    notify({ title: t('notif_transfer_failed'), description: e?.data?.message, type: 'error' })
  } finally {
    transferring.value = false
  }
}
</script>

<template>
  <div v-if="loading && !node" class="detail-page" style="display:flex;align-items:center;justify-content:center;min-height:300px">
    <span style="color:var(--muted);font-size:12px">{{ t('common_loading') }}</span>
  </div>
  <div v-else-if="node" class="detail-page">

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
        <div class="page-sub">{{ node.ip }}{{ node.hardwareModel ? ' · ' + node.hardwareModel : '' }}{{ node.osVersion ? ' · ' + node.osVersion : '' }}{{ node.agentVersion ? ' · Agent v' + node.agentVersion : '' }}</div>
      </div>
      <div class="header-actions">
        <button class="btn-ghost" @click="showShare = true">{{ t('nd_share') }}</button>
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
              <span class="heartbeat">{{ lastSeenAgo }}</span>
            </div>
          </div>
          <div class="card-body">

            <!-- Metric boxes -->
            <div class="metrics-grid">
              <div class="metric-box">
                <div class="metric-lbl">{{ t('nd_metric_cpu') }}</div>
                <div class="metric-val">{{ node.cpu ?? t('common_dash') }}<span class="metric-unit">%</span></div>
                <div class="metric-bar"><div class="metric-fill" :style="`width:${node.cpu ?? 0}%;background:${cpuColor}`" /></div>
                <div class="metric-sub">
                  {{ node.loadAvg != null ? 'load ' + node.loadAvg.toFixed(2) : '—' }}
                  {{ node.cpuCores != null ? ' · ' + node.cpuCores + ' cores' : '' }}
                </div>
              </div>
              <div class="metric-box">
                <div class="metric-lbl">{{ t('nd_metric_memory') }}</div>
                <div class="metric-val">{{ node.ram ?? t('common_dash') }}<span class="metric-unit">%</span></div>
                <div class="metric-bar"><div class="metric-fill" :style="`width:${node.ram ?? 0}%;background:${ramColor}`" /></div>
                <div class="metric-sub">{{ ramUsed }} / {{ ramTotalGb ? ramTotalGb.toFixed(0) + ' GB' : '—' }}</div>
              </div>
              <div class="metric-box">
                <div class="metric-lbl">{{ t('nd_metric_disk_label') }}</div>
                <div class="metric-val">{{ node.disk ?? t('common_dash') }}<span class="metric-unit">%</span></div>
                <div class="metric-bar"><div class="metric-fill" :style="`width:${node.disk ?? 0}%;background:${diskColor}`" /></div>
                <div class="metric-sub">{{ diskUsed }} / {{ diskTotalGb ? diskTotalGb.toFixed(0) + ' GB' : '—' }}</div>
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
              <span class="peer-handshake">{{ peerHandshake(p) }}</span>
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
            <div class="info-row"><span class="info-lbl">{{ t('nd_info_hardware') }}<InfoTip :text="t('nd_info_hardware_tip')" /></span><span class="info-val">{{ node.hardwareModel ?? t('common_dash') }}</span></div>
            <div class="info-row"><span class="info-lbl">{{ t('nd_info_arch') }}<InfoTip :text="t('nd_info_arch_tip')" /></span><span class="info-val">{{ node.arch ?? t('common_dash') }}</span></div>
            <div class="info-row"><span class="info-lbl">{{ t('nd_machine_os') }}<InfoTip :text="t('nd_info_os_tip')" /></span><span class="info-val">{{ node.osVersion ?? t('common_dash') }}</span></div>
            <div class="info-row"><span class="info-lbl">{{ t('nd_info_pubip') }}<InfoTip :text="t('nd_info_pubip_tip')" /></span><span class="info-val">{{ node.ipAddress ?? t('common_dash') }}<span v-if="node.ipAddress" class="badge-blue">IPv4</span></span></div>
            <div class="info-row"><span class="info-lbl">{{ t('nd_info_loc') }}<InfoTip :text="t('nd_info_loc_tip')" /></span><span class="info-val">{{ node.location }}</span></div>
            <div class="info-row"><span class="info-lbl">{{ t('nd_info_isp') }}<InfoTip :text="t('nd_info_isp_tip')" /></span><span class="info-val">{{ t('common_dash') }}</span></div>
          </div>
        </div>

        <!-- WireGuard -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">{{ t('nd_card_wireguard') }}</div>
            <span class="badge-accent">{{ t('nd_wg_iface_badge') }}</span>
          </div>
          <div class="card-body card-body--tight">
            <div class="info-row"><span class="info-lbl">{{ t('nd_wg_vpnip_label') }}</span><span class="info-val">{{ node.ip !== '—' ? `${node.ip}/32` : t('common_dash') }}</span></div>
            <div class="info-row">
              <span class="info-lbl">{{ t('nd_wg_pubkey_label') }}<InfoTip :text="t('nd_wg_info_pubkey')" /></span>
              <span class="info-val">
                <template v-if="node.wireguardPubkey">{{ node.wireguardPubkey.slice(0,6) }}…{{ node.wireguardPubkey.slice(-4) }}</template>
                <template v-else>{{ t('common_dash') }}</template>
                <button v-if="node.wireguardPubkey" class="copy-btn" :title="copiedKey ? t('nd_wg_pubkey_copied') : t('nd_wg_pubkey_copy')" @click="copyPubkey"><UIcon :name="copiedKey ? 'i-lucide-check' : 'i-lucide-copy'" style="width:10px;height:10px" /></button>
              </span>
            </div>
            <div class="info-row">
              <span class="info-lbl">{{ t('nd_wg_peers') }}<InfoTip :text="t('nd_wg_info_peers')" /></span>
              <span class="info-val">{{ t('nd_wg_peers_short', { n: wgActiveCount }) }}</span>
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
                {{ node.agentVersion ? `v${node.agentVersion}` : t('common_dash') }}
                <span v-if="node.agentVersion && !updateAvailable" class="badge-green">{{ t('nd_version_uptodate') }}</span>
                <span v-if="updateAvailable" class="badge-warning">{{ t('nd_version_avail', { v: latestVersion }) }}</span>
              </span>
            </div>
            <div class="info-row">
              <span class="info-lbl">{{ t('nd_agent_heartbeat_label') }}<InfoTip :text="t('nd_agent_info_hb')" /></span>
              <span class="info-val accent">{{ lastSeenAgo }}</span>
            </div>
            <div class="info-row">
              <span class="info-lbl">{{ t('nd_agent_interval_label') }}<InfoTip :text="t('nd_agent_info_int')" /></span>
              <span class="info-val">10s</span>
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
            <button class="action-btn" @click="showLogsModal = true">
              <UIcon name="i-lucide-file-text" style="width:13px;height:13px" />
              {{ t('nd_action_view_logs') }}
            </button>
            <button class="action-btn" @click="generateEnrollToken">
              <UIcon name="i-lucide-arrow-right-left" style="width:13px;height:13px" />
              {{ t('nd_action_enroll') }}
            </button>
            <button v-if="transferTargets.length > 1" class="action-btn" @click="openTransfer">
              <UIcon name="i-lucide-users" style="width:13px;height:13px" />
              {{ t('nd_action_transfer') }}
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

    <!-- Migrate node modal -->
    <div v-if="showEnrollModal" class="modal-overlay" @click.self="closeEnrollModal">
      <div class="modal enroll-modal">
        <div class="modal-header">
          <div>
            <div class="modal-title">{{ t('nd_enroll_title') }}</div>
            <div class="modal-sub">{{ node.name }}</div>
          </div>
          <button class="close-btn" @click="closeEnrollModal"><UIcon name="i-lucide-x" style="width:12px;height:12px" /></button>
        </div>
        <div class="modal-body">
          <div class="enroll-desc">{{ t('nd_enroll_desc') }}</div>

          <div v-if="enrollLoading" class="enroll-loading">{{ t('onb_cmd_generating') }}</div>

          <template v-else-if="enrollToken">
            <!-- Expired banner -->
            <div v-if="enrollExpired" class="token-expired-banner">
              <div class="token-expired-icon"><UIcon name="i-lucide-clock-alert" style="width:14px;height:14px" /></div>
              <div class="token-expired-body">
                <div class="token-expired-title">{{ t('addnode_expired_title') }}</div>
                <div class="token-expired-desc">{{ t('addnode_expired_desc') }}</div>
              </div>
              <button class="btn-regen" :disabled="enrollRegenerating" @click="regenerateEnrollToken">
                <UIcon :name="enrollRegenerating ? 'i-lucide-loader-circle' : 'i-lucide-rotate-ccw'" :class="{ spin: enrollRegenerating }" style="width:10px;height:10px" />
                {{ enrollRegenerating ? t('addnode_regen_loading') : t('addnode_regen') }}
              </button>
            </div>

            <template v-else>
              <!-- Step 1 -->
              <div class="migrate-step">
                <label class="form-label">{{ t('nd_enroll_step1') }}</label>
                <div class="cmd-block">
                  <button class="cmd-copy" @click="copyEnrollStop">
                    <template v-if="enrollCopiedStop"><UIcon name="i-lucide-check" style="width:10px;height:10px" /> {{ t('nd_enroll_copied') }}</template>
                    <template v-else>{{ t('onb_cmd_copy') }}</template>
                  </button>
                  <div class="cmd-scroll"><pre class="cmd-pre">sudo umbra-agent stop</pre></div>
                </div>
              </div>

              <!-- Step 2 — install command -->
              <div class="migrate-step">
                <label class="form-label">{{ t('nd_enroll_step2') }}</label>
                <div class="cmd-block">
                  <button class="cmd-copy" @click="copyEnrollCmd">
                    <template v-if="enrollCopiedCmd"><UIcon name="i-lucide-check" style="width:10px;height:10px" /> {{ t('nd_enroll_copied') }}</template>
                    <template v-else>{{ t('onb_cmd_copy') }}</template>
                  </button>
                  <div class="cmd-scroll">
<pre class="cmd-pre">curl -sSL <span class="cmd-muted">{{ enrollInstallCmd?.split('/install.sh')[0] }}</span>/install.sh | bash -s -- \
  --name=<span class="cmd-accent">{{ node.name }}</span> \
  --category=<span class="cmd-accent3">{{ node.category }}</span> \
  --token=<span class="cmd-accent2">{{ enrollToken }}</span></pre>
                  </div>
                </div>
              </div>

              <div class="migrate-warn">
                <UIcon name="i-lucide-clock" style="width:11px;height:11px;flex-shrink:0" />
                {{ t('nd_enroll_warn') }} · {{ enrollExpiresLabel }}
              </div>
            </template>
          </template>
        </div>
        <div class="modal-footer">
          <button class="btn-ghost-sm" @click="closeEnrollModal">{{ t('common_close') }}</button>
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
  <!-- Transfer ownership -->
  <div v-if="showTransfer" class="modal-overlay" @click.self="showTransfer = false">
    <div class="modal" style="max-width:440px">
      <div class="modal-header">
        <div>
          <div class="modal-title">{{ t('nd_transfer_title') }}</div>
          <div class="modal-sub">{{ t('nd_transfer_sub') }}</div>
        </div>
        <button class="close-btn" @click="showTransfer = false"><UIcon name="i-lucide-x" style="width:12px;height:12px" /></button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">{{ t('addnode_owner') }}</label>
          <select v-model="transferTarget" class="form-input">
            <option v-for="o in transferTargets" :key="o.id ?? 'personal'" :value="o.id">{{ o.name }}</option>
          </select>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-ghost" @click="showTransfer = false">{{ t('common_cancel') }}</button>
        <button class="btn-accent-sm" :disabled="transferring" @click="doTransfer">{{ t('nd_transfer_confirm') }}</button>
      </div>
    </div>
  </div>
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

.enroll-modal { max-width: 540px; }
.enroll-desc  { font-size: 12px; color: var(--muted); line-height: 1.6; }
.enroll-loading { text-align: center; padding: 24px; color: var(--muted); font-size: 12px; }

.migrate-step { margin-bottom: 14px; }
.migrate-step .cmd-block { margin-top: 6px; }
.migrate-raw {
  margin-bottom: 14px; font-size: 11px; color: var(--muted);
}
.migrate-raw summary { cursor: pointer; user-select: none; }
.migrate-warn {
  display: flex; align-items: center; gap: 6px;
  font-size: 10px; color: var(--muted);
  padding: 6px 10px; border-radius: var(--r);
  background: var(--surface2); margin-top: 4px;
}

</style>
