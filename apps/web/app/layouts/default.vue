<script setup lang="ts">
import { useNodesStore } from '~/stores/nodes'
import { useAuthStore } from '~/stores/auth'

const store = useNodesStore()
const auth  = useAuthStore()
const route  = useRoute()
const colorMode = useColorMode()
const { t } = useT()

onMounted(() => {
  if (auth.isAuthenticated && !auth.user) auth.fetchMe()
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
              <UIcon name="i-lucide-user" style="width:13px;height:13px;color:#0a0a0b" />
            </div>
            <div style="flex:1;min-width:0">
              <div class="user-name">{{ t('side_account_label') }}</div>
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

      <!-- VPN bar — fixed, ne déplace plus le contenu -->
      <VpnBar
        v-if="store.connectedNode"
        :node="store.connectedNode"
        upload="1.2 MB/s"
        download="4.8 MB/s"
        @cut="store.disconnect()"
      />

    </div>
</template>
