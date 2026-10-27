<script setup lang="ts">
import { useNodesStore } from '~/stores/nodes'
import { useAuthStore } from '~/stores/auth'

const store = useNodesStore()
const auth  = useAuthStore()
const route  = useRoute()
const colorMode = useColorMode()
const { t } = useT()

const showConnectModal = computed(() => store.connectCommands !== null)

const displayName = computed(() => auth.user?.name?.trim() || auth.user?.email?.split('@')[0] || t('side_account_label'))
const avatarInitial = computed(() => displayName.value.charAt(0).toUpperCase())

/*
| Escape closes the topmost dialog. The ~20 dialogs of the dashboard are
| hand-built overlays that close on a click on their own backdrop
| (@click.self); clicking that backdrop programmatically reuses each one's own
| close logic instead of teaching every page about the keyboard.
*/
function onKeydown(e: KeyboardEvent) {
  if (e.key !== 'Escape' || e.defaultPrevented) return
  const overlays = document.querySelectorAll<HTMLElement>('.modal-overlay')
  const top = overlays[overlays.length - 1]
  if (top) { e.preventDefault(); top.click() }
}

function onVisibility() {
  if (document.visibilityState === 'visible') { store.fetchNodes(); store.fetchSession() }
}

onMounted(() => {
  if (auth.isAuthenticated && !auth.user) auth.fetchMe()
  store.fetchSession()
  store.startPolling(8000)
  document.addEventListener('visibilitychange', onVisibility)
  document.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  store.stopPolling()
  document.removeEventListener('visibilitychange', onVisibility)
  document.removeEventListener('keydown', onKeydown)
})

const navGroups = computed(() => [
  {
    section: t('side_nav'),
    links: [
      { to: '/',            label: t('side_dashboard'),   icon: 'i-lucide-layout-dashboard' },
      { to: '/nodes',       label: t('side_nodes'),       icon: 'i-lucide-server',      badge: 'warning' as const },
      { to: '/connections', label: t('side_connections'), icon: 'i-lucide-network' },
    ],
  },
  {
    section: t('side_account'),
    links: [
      { to: '/alerts',   label: t('side_alerts'),   icon: 'i-lucide-triangle-alert', badge: 'alerts' as const },
      { to: '/api-keys', label: t('side_api_keys'), icon: 'i-lucide-terminal' },
      { to: '/settings', label: t('side_settings'), icon: 'i-lucide-settings' },
    ],
  },
])

function badgeCount(kind: 'warning' | 'alerts'): number {
  return kind === 'alerts' ? store.alertCount : store.warningCount
}

function isActive(to: string) {
  if (to === '/') return route.path === '/'
  return route.path.startsWith(to)
}

function toggleTheme() {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
}

async function logout() {
  await auth.logout()
  await navigateTo('/login')
}
</script>

<template>
  <div class="app-shell">

      <!-- Sidebar -->
      <aside class="sidebar">
        <div class="sidebar-logo">
          <NuxtLink to="/" style="text-decoration: none">
            <span class="logo-text">UMBRA<span class="logo-dot">.</span></span>
          </NuxtLink>
          <span class="logo-sub">{{ t('side_sub') }}</span>
        </div>

        <nav class="sidebar-nav">
          <template v-for="group in navGroups" :key="group.section">
            <div class="nav-section">{{ group.section }}</div>
            <NuxtLink
              v-for="link in group.links"
              :key="link.to"
              :to="link.to"
              class="nav-item"
              :class="{ active: isActive(link.to) }"
            >
              <UIcon :name="link.icon" style="width:14px;height:14px;flex-shrink:0" />
              <span>{{ link.label }}</span>
              <span v-if="link.badge && badgeCount(link.badge) > 0" class="nav-badge">{{ badgeCount(link.badge) }}</span>
            </NuxtLink>
          </template>
        </nav>

        <div class="sidebar-bottom">
          <!-- Holds the logout button, so it cannot be a <button> itself. -->
          <div
            class="user-pill"
            role="button"
            tabindex="0"
            :aria-label="t('side_toggle_theme')"
            @click="toggleTheme"
            @keydown.enter.self.prevent="toggleTheme"
            @keydown.space.self.prevent="toggleTheme"
          >
            <div class="user-avatar">
              <span style="color:#0a0a0b;font-weight:600;font-size:11px">{{ avatarInitial }}</span>
            </div>
            <div style="flex:1;min-width:0">
              <div class="user-name">{{ displayName }}</div>
              <div class="user-plan">{{ colorMode.value === 'dark' ? 'Dark' : 'Light' }}</div>
            </div>
            <button
              class="logout-btn"
              :title="t('side_logout')"
              :aria-label="t('side_logout')"
              @click.stop="logout"
            >
              <UIcon name="i-lucide-log-out" style="width:14px;height:14px" />
            </button>
          </div>
        </div>
      </aside>

      <!-- Content -->
      <main class="app-content">
        <slot />
      </main>

      <AppNotifications />
      <ForcePasswordModal />

      <!-- VPN bar — fixed, ne déplace plus le contenu -->
      <VpnBar
        v-if="store.connectedNode"
        :node="store.connectedNode"
        :upload="store.uploadSpeed"
        :download="store.downloadSpeed"
        @cut="store.disconnect()"
      />
      <VpnBar
        v-else-if="store.pendingNode"
        :node="store.pendingNode"
        pending
        @cut="store.disconnect()"
      />

      <!-- Connect modal — shown after clicking Connect on any node -->
      <ConnectModal
        :open="showConnectModal"
        :node-name="store.connectCommands?.nodeName ?? ''"
        :connect-command="store.connectCommands?.connectCommand ?? null"
        :switch-command="store.connectCommands?.switchCommand ?? null"
        :headscale-url="store.connectCommands?.headscaleUrl ?? null"
        :auth-key="store.connectCommands?.authKey ?? null"
        :exit-node-ip="store.connectCommands?.exitNodeIp ?? null"
        :session-state="store.session?.state ?? null"
        @close="store.connectCommands = null"
      />

    </div>
</template>
