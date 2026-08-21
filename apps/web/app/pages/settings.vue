<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import { useNodesStore } from '~/stores/nodes'
import { useNotifications } from '~/composables/useNotifications'

definePageMeta({ layout: 'default' })

const auth      = useAuthStore()
const nodesStore = useNodesStore()
const colorMode = useColorMode()
const { lang, setLang, t } = useT()
const { notify } = useNotifications()

const autoUpdate = ref(true)
const heartbeat  = ref('30s')

const themes = computed(() => [
  { value: 'dark',  label: t('settings_theme_dark') },
  { value: 'light', label: t('settings_theme_light') },
])
const langs = [{ value: 'fr', label: 'Français' }, { value: 'en', label: 'English' }]
const heartbeats = computed(() => [
  { value: '15s',  label: '15s' },
  { value: '30s',  label: '30s' },
  { value: '60s',  label: t('settings_hb_1min') },
  { value: '300s', label: t('settings_hb_5min') },
])

const notifications = ref([
  { key: 'crit',    enabled: true  },
  { key: 'warn',    enabled: true  },
  { key: 'offline', enabled: true  },
  { key: 'weekly',  enabled: false },
  { key: 'update',  enabled: false },
])
const notifLabel = (k: string) => t(`settings_notif_${k}_label`)
const notifSub   = (k: string) => t(`settings_notif_${k}_sub`)
const pluralCount = (key: string, n: number) => t(n > 1 ? `${key}_many` : `${key}_one`, { n })

// Edit name modal (API supports name only — not email change)
const showEditName = ref(false)
const newName      = ref('')
const savingName   = ref(false)
const nameError    = ref<string | null>(null)
function openEditName() {
  newName.value = auth.user?.name ?? ''
  nameError.value = null
  showEditName.value = true
}
async function saveName() {
  if (!newName.value.trim() || savingName.value) return
  savingName.value = true
  nameError.value = null
  try {
    const api = useApi()
    const { user } = await api<{ user: typeof auth.user }>('/auth/me', {
      method: 'PATCH',
      body: { name: newName.value.trim() },
    })
    auth.user = user
    showEditName.value = false
    notify({ title: t('notif_name_updated'), description: user?.name ?? undefined, type: 'success' })
  } catch (e: any) {
    nameError.value = e?.data?.message || t('modal_edit_name_err')
  } finally {
    savingName.value = false
  }
}

// Change password modal (real API)
const showEditPwd  = ref(false)
const oldPwd       = ref('')
const newPwd       = ref('')
const confirmPwd   = ref('')
const savingPwd    = ref(false)
const pwdError     = ref<string | null>(null)
const pwdMatch     = computed(() => newPwd.value && newPwd.value === confirmPwd.value)
async function savePassword() {
  if (!oldPwd.value || !pwdMatch.value || savingPwd.value) return
  savingPwd.value = true
  pwdError.value = null
  try {
    const api = useApi()
    await api('/auth/change-password', {
      method: 'POST',
      body: { currentPassword: oldPwd.value, newPassword: newPwd.value },
    })
    showEditPwd.value = false
    oldPwd.value = ''; newPwd.value = ''; confirmPwd.value = ''
    notify({ title: t('notif_pwd_updated'), description: t('notif_pwd_updated_desc'), type: 'success' })
  } catch (e: any) {
    pwdError.value = e?.data?.message || t('modal_edit_pwd_err')
  } finally {
    savingPwd.value = false
  }
}

// Upgrade modal
const showUpgrade = ref(false)

// Sessions (real API)
interface ApiSession {
  id: string
  name: string
  createdAt: string | null
  lastUsedAt: string | null
  expiresAt: string | null
  isCurrent: boolean
}
const showSessions     = ref(false)
const sessionsList     = ref<ApiSession[]>([])
const sessionsLoading  = ref(false)
const sessionsError    = ref<string | null>(null)

async function loadSessions() {
  sessionsLoading.value = true
  sessionsError.value = null
  try {
    const api = useApi()
    const { tokens } = await api<{ tokens: ApiSession[] }>('/auth/sessions')
    sessionsList.value = tokens
  } catch (e: any) {
    sessionsError.value = e?.data?.message || t('sessions_load_err')
  } finally {
    sessionsLoading.value = false
  }
}
async function openSessions() {
  showSessions.value = true
  await loadSessions()
}
async function revokeSession(id: string) {
  const target = sessionsList.value.find(s => s.id === id)
  const label = target ? parseSessionLabel(target.name) : t('common_label_session')
  try {
    const api = useApi()
    await api(`/auth/sessions/${id}`, { method: 'DELETE' })
    sessionsList.value = sessionsList.value.filter(s => s.id !== id)
    notify({ title: t('notif_session_revoked'), description: label, type: 'success' })
  } catch (e: any) {
    notify({ title: t('notif_session_revoke_err'), description: e?.data?.message || label, type: 'error' })
  }
}
async function revokeOtherSessions() {
  const others = sessionsList.value.filter(s => !s.isCurrent)
  if (!others.length) return
  for (const s of others) {
    try {
      const api = useApi()
      await api(`/auth/sessions/${s.id}`, { method: 'DELETE' })
    } catch { /* ignore individual errors */ }
  }
  sessionsList.value = sessionsList.value.filter(s => s.isCurrent)
  notify({
    title: pluralCount('notif_sessions_revoked', others.length),
    description: t('notif_sessions_revoked_desc'),
    type: 'success',
  })
}

function relativeTime(iso: string | null): string {
  if (!iso) return t('common_dash')
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60_000) return t('common_just_now')
  if (diff < 3_600_000) return t('common_min_ago', { n: Math.floor(diff / 60_000) })
  if (diff < 86_400_000) return t('common_hour_ago', { n: Math.floor(diff / 3_600_000) })
  return t('common_day_ago', { n: Math.floor(diff / 86_400_000) })
}

function parseSessionLabel(ua: string): string {
  if (!ua || ua === 'login' || ua === 'register') return ua === 'register' ? t('common_label_register') : t('common_label_session')
  if (/^curl\//i.test(ua)) return ua.split(' ')[0] || 'curl'
  if (/Postman/i.test(ua)) return 'Postman'
  if (/Insomnia/i.test(ua)) return 'Insomnia'
  let browser: string | null = null
  if (/Firefox\//.test(ua)) browser = 'Firefox'
  else if (/Edg\//.test(ua)) browser = 'Edge'
  else if (/OPR\//.test(ua)) browser = 'Opera'
  else if (/Chrome\//.test(ua)) browser = 'Chrome'
  else if (/Safari\//.test(ua)) browser = 'Safari'
  let os: string | null = null
  if (/Windows NT/.test(ua)) os = 'Windows'
  else if (/Mac OS X/.test(ua)) os = 'macOS'
  else if (/Android/.test(ua)) os = 'Android'
  else if (/iPhone|iPad/.test(ua)) os = 'iOS'
  else if (/Linux/.test(ua)) os = 'Linux'
  if (browser && os) return `${browser} ${t('sessions_on')} ${os}`
  if (browser) return browser
  if (os) return os
  return ua.length > 40 ? ua.slice(0, 40) + '…' : ua
}

// Login logs
interface LoginLog {
  id:        string
  action:    'login' | 'logout'
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
}
const showLoginLogs     = ref(false)
const loginLogsList     = ref<LoginLog[]>([])
const loginLogsLoading  = ref(false)

async function openLoginLogs() {
  showLoginLogs.value = true
  loginLogsLoading.value = true
  try {
    const api = useApi()
    const { data } = await api<{ data: LoginLog[] }>('/auth/login-logs')
    loginLogsList.value = data
  } finally {
    loginLogsLoading.value = false
  }
}

// Danger confirms
const showDeleteNodes   = ref(false)
const showDeleteAccount = ref(false)
const deleteAccConfirm  = ref('')
const deletingNodes     = ref(false)

async function deleteAllNodes() {
  if (deletingNodes.value) return
  deletingNodes.value = true
  try {
    const api = useApi()
    const ids = nodesStore.nodes.map(n => n.id)
    await Promise.allSettled(ids.map(id => api(`/nodes/${id}`, { method: 'DELETE' })))
    await nodesStore.fetchNodes()
    showDeleteNodes.value = false
    notify({
      title: pluralCount('notif_nodes_deleted', ids.length),
      description: t('notif_nodes_deleted_desc'),
      type: 'success',
    })
  } catch (e: any) {
    notify({ title: t('notif_delete_failed'), description: e?.data?.message, type: 'error' })
  } finally {
    deletingNodes.value = false
  }
}

async function deleteAccount() {
  try {
    const api = useApi()
    await api('/auth/account', { method: 'DELETE' })
    auth.token = null
    auth.user  = null
    await navigateTo('/login')
  } catch (e: any) {
    notify({ title: t('notif_delete_failed'), description: e?.data?.message, type: 'error' })
  } finally {
    showDeleteAccount.value = false
    deleteAccConfirm.value  = ''
  }
}
/* ── Organisations ─────────────────────────────────────────────────────── */
import type { OrgRole, OrgMember } from '~/types/settings'

interface Org { id: string; name: string; slug: string; plan: string; role: OrgRole; memberCount: number }
interface PendingInvite { id: string; email: string; role: OrgRole; expiresAt: string }

const orgs        = ref<Org[]>([])
const activeOrgId = ref<string | null>(null)
const members     = ref<OrgMember[]>([])
const pending     = ref<PendingInvite[]>([])
const orgLoading  = ref(false)

const activeOrg = computed(() => orgs.value.find(o => o.id === activeOrgId.value) ?? null)
const canManage = computed(() => activeOrg.value?.role === 'owner' || activeOrg.value?.role === 'admin')

const assignableRoles = computed(() => [
  { value: 'admin'  as OrgRole, label: t('org_role_admin') },
  { value: 'member' as OrgRole, label: t('org_role_member') },
])

// Deterministic avatar colour so a member keeps the same one across reloads.
const AVATAR_COLORS = ['#4fffb0', '#7b6ef6', '#4fa8ff', '#ffb74f', '#ff4f6b']
function avatarFor(seed: string) {
  let h = 0
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}
function toMember(m: any): OrgMember {
  const label = m.name || m.email || '?'
  return {
    id:     m.userId,
    name:   label,
    email:  m.email ?? '',
    avatar: label[0].toUpperCase(),
    color:  avatarFor(m.userId),
    role:   m.role,
    status: 'active',
  }
}
function inviteAsMember(i: PendingInvite): OrgMember {
  return {
    id:     i.id,
    name:   i.email,
    email:  i.email,
    avatar: i.email[0].toUpperCase(),
    color:  'var(--surface2)',
    role:   i.role,
    status: 'pending',
  }
}
// Pending invitations sit under the real members, visibly waiting.
const memberRows = computed(() => [...members.value, ...pending.value.map(inviteAsMember)])

async function fetchOrgs() {
  orgLoading.value = true
  try {
    const api = useApi()
    const res = await api<{ data: Org[] }>('/orgs')
    orgs.value = res.data
    if (!activeOrgId.value || !res.data.some(o => o.id === activeOrgId.value)) {
      activeOrgId.value = res.data[0]?.id ?? null
    }
    if (activeOrgId.value) await fetchOrgDetail()
    else { members.value = []; pending.value = [] }
  } catch {
    orgs.value = []
  } finally {
    orgLoading.value = false
  }
}

async function fetchOrgDetail() {
  if (!activeOrgId.value) return
  const api = useApi()
  const detail = await api<{ members: any[] }>(`/orgs/${activeOrgId.value}`)
  members.value = detail.members.map(toMember)

  pending.value = []
  if (!canManage.value) return
  try {
    const inv = await api<{ data: PendingInvite[] }>(`/orgs/${activeOrgId.value}/invitations`)
    pending.value = inv.data
  } catch { /* a member simply has no business seeing these */ }
}

onMounted(fetchOrgs)

/* Create */
const showCreateOrg = ref(false)
const newOrgName    = ref('')
const creatingOrg   = ref(false)
async function createOrg() {
  if (!newOrgName.value.trim() || creatingOrg.value) return
  creatingOrg.value = true
  try {
    const api = useApi()
    const res = await api<{ org: Org }>('/orgs', { method: 'POST', body: { name: newOrgName.value.trim() } })
    activeOrgId.value = res.org.id
    showCreateOrg.value = false
    newOrgName.value = ''
    await fetchOrgs()
    notify({ title: t('notif_org_created'), type: 'success' })
  } catch (e: any) {
    notify({ title: t('notif_org_create_failed'), description: e?.data?.message, type: 'error' })
  } finally {
    creatingOrg.value = false
  }
}

/* Invite — mail is not wired up, so the token is shown once for the inviter to pass on */
const showInvite   = ref(false)
const inviteEmail  = ref('')
const inviteRole   = ref<OrgRole>('member')
const inviting     = ref(false)
const inviteToken  = ref<string | null>(null)
const inviteCopied = ref(false)
function openInvite() {
  inviteEmail.value = ''
  inviteRole.value  = 'member'
  inviteToken.value = null
  showInvite.value  = true
}
async function sendInvite() {
  if (!inviteEmail.value.trim() || inviting.value || !activeOrgId.value) return
  inviting.value = true
  try {
    const api = useApi()
    const res = await api<{ token: string }>(`/orgs/${activeOrgId.value}/invitations`, {
      method: 'POST',
      body: { email: inviteEmail.value.trim(), role: inviteRole.value },
    })
    inviteToken.value = res.token
    await fetchOrgDetail()
  } catch (e: any) {
    notify({ title: t('notif_invite_failed'), description: e?.data?.message, type: 'error' })
  } finally {
    inviting.value = false
  }
}
async function copyInvite() {
  if (!inviteToken.value) return
  await navigator.clipboard.writeText(inviteToken.value)
  inviteCopied.value = true
  setTimeout(() => (inviteCopied.value = false), 2000)
}

/* Join */
const joinToken  = ref('')
const joining    = ref(false)
async function joinOrg() {
  if (!joinToken.value.trim() || joining.value) return
  joining.value = true
  try {
    const api = useApi()
    await api('/orgs/invitations/accept', { method: 'POST', body: { token: joinToken.value.trim() } })
    joinToken.value = ''
    await fetchOrgs()
    notify({ title: t('notif_org_joined'), type: 'success' })
  } catch (e: any) {
    notify({ title: t('notif_org_join_failed'), description: e?.data?.message, type: 'error' })
  } finally {
    joining.value = false
  }
}

/* Members */
async function changeRole(member: OrgMember, role: OrgRole) {
  try {
    const api = useApi()
    await api(`/orgs/${activeOrgId.value}/members/${member.id}`, { method: 'PATCH', body: { role } })
    await fetchOrgDetail()
  } catch (e: any) {
    notify({ title: t('notif_role_failed'), description: e?.data?.message, type: 'error' })
  }
}

async function removeMember(member: OrgMember) {
  try {
    const api = useApi()
    if (member.status === 'pending') {
      await api(`/orgs/${activeOrgId.value}/invitations/${member.id}`, { method: 'DELETE' })
    } else {
      await api(`/orgs/${activeOrgId.value}/members/${member.id}`, { method: 'DELETE' })
    }
    await fetchOrgs()
  } catch (e: any) {
    notify({ title: t('notif_remove_failed'), description: e?.data?.message, type: 'error' })
  }
}
/* ── Instance (opérateur uniquement) ────────────────────────────────────── */
interface InstanceOverview {
  users: number; operators: number; organizations: number
  nodes: number; nodesOnline: number
  settings: { registrationMode: 'open' | 'invite_only' | 'closed' }
}
interface AdminUser {
  id: string; email: string; name: string | null
  isActive: boolean; instanceRole: 'user' | 'operator'
  mustChangePassword: boolean; nodeCount: number
}

const overview     = ref<InstanceOverview | null>(null)
const adminUsers   = ref<AdminUser[]>([])
const regMode      = ref<'open' | 'invite_only' | 'closed'>('open')

const regModes = computed(() => [
  { value: 'open',        label: t('inst_mode_open') },
  { value: 'invite_only', label: t('inst_mode_invite') },
  { value: 'closed',      label: t('inst_mode_closed') },
])

async function fetchInstance() {
  if (!auth.isOperator) return
  try {
    const api = useApi()
    const [ov, us] = await Promise.all([
      api<InstanceOverview>('/admin/overview'),
      api<{ data: AdminUser[] }>('/admin/users'),
    ])
    overview.value = ov
    regMode.value  = ov.settings.registrationMode
    adminUsers.value = us.data
  } catch { overview.value = null }
}
// Not onMounted: the layout kicks off fetchMe() without awaiting it, so the
// account — and therefore its instance role — lands after this page mounts.
// Fetching once on mount would silently give up before knowing who we are.
watch(() => auth.isOperator, (op) => { if (op) fetchInstance() }, { immediate: true })

async function saveRegMode(mode: string) {
  try {
    const api = useApi()
    await api('/admin/settings', { method: 'PATCH', body: { registrationMode: mode } })
    regMode.value = mode as typeof regMode.value
    notify({ title: t('notif_inst_saved'), type: 'success' })
  } catch (e: any) {
    notify({ title: t('notif_inst_failed'), description: e?.data?.message, type: 'error' })
    await fetchInstance()
  }
}

async function toggleUserActive(u: AdminUser) {
  try {
    const api = useApi()
    await api(`/admin/users/${u.id}`, { method: 'PATCH', body: { isActive: !u.isActive } })
    await fetchInstance()
  } catch (e: any) {
    notify({ title: t('notif_inst_failed'), description: e?.data?.message, type: 'error' })
  }
}

/* Provisionner un compte — le mot de passe temporaire n'est montré qu'ici */
const showCreateUser = ref(false)
const newUserEmail   = ref('')
const newUserName    = ref('')
const creatingUser   = ref(false)
const tempPassword   = ref<string | null>(null)
const tempCopied     = ref(false)

function openCreateUser() {
  newUserEmail.value = ''
  newUserName.value  = ''
  tempPassword.value = null
  showCreateUser.value = true
}
async function createUser() {
  if (!newUserEmail.value.trim() || creatingUser.value) return
  creatingUser.value = true
  try {
    const api = useApi()
    const res = await api<{ tempPassword: string }>('/admin/users', {
      method: 'POST',
      body: { email: newUserEmail.value.trim(), name: newUserName.value.trim() || undefined },
    })
    tempPassword.value = res.tempPassword
    await fetchInstance()
  } catch (e: any) {
    notify({ title: t('notif_inst_failed'), description: e?.data?.message, type: 'error' })
  } finally {
    creatingUser.value = false
  }
}
async function copyTemp() {
  if (!tempPassword.value) return
  await navigator.clipboard.writeText(tempPassword.value)
  tempCopied.value = true
  setTimeout(() => (tempCopied.value = false), 2000)
}
</script>

<template>
  <div class="settings-page">

    <div class="page-header">
      <div>
        <div class="page-title">{{ t('settings_title') }}</div>
        <div class="page-sub">{{ t('settings_sub') }}</div>
      </div>
    </div>

    <div class="settings-wrap">

      <nav class="settings-nav">
        <a href="#apparence">{{ t('settings_nav_appearance') }}</a>
        <a href="#compte">{{ t('settings_nav_account') }}</a>
        <a href="#notifications">{{ t('settings_nav_notifications') }}</a>
        <a href="#securite">{{ t('settings_nav_security') }}</a>
        <a href="#equipe">{{ t('settings_nav_team') }}</a>
        <a href="#agent">{{ t('settings_nav_agent') }}</a>
        <a v-if="auth.isOperator" href="#instance">{{ t('inst_nav') }}</a>
        <a href="#danger">{{ t('settings_nav_danger') }}</a>
      </nav>

      <div class="settings-content">

        <!-- Apparence -->
        <div id="apparence" class="card">
          <div class="card-header"><div class="card-title">{{ t('settings_appearance_title') }}</div></div>
          <div class="card-body">
            <SettingRow :label="t('settings_theme_label')" :sub="t('settings_theme_sub')">
              <div class="theme-group">
                <button
                  v-for="th in themes"
                  :key="th.value"
                  class="theme-btn"
                  :class="{ active: colorMode.value === th.value }"
                  @click="colorMode.preference = th.value"
                >
                  <div class="theme-preview" :class="`preview-${th.value}`" />
                  {{ th.label }}
                </button>
              </div>
            </SettingRow>
            <SettingRow :label="t('settings_lang_label')" :sub="t('settings_lang_sub')">
              <SegmentedControl :model-value="lang" :options="langs" @update:model-value="setLang($event as 'fr' | 'en')" />
            </SettingRow>
          </div>
        </div>

        <!-- Compte -->
        <div id="compte" class="card">
          <div class="card-header">
            <div class="card-title">{{ t('settings_account_title') }}</div>
            <span class="plan-badge">{{ t('settings_plan_free') }}</span>
          </div>
          <div class="card-body">
            <SettingRow :label="t('settings_account_name')" :sub="auth.user?.name || t('common_dash')">
              <button class="btn-ghost-sm" @click="openEditName">{{ t('common_edit') }}</button>
            </SettingRow>
            <SettingRow :label="t('settings_account_email')" :sub="auth.user?.email || t('common_dash')">
              <span style="font-size:10px;color:var(--muted)">{{ t('common_soon') }}</span>
            </SettingRow>
            <SettingRow :label="t('settings_account_password')" :sub="t('settings_account_password_sub')">
              <button class="btn-ghost-sm" @click="showEditPwd = true">{{ t('common_edit') }}</button>
            </SettingRow>
            <SettingRow :label="t('settings_account_plan')" :sub="t('settings_account_plan_sub')">
              <button class="btn-accent-sm" @click="showUpgrade = true">{{ t('settings_account_view_plans') }}</button>
            </SettingRow>
          </div>
        </div>

        <!-- Notifications -->
        <div id="notifications" class="card">
          <div class="card-header"><div class="card-title">{{ t('settings_notif_title') }}</div></div>
          <div class="card-body">
            <SettingRow
              v-for="notif in notifications"
              :key="notif.key"
              :label="notifLabel(notif.key)"
              :sub="notifSub(notif.key)"
            >
              <Toggle v-model="notif.enabled" />
            </SettingRow>
          </div>
        </div>

        <!-- Sécurité -->
        <div id="securite" class="card">
          <div class="card-header"><div class="card-title">{{ t('settings_security_title') }}</div></div>
          <div class="card-body">
            <SettingRow :label="t('settings_2fa_label')" :sub="t('settings_2fa_sub')">
              <span style="font-size:10px;color:var(--muted)">{{ t('common_soon') }}</span>
            </SettingRow>
            <SettingRow :label="t('settings_sessions_label')" :sub="t('settings_sessions_sub')">
              <button class="btn-ghost-sm" @click="openSessions">{{ t('common_manage') }}</button>
            </SettingRow>
            <SettingRow :label="t('settings_logs_label')" :sub="t('settings_logs_sub')">
              <button class="btn-ghost-sm" @click="openLoginLogs">{{ t('common_manage') }}</button>
            </SettingRow>
          </div>
        </div>

        <!-- Équipe -->
        <div id="equipe" class="card">
          <div class="card-header">
            <div class="card-title">{{ t('settings_team_title') }}</div>
            <select v-if="orgs.length > 1" v-model="activeOrgId" class="role-select" @change="fetchOrgDetail">
              <option v-for="o in orgs" :key="o.id" :value="o.id">{{ o.name }}</option>
            </select>
            <span v-else-if="activeOrg" style="font-size:10px;color:var(--muted)">{{ activeOrg.name }}</span>
          </div>

          <!-- No org yet: create one, or redeem an invitation -->
          <div v-if="!activeOrg" class="card-body">
            <SettingRow :label="t('settings_team_create_label')" :sub="t('settings_team_create_sub')">
              <button class="btn-accent-sm" @click="showCreateOrg = true">{{ t('settings_team_create') }}</button>
            </SettingRow>
            <SettingRow :label="t('settings_team_join_label')" :sub="t('settings_team_join_sub')">
              <div style="display:flex;gap:6px">
                <input v-model="joinToken" class="form-input" style="width:200px" :placeholder="t('settings_team_join_ph')" @keyup.enter="joinOrg" />
                <button class="btn-ghost" :disabled="joining" @click="joinOrg">{{ t('settings_team_join') }}</button>
              </div>
            </SettingRow>
          </div>

          <template v-else>
            <div class="org-members">
              <OrgMemberRow
                v-for="m in memberRows"
                :key="m.id"
                :member="m"
                :is-me="m.id === auth.user?.id"
                :can-manage="canManage"
                :roles="assignableRoles"
                @update:role="(r) => changeRole(m, r)"
                @remove="removeMember(m)"
              />
            </div>
            <div class="card-body">
              <SettingRow :label="t('settings_team_invite_label')" :sub="t('settings_team_invite_sub')">
                <button v-if="canManage" class="btn-accent-sm" @click="openInvite">{{ t('settings_team_invite') }}</button>
                <span v-else style="font-size:10px;color:var(--muted)">{{ t('settings_team_invite_admin_only') }}</span>
              </SettingRow>
              <SettingRow :label="t('settings_team_plan_label')" :sub="t('settings_team_plan_sub')">
                <span class="mono-val">{{ pluralCount('settings_team_members', activeOrg.memberCount) }}</span>
              </SettingRow>
            </div>
          </template>
        </div>

        <!-- Agent & réseau -->
        <div id="agent" class="card">
          <div class="card-header"><div class="card-title">{{ t('settings_agent_title') }}</div></div>
          <div class="card-body">
            <SettingRow :label="t('settings_heartbeat_label')" :sub="t('settings_heartbeat_sub')">
              <SegmentedControl v-model="heartbeat" :options="heartbeats" />
            </SettingRow>
            <SettingRow :label="t('settings_autoupdate_label')" :sub="t('settings_autoupdate_sub')">
              <Toggle v-model="autoUpdate" />
            </SettingRow>
            <SettingRow :label="t('settings_subnet_label')" :sub="t('settings_subnet_sub')">
              <span class="mono-val">100.64.0.0/10</span>
            </SettingRow>
          </div>
        </div>

        <!-- Instance — operator only -->
        <div v-if="auth.isOperator && overview" id="instance" class="card">
          <div class="card-header">
            <div class="card-title">{{ t('inst_title') }}</div>
            <span style="font-size:10px;color:var(--muted)">{{ t('inst_operator') }}</span>
          </div>
          <div class="card-body">
            <SettingRow :label="t('inst_stats_label')" :sub="t('inst_stats_sub')">
              <span class="mono-val">
                {{ overview.users }} · {{ overview.organizations }} · {{ overview.nodesOnline }}/{{ overview.nodes }}
              </span>
            </SettingRow>

            <SettingRow :label="t('inst_reg_label')" :sub="t('inst_reg_sub')">
              <select class="role-select" :value="regMode" @change="saveRegMode(($event.target as HTMLSelectElement).value)">
                <option v-for="m in regModes" :key="m.value" :value="m.value">{{ m.label }}</option>
              </select>
            </SettingRow>

            <SettingRow :label="t('inst_create_label')" :sub="t('inst_create_sub')">
              <button class="btn-accent-sm" @click="openCreateUser">{{ t('inst_create') }}</button>
            </SettingRow>
          </div>

          <div class="org-members">
            <div v-for="u in adminUsers" :key="u.id" class="org-member-row">
              <div class="member-avatar" :style="`background: ${avatarFor(u.id)}`">
                {{ (u.name || u.email)[0].toUpperCase() }}
              </div>
              <div class="member-info">
                <div class="member-name">
                  {{ u.name || u.email }}
                  <span v-if="u.instanceRole === 'operator'" class="owner-badge">{{ t('inst_operator') }}</span>
                  <span v-if="u.mustChangePassword" class="pending-chip">{{ t('inst_pending_pwd') }}</span>
                </div>
                <div class="member-email">{{ u.email }} · {{ pluralCount('inst_nodes', u.nodeCount) }}</div>
              </div>
              <div class="member-role">
                <span :class="u.isActive ? 'role-static' : 'perm-chip'">
                  {{ u.isActive ? t('inst_active') : t('inst_suspended') }}
                </span>
              </div>
              <button
                v-if="u.id !== auth.user?.id"
                class="remove-btn"
                :title="u.isActive ? t('inst_suspend') : t('inst_restore')"
                @click="toggleUserActive(u)"
              >
                <UIcon :name="u.isActive ? 'i-lucide-ban' : 'i-lucide-rotate-ccw'" style="width:11px;height:11px" />
              </button>
              <div v-else class="remove-placeholder" />
            </div>
          </div>
        </div>

        <!-- Zone de danger -->
        <div id="danger" class="card card-danger">
          <div class="card-header"><div class="card-title danger-title">{{ t('settings_danger_title') }}</div></div>
          <div class="card-body">
            <SettingRow :label="t('settings_danger_nodes_label')" :sub="t('settings_danger_nodes_sub')">
              <button class="btn-danger-sm" @click="showDeleteNodes = true">{{ t('common_delete') }}</button>
            </SettingRow>
            <SettingRow :label="t('settings_danger_account_label')" :sub="t('settings_danger_account_sub')">
              <button class="btn-danger-sm" @click="showDeleteAccount = true">{{ t('common_delete') }}</button>
            </SettingRow>
          </div>
        </div>

      </div>
    </div>

  </div>

  <!-- Edit name modal -->
  <div v-if="showEditName" class="modal-overlay" @click.self="showEditName = false">
    <div class="modal" style="max-width:400px">
      <div class="modal-header">
        <div class="modal-title">{{ t('modal_edit_name_title') }}</div>
        <button class="close-btn" @click="showEditName = false"><UIcon name="i-lucide-x" style="width:12px;height:12px" /></button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">{{ t('modal_edit_name_label') }}</label>
          <input v-model="newName" class="form-input" type="text" :placeholder="t('modal_edit_name_ph')" @keyup.enter="saveName" />
        </div>
        <div v-if="nameError" style="font-size:11px;color:var(--offline);margin-top:4px">{{ nameError }}</div>
      </div>
      <div class="modal-footer">
        <button class="btn-ghost-sm" @click="showEditName = false">{{ t('common_cancel') }}</button>
        <button class="btn-accent-sm" :disabled="!newName.trim() || savingName" @click="saveName">
          {{ savingName ? t('common_saving') : t('common_save') }}
        </button>
      </div>
    </div>
  </div>

  <!-- Edit password modal -->
  <div v-if="showEditPwd" class="modal-overlay" @click.self="showEditPwd = false">
    <div class="modal" style="max-width:400px">
      <div class="modal-header">
        <div class="modal-title">{{ t('modal_edit_pwd_title') }}</div>
        <button class="close-btn" @click="showEditPwd = false"><UIcon name="i-lucide-x" style="width:12px;height:12px" /></button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">{{ t('modal_edit_pwd_old') }}</label>
          <input v-model="oldPwd" class="form-input" type="password" placeholder="••••••••••" />
        </div>
        <div class="form-group">
          <label class="form-label">{{ t('modal_edit_pwd_new') }}</label>
          <input v-model="newPwd" class="form-input" type="password" placeholder="••••••••••" />
        </div>
        <div class="form-group">
          <label class="form-label">{{ t('modal_edit_pwd_confirm') }}</label>
          <input v-model="confirmPwd" class="form-input" type="password" placeholder="••••••••••" />
        </div>
        <div v-if="newPwd && confirmPwd && !pwdMatch" style="font-size:11px;color:var(--offline);margin-top:4px">{{ t('auth_password_mismatch') }}</div>
        <div v-if="pwdError" style="font-size:11px;color:var(--offline);margin-top:4px">{{ pwdError }}</div>
      </div>
      <div class="modal-footer">
        <button class="btn-ghost-sm" @click="showEditPwd = false">{{ t('common_cancel') }}</button>
        <button class="btn-accent-sm" :disabled="!oldPwd || !pwdMatch || savingPwd" @click="savePassword">
          {{ savingPwd ? t('common_saving') : t('common_save') }}
        </button>
      </div>
    </div>
  </div>

  <!-- Upgrade modal -->
  <div v-if="showUpgrade" class="modal-overlay" @click.self="showUpgrade = false">
    <div class="modal upgrade-modal">
      <div class="modal-header">
        <div>
          <div class="modal-title">{{ t('modal_upgrade_title') }}</div>
          <div class="modal-sub">{{ t('modal_upgrade_sub') }}</div>
        </div>
        <button class="close-btn" @click="showUpgrade = false"><UIcon name="i-lucide-x" style="width:12px;height:12px" /></button>
      </div>
      <div class="modal-body up-body">
        <div class="upgrade-plans">

          <!-- Free (current) -->
          <div class="upgrade-plan">
            <div class="up-top">
              <span class="up-label">{{ t('plan_current') }}</span>
              <div class="up-name">{{ t('plan_free_name') }}</div>
              <div class="up-price">{{ t('plan_free_price') }}</div>
              <div class="up-period">{{ t('plan_free_period') }}</div>
            </div>
            <ul class="up-features">
              <li>{{ t('plan_free_f1') }}</li>
              <li>{{ t('plan_free_f2') }}</li>
              <li>{{ t('plan_free_f3') }}</li>
              <li>{{ t('plan_free_f4') }}</li>
              <li>{{ t('plan_free_f5') }}</li>
              <li>{{ t('plan_free_f6') }}</li>
            </ul>
            <div class="up-cta">
              <span class="up-current-chip">{{ t('plan_current') }}</span>
            </div>
          </div>

          <!-- Pro -->
          <div class="upgrade-plan up-pro">
            <div class="up-top">
              <span class="up-label up-label-pro">{{ t('plan_pro_label') }}</span>
              <div class="up-name">{{ t('plan_pro_name') }}</div>
              <div class="up-price">{{ t('plan_pro_price') }}<span class="up-period-inline">{{ t('plan_pro_per') }}</span></div>
              <div class="up-period">{{ t('plan_pro_period') }}</div>
            </div>
            <ul class="up-features">
              <li>{{ t('plan_pro_f1') }}</li>
              <li>{{ t('plan_pro_f2') }}</li>
              <li>{{ t('plan_pro_f3') }}</li>
              <li>{{ t('plan_pro_f4') }}</li>
              <li>{{ t('plan_pro_f5') }}</li>
              <li>{{ t('plan_pro_f6') }}</li>
            </ul>
            <div class="up-cta">
              <button class="btn-accent-sm up-cta-btn" @click="showUpgrade = false">{{ t('plan_pro_cta') }}</button>
            </div>
          </div>

          <!-- Lifetime -->
          <div class="upgrade-plan up-lifetime-col">
            <div class="up-top">
              <span class="up-label up-label-lifetime">{{ t('plan_lifetime_label') }}</span>
              <div class="up-name">{{ t('plan_lifetime_name') }}</div>
              <div class="up-price up-price-lifetime">{{ t('plan_lifetime_price') }}</div>
              <div class="up-period">{{ t('plan_lifetime_period') }}</div>
            </div>
            <ul class="up-features">
              <li>{{ t('plan_pro_f1') }}</li>
              <li>{{ t('plan_pro_f2') }}</li>
              <li>{{ t('plan_pro_f3') }}</li>
              <li>{{ t('plan_pro_f4') }}</li>
              <li>{{ t('plan_pro_f5') }}</li>
              <li>{{ t('plan_pro_f6') }}</li>
            </ul>
            <div class="up-cta">
              <button class="up-cta-btn up-cta-lifetime" @click="showUpgrade = false">{{ t('plan_lifetime_cta') }}</button>
            </div>
          </div>

        </div>

        <!-- Business — full-width contact banner -->
        <div class="upgrade-lifetime">
          <div class="up-lifetime-left">
            <span class="up-label up-label-biz">{{ t('plan_biz_label') }}</span>
            <div class="up-name">{{ t('plan_biz_name') }}</div>
            <div class="up-lifetime-sub">{{ t('plan_biz_sub') }}</div>
          </div>
          <ul class="up-lifetime-feats">
            <li>{{ t('plan_biz_f1') }}</li>
            <li>{{ t('plan_biz_f2') }}</li>
            <li>{{ t('plan_biz_f3') }}</li>
            <li>{{ t('plan_biz_f4') }}</li>
            <li>{{ t('plan_biz_f5') }}</li>
          </ul>
          <div class="up-lifetime-right">
            <div class="up-price-contact" style="font-size:17px;margin-bottom:4px">{{ t('plan_biz_price') }}</div>
            <div class="up-lifetime-once">{{ t('plan_biz_period') }}</div>
            <button class="up-cta-btn up-cta-biz" @click="showUpgrade = false">{{ t('plan_biz_cta') }}</button>
          </div>
        </div>

      </div>
    </div>
  </div>

  <!-- Sessions modal -->
  <div v-if="showSessions" class="modal-overlay" @click.self="showSessions = false">
    <div class="modal">
      <div class="modal-header">
        <div>
          <div class="modal-title">{{ t('modal_sessions_title') }}</div>
          <div class="modal-sub">{{ pluralCount('sessions_count', sessionsList.length) }}</div>
        </div>
        <button class="close-btn" @click="showSessions = false"><UIcon name="i-lucide-x" style="width:12px;height:12px" /></button>
      </div>
      <div class="modal-body">
        <div v-if="sessionsLoading" style="font-size:12px;color:var(--muted);text-align:center;padding:18px">{{ t('common_loading') }}</div>
        <div v-else-if="sessionsError" style="font-size:12px;color:var(--offline);text-align:center;padding:12px">{{ sessionsError }}</div>
        <template v-else>
          <div v-for="s in sessionsList" :key="s.id" class="session-row">
            <div class="session-icon">
              <UIcon name="i-lucide-monitor" style="width:13px;height:13px" />
            </div>
            <div class="session-info">
              <div class="session-device">{{ parseSessionLabel(s.name) }} <span v-if="s.isCurrent" class="badge-accent" style="font-size:9px">{{ t('sessions_current_badge') }}</span></div>
              <div class="session-meta">{{ t('sessions_created', { time: relativeTime(s.createdAt) }) }}</div>
              <div class="session-meta" style="color:var(--muted)">{{ t('sessions_last_used', { time: relativeTime(s.lastUsedAt) }) }}</div>
            </div>
            <button v-if="!s.isCurrent" class="btn-danger-sm" @click="revokeSession(s.id)">{{ t('sessions_revoke') }}</button>
          </div>
          <div v-if="sessionsList.length === 0" style="font-size:12px;color:var(--muted);text-align:center;padding:12px">{{ t('sessions_empty') }}</div>
        </template>
      </div>
      <div class="modal-footer">
        <button class="btn-ghost-sm" @click="showSessions = false">{{ t('common_close') }}</button>
        <button class="btn-danger-sm" :disabled="sessionsLoading || !sessionsList.some(s => !s.isCurrent)" @click="revokeOtherSessions">{{ t('sessions_revoke_others') }}</button>
      </div>
    </div>
  </div>

  <!-- Login logs modal -->
  <div v-if="showLoginLogs" class="modal-overlay" @click.self="showLoginLogs = false">
    <div class="modal">
      <div class="modal-header">
        <div class="modal-title">{{ t('modal_login_logs_title') }}</div>
        <button class="close-btn" @click="showLoginLogs = false"><UIcon name="i-lucide-x" style="width:12px;height:12px" /></button>
      </div>
      <div class="modal-body">
        <div v-if="loginLogsLoading" style="font-size:12px;color:var(--muted);text-align:center;padding:18px">{{ t('common_loading') }}</div>
        <template v-else>
          <div v-for="log in loginLogsList" :key="log.id" class="log-row">
            <div class="log-icon">
              <UIcon v-if="log.action === 'login'" name="i-lucide-log-in" style="width:13px;height:13px;color:var(--accent)" />
              <UIcon v-else name="i-lucide-log-out" style="width:13px;height:13px;color:var(--muted)" />
            </div>
            <div class="log-info">
              <div class="log-device">{{ log.action === 'login' ? t('login_log_action_login') : t('login_log_action_logout') }}</div>
              <div class="log-meta">{{ log.userAgent ? parseSessionLabel(log.userAgent) : t('common_dash') }}</div>
              <div class="log-meta">{{ log.ipAddress ?? t('common_dash') }}</div>
            </div>
            <div class="log-time">{{ relativeTime(log.createdAt) }}</div>
          </div>
          <div v-if="loginLogsList.length === 0" style="font-size:12px;color:var(--muted);text-align:center;padding:12px">{{ t('login_logs_empty') }}</div>
        </template>
      </div>
      <div class="modal-footer">
        <button class="btn-ghost-sm" @click="showLoginLogs = false">{{ t('common_close') }}</button>
      </div>
    </div>
  </div>

  <!-- Delete all nodes confirm -->
  <div v-if="showDeleteNodes" class="modal-overlay" @click.self="showDeleteNodes = false">
    <div class="modal" style="max-width:420px">
      <div class="modal-header">
        <div class="modal-title">{{ t('modal_delete_nodes_title') }}</div>
        <button class="close-btn" @click="showDeleteNodes = false"><UIcon name="i-lucide-x" style="width:12px;height:12px" /></button>
      </div>
      <div class="modal-body">
        <div class="confirm-warn-box">
          <UIcon name="i-lucide-triangle-alert" style="width:14px;height:14px;flex-shrink:0" />
          {{ t('modal_delete_nodes_warn') }}
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-ghost-sm" @click="showDeleteNodes = false">{{ t('common_cancel') }}</button>
        <button class="btn-danger-sm" :disabled="deletingNodes || nodesStore.nodes.length === 0" @click="deleteAllNodes">
          {{ deletingNodes ? t('modal_delete_nodes_progress') : pluralCount('modal_delete_nodes_btn', nodesStore.nodes.length) }}
        </button>
      </div>
    </div>
  </div>

  <!-- Delete account confirm -->
  <div v-if="showDeleteAccount" class="modal-overlay" @click.self="showDeleteAccount = false">
    <div class="modal" style="max-width:420px">
      <div class="modal-header">
        <div class="modal-title">{{ t('modal_delete_account_title') }}</div>
        <button class="close-btn" @click="showDeleteAccount = false"><UIcon name="i-lucide-x" style="width:12px;height:12px" /></button>
      </div>
      <div class="modal-body">
        <div class="confirm-warn-box">
          <UIcon name="i-lucide-triangle-alert" style="width:14px;height:14px;flex-shrink:0" />
          {{ t('modal_delete_account_warn') }}
        </div>
        <div class="form-group" style="margin-top:14px">
          <label class="form-label">{{ t('modal_delete_account_label_pre') }} <strong>{{ t('modal_delete_account_word') }}</strong> {{ t('modal_delete_account_label_post') }}</label>
          <input v-model="deleteAccConfirm" class="form-input" :placeholder="t('modal_delete_account_word')" />
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-ghost-sm" @click="showDeleteAccount = false">{{ t('common_cancel') }}</button>
        <button class="btn-danger-sm" :disabled="deleteAccConfirm !== t('modal_delete_account_word')" @click="deleteAccount">{{ t('modal_delete_account_btn') }}</button>
      </div>
    </div>
  </div>

  <!-- Create organisation -->
  <div v-if="showCreateOrg" class="modal-overlay" @click.self="showCreateOrg = false">
    <div class="modal" style="max-width:420px">
      <div class="modal-header">
        <div class="modal-title">{{ t('modal_create_org_title') }}</div>
        <button class="close-btn" @click="showCreateOrg = false"><UIcon name="i-lucide-x" style="width:12px;height:12px" /></button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">{{ t('modal_create_org_name') }}</label>
          <input v-model="newOrgName" class="form-input" type="text" :placeholder="t('modal_create_org_ph')" autofocus @keyup.enter="createOrg" />
        </div>
        <div class="modal-sub">{{ t('modal_create_org_hint') }}</div>
      </div>
      <div class="modal-footer">
        <button class="btn-ghost" @click="showCreateOrg = false">{{ t('common_cancel') }}</button>
        <button class="btn-accent-sm" :disabled="creatingOrg || !newOrgName.trim()" @click="createOrg">{{ t('common_create') }}</button>
      </div>
    </div>
  </div>

  <!-- Invite a member -->
  <div v-if="showInvite" class="modal-overlay" @click.self="showInvite = false">
    <div class="modal" style="max-width:460px">
      <div class="modal-header">
        <div class="modal-title">{{ t('modal_invite_title') }}</div>
        <button class="close-btn" @click="showInvite = false"><UIcon name="i-lucide-x" style="width:12px;height:12px" /></button>
      </div>

      <!-- The token is shown once: there is no mail delivery yet -->
      <div v-if="inviteToken" class="modal-body">
        <div class="modal-sub">{{ t('modal_invite_token_hint', { email: inviteEmail }) }}</div>
        <div class="cmd-block" style="margin-top:10px">
          <button class="cmd-copy" @click="copyInvite">
            <template v-if="inviteCopied"><UIcon name="i-lucide-check" style="width:10px;height:10px" /> {{ t('onb_cmd_copied') }}</template>
            <template v-else>{{ t('onb_cmd_copy') }}</template>
          </button>
          <div class="cmd-scroll"><pre class="cmd-pre"><span class="cmd-accent">{{ inviteToken }}</span></pre></div>
        </div>
      </div>

      <div v-else class="modal-body">
        <div class="form-group">
          <label class="form-label">{{ t('modal_invite_email') }}</label>
          <input v-model="inviteEmail" class="form-input" type="email" placeholder="collegue@exemple.com" autofocus @keyup.enter="sendInvite" />
        </div>
        <div class="form-group">
          <label class="form-label">{{ t('modal_invite_role') }}</label>
          <select v-model="inviteRole" class="form-input">
            <option v-for="r in assignableRoles" :key="r.value" :value="r.value">{{ r.label }}</option>
          </select>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn-ghost" @click="showInvite = false">{{ inviteToken ? t('common_close') : t('common_cancel') }}</button>
        <button v-if="!inviteToken" class="btn-accent-sm" :disabled="inviting || !inviteEmail.trim()" @click="sendInvite">{{ t('modal_invite_send') }}</button>
      </div>
    </div>
  </div>
  <!-- Provision an account -->
  <div v-if="showCreateUser" class="modal-overlay" @click.self="showCreateUser = false">
    <div class="modal" style="max-width:440px">
      <div class="modal-header">
        <div>
          <div class="modal-title">{{ t('inst_create_title') }}</div>
          <div class="modal-sub">{{ t('inst_create_hint') }}</div>
        </div>
        <button class="close-btn" @click="showCreateUser = false"><UIcon name="i-lucide-x" style="width:12px;height:12px" /></button>
      </div>

      <!-- Shown once. There is no way to read it back afterwards. -->
      <div v-if="tempPassword" class="modal-body">
        <div class="modal-sub">{{ t('inst_temp_hint', { email: newUserEmail }) }}</div>
        <div class="cmd-block" style="margin-top:10px">
          <button class="cmd-copy" @click="copyTemp">
            <template v-if="tempCopied"><UIcon name="i-lucide-check" style="width:10px;height:10px" /> {{ t('onb_cmd_copied') }}</template>
            <template v-else>{{ t('onb_cmd_copy') }}</template>
          </button>
          <div class="cmd-scroll"><pre class="cmd-pre"><span class="cmd-accent">{{ tempPassword }}</span></pre></div>
        </div>
      </div>

      <div v-else class="modal-body">
        <div class="form-group">
          <label class="form-label">{{ t('modal_invite_email') }}</label>
          <input v-model="newUserEmail" class="form-input" type="email" placeholder="collegue@exemple.com" autofocus @keyup.enter="createUser" />
        </div>
        <div class="form-group">
          <label class="form-label">{{ t('inst_create_name') }}</label>
          <input v-model="newUserName" class="form-input" type="text" :placeholder="t('inst_create_name_ph')" @keyup.enter="createUser" />
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn-ghost" @click="showCreateUser = false">{{ tempPassword ? t('common_close') : t('common_cancel') }}</button>
        <button v-if="!tempPassword" class="btn-accent-sm" :disabled="creatingUser || !newUserEmail.trim()" @click="createUser">{{ t('common_create') }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-page { display: flex; flex-direction: column; }

/* ── 2FA modal ── */
.twofa-step { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 14px; }
.twofa-step-num {
  width: 18px; height: 18px; border-radius: 50%; background: var(--surface2); border: 1px solid var(--border2);
  font-size: 10px; font-weight: 700; color: var(--accent); display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.twofa-step-text { font-size: 11px; color: var(--muted); line-height: 1.5; padding-top: 1px; }
.twofa-qr { display: flex; align-items: center; gap: 16px; margin: 0 0 18px; padding: 14px; background: var(--surface2); border-radius: 8px; border: 1px solid var(--border); }
.twofa-secret { display: flex; flex-direction: column; gap: 4px; }
.twofa-input { text-align: center; letter-spacing: .25em; font-size: 18px; margin-top: 8px; }

/* ── Upgrade modal — 3 columns ── */
.upgrade-modal { width: 640px !important; max-width: 94vw !important; }
.up-body { padding-top: 16px !important; }

.upgrade-plans {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  align-items: stretch;
}

.upgrade-plan {
  background: var(--surface2);
  border: 1px solid var(--border2);
  border-radius: 10px;
  padding: 16px 14px 14px;
  display: flex;
  flex-direction: column;
  gap: 0;
}
.up-pro      { border-color: color-mix(in srgb, var(--accent)  35%, transparent); background: color-mix(in srgb, var(--accent)  4%, var(--surface2)); }
.up-business { border-color: color-mix(in srgb, var(--accent2) 30%, transparent); background: color-mix(in srgb, var(--accent2) 3%, var(--surface2)); }

/* Top section */
.up-top { margin-bottom: 14px; }
.up-label {
  display: inline-block;
  font-size: 9px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase;
  color: var(--muted); margin-bottom: 8px;
}
.up-label-pro  { color: var(--accent); }
.up-label-biz  { color: var(--accent2); }
.up-name {
  font-family: var(--font-disp); font-size: 17px; font-weight: 700;
  color: var(--text); margin-bottom: 6px;
}
.up-price {
  font-family: var(--font-disp); font-size: 20px; font-weight: 700;
  color: var(--accent); line-height: 1;
}
.up-pro      .up-price { color: var(--accent); }
.up-business .up-price { color: var(--accent2); }
.upgrade-plan:not(.up-pro):not(.up-business) .up-price { color: var(--muted); font-size: 16px; }
.up-period-inline { font-family: var(--font-mono); font-size: 10px; font-weight: 400; color: var(--muted); margin-left: 2px; }
.up-period { font-size: 10px; color: var(--muted); margin-top: 3px; }

/* Feature list */
.up-features {
  list-style: none; padding: 0; margin: 0;
  display: flex; flex-direction: column; gap: 6px;
  flex: 1;
}
.up-features li {
  font-size: 11px; color: var(--muted);
  padding-left: 14px; position: relative; line-height: 1.4;
}
.up-features li::before {
  content: '✓'; position: absolute; left: 0;
  font-size: 10px; color: var(--muted);
}
.up-pro      .up-features li::before { color: var(--accent); }
.up-business .up-features li::before { color: var(--accent2); }

/* CTA */
.up-cta { margin-top: 16px; }
.up-cta-btn {
  display: block; width: 100%; text-align: center;
  padding: 7px 10px; border-radius: var(--r);
  font-family: var(--font-mono); font-size: 10px; font-weight: 600;
  cursor: pointer; transition: filter .15s; border: none;
  background: var(--accent); color: var(--bg);
}
.up-cta-btn:hover { filter: brightness(1.08); }
.up-cta-biz {
  background: transparent;
  border: 1px solid color-mix(in srgb, var(--accent2) 40%, transparent);
  color: var(--accent2);
}
.up-cta-biz:hover { background: color-mix(in srgb, var(--accent2) 8%, transparent); filter: none; }
.up-current-chip {
  display: block; width: 100%; text-align: center;
  font-size: 10px; color: var(--muted); padding: 6px;
  border: 1px solid var(--border2); border-radius: var(--r);
}

/* Business — contact pricing */
.up-price-contact {
  font-family: var(--font-disp); font-size: 15px; font-weight: 600;
  color: var(--accent2); margin-top: 4px; margin-bottom: 3px;
}

/* Lifetime column */
.up-lifetime-col { border-color: color-mix(in srgb, #ffb74f 30%, transparent); background: color-mix(in srgb, #ffb74f 4%, var(--surface2)); }
.up-price-lifetime { color: #ffb74f !important; }
.up-lifetime-col .up-features li::before { color: #ffb74f; }
.up-cta-lifetime {
  background: #ffb74f; color: #1a1000; border: none;
}
.up-cta-lifetime:hover { filter: brightness(1.1); }

/* Business — full-width contact banner */
.upgrade-lifetime {
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: center;
  gap: 20px;
  margin-top: 10px;
  padding: 16px 18px;
  background: color-mix(in srgb, var(--accent2) 4%, var(--surface2));
  border: 1px solid color-mix(in srgb, var(--accent2) 30%, transparent);
  border-radius: 10px;
}
.up-label-lifetime { color: #ffb74f; }
.up-lifetime-left .up-name { margin-bottom: 4px; }
.up-lifetime-sub {
  font-size: 11px; color: var(--muted); line-height: 1.4; margin-top: 2px;
}
.up-lifetime-feats {
  list-style: none; padding: 0; margin: 0;
  display: flex; flex-direction: column; gap: 5px;
}
.up-lifetime-feats li {
  font-size: 10px; color: var(--muted);
  padding-left: 13px; position: relative;
}
.up-lifetime-feats li::before {
  content: '✓'; position: absolute; left: 0;
  font-size: 9px; color: var(--accent2);
}
.up-lifetime-right {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  min-width: 110px;
}
.up-lifetime-price {
  font-family: var(--font-disp); font-size: 22px; font-weight: 700;
  color: #ffb74f; line-height: 1;
}
.up-lifetime-once {
  font-size: 9px; color: var(--muted); letter-spacing: .04em;
  text-transform: uppercase; margin-bottom: 6px;
}
.up-cta-lifetime {
  background: #ffb74f; color: #1a1000;
  border: none;
}
.up-cta-lifetime:hover { filter: brightness(1.1); }

/* Sessions */
.session-row { display: flex; align-items: flex-start; gap: 10px; padding: 10px 0; border-bottom: 1px solid var(--border); }
.session-row:last-child { border-bottom: none; }
.session-icon { width: 28px; height: 28px; border-radius: 7px; background: var(--surface2); display: flex; align-items: center; justify-content: center; color: var(--muted); flex-shrink: 0; }
.session-info { flex: 1; min-width: 0; }
.session-device { font-size: 12px; color: var(--text); font-weight: 600; display: flex; align-items: center; gap: 6px; }
.session-meta { font-size: 10px; color: var(--muted); margin-top: 2px; }

/* Login logs */
.log-row { display: flex; align-items: flex-start; gap: 10px; padding: 9px 0; border-bottom: 1px solid var(--border); }
.log-row:last-child { border-bottom: none; }
.log-icon { flex-shrink: 0; margin-top: 1px; }
.log-info { flex: 1; min-width: 0; }
.log-device { font-size: 12px; color: var(--text); font-weight: 600; }
.log-meta { font-size: 10px; color: var(--muted); margin-top: 2px; }
.log-time { font-size: 10px; color: var(--muted); white-space: nowrap; flex-shrink: 0; }

/* Confirm warning */
.confirm-warn-box {
  display: flex; align-items: flex-start; gap: 10px;
  padding: 12px 14px; border-radius: var(--r);
  background: color-mix(in srgb, var(--warning) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--warning) 25%, transparent);
  color: var(--warning); font-size: 12px; line-height: 1.5;
}
</style>
