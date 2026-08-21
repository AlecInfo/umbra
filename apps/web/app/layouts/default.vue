<script setup lang="ts">
import { useNodesStore } from '~/stores/nodes'
import { useAuthStore } from '~/stores/auth'

const store = useNodesStore()
const auth  = useAuthStore()
const route  = useRoute()
const colorMode = useColorMode()
const toast = useToast()
const { t } = useT()

const showConnectModal = computed(() => store.connectCommands !== null)

async function handleDisconnect() {
  const cmd = await store.disconnect()
  toast.add({
    title: t('conn_disconnect_toast_title'),
    description: cmd,
    color: 'neutral',
    duration: 8000,
    icon: 'i-lucide-unplug',
  })
}

const displayName = computed(() => auth.user?.name?.trim() || auth.user?.email?.split('@')[0] || t('side_account_label'))
const avatarInitial = computed(() => displayName.value.charAt(0).toUpperCase())

function onVisibility() {
  if (document.visibilityState === 'visible') store.fetchNodes()
}

onMounted(() => {
  if (auth.isAuthenticated && !auth.user) auth.fetchMe()
  store.startPolling(8000)
  document.addEventListener('visibilitychange', onVisibility)
})

onUnmounted(() => {
  store.stopPolling()
  document.removeEventListener('visibilitychange', onVisibility)
})

const navGroups = computed(() => [
  {
    section: t('side_nav'),
    links: [
      { to: '/',            label: t('side_dashboard'),   icon: 'i-lucide-layout-dashboard' },
      { to: '/nodes',       label: t('side_nodes'),       icon: 'i-lucide-server',      badge: true },
      { to: '/connections', label: t('side_connections'), icon: 'i-lucide-network' },
    ],
  },
  {
    section: t('side_account'),
    links: [
      { to: '/alerts',   label: t('side_alerts'),   icon: 'i-lucide-triangle-alert', badge: true },
      { to: '/api-keys', label: t('side_api_keys'), icon: 'i-lucide-terminal' },
      { to: '/settings', label: t('side_settings'), icon: 'i-lucide-settings' },
    ],
  },
])

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
              <span v-if="link.badge && store.warningCount > 0" class="nav-badge">{{ store.warningCount }}</span>
            </NuxtLink>
          </template>
        </nav>

        <div class="sidebar-bottom">
          <div class="user-pill" @click="toggleTheme">
            <div class="user-avatar">
              <span style="color:#0a0a0b;font-weight:600;font-size:11px">{{ avatarInitial }}</span>
            </div>
            <div style="flex:1;min-width:0">
              <div class="user-name">{{ displayName }}</div>
              <div class="user-plan">{{ colorMode.value === 'dark' ? 'Dark' : 'Light' }}</div>
            </div>
            <button
              :title="t('side_logout')"
              style="background:transparent;border:none;padding:4px 6px;border-radius:4px;cursor:pointer;color:var(--muted);display:flex;align-items:center"
              @click.stop="logout"
              @mouseover="($event.currentTarget as HTMLElement).style.color='var(--text)'"
              @mouseleave="($event.currentTarget as HTMLElement).style.color='var(--muted)'"
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
        @cut="handleDisconnect()"
      />

      <!-- Connect modal — shown after clicking Connect on any node -->
      <ConnectModal
        :open="showConnectModal"
        :node-name="store.connectCommands?.nodeName ?? ''"
        :connect-command="store.connectCommands?.connectCommand ?? null"
        :switch-command="store.connectCommands?.switchCommand ?? null"
        @close="store.connectCommands = null"
      />

    </div>
</template>
