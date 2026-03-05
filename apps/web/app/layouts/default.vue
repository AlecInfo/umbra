<script setup lang="ts">
import { useNodesStore } from '~/stores/nodes'

const store = useNodesStore()
const route  = useRoute()
const colorMode = useColorMode()


const navGroups = [
  {
    section: 'Navigation',
    links: [
      { to: '/',            label: 'Dashboard',  icon: 'i-lucide-layout-dashboard' },
      { to: '/nodes',       label: 'Noeuds',     icon: 'i-lucide-server',      badge: true },
      { to: '/connections', label: 'Connexions', icon: 'i-lucide-network' },
    ],
  },
  {
    section: 'Compte',
    links: [
      { to: '/alerts',   label: 'Alertes',    icon: 'i-lucide-triangle-alert', badge: true },
      { to: '/api-keys', label: 'Clés API',   icon: 'i-lucide-terminal' },
      { to: '/settings', label: 'Paramètres', icon: 'i-lucide-settings' },
    ],
  },
]

function isActive(to: string) {
  if (to === '/') return route.path === '/'
  return route.path.startsWith(to)
}

function toggleTheme() {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
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
          <span class="logo-sub">VPN Manager</span>
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
            <div class="user-avatar">A</div>
            <div>
              <div class="user-name">alecptt</div>
              <div class="user-plan">{{ colorMode.value === 'dark' ? 'Dark' : 'Light' }}</div>
            </div>
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
