<script setup lang="ts">
import { useNodesStore } from '~/stores/nodes'

const store = useNodesStore()
const route = useRoute()
const colorMode = useColorMode()

const alertCount = computed(() => store.warningCount)

const navGroups = [
  {
    section: 'Navigation',
    links: [
      { to: '/',            label: 'Dashboard',  icon: 'dashboard'    },
      { to: '/nodes',       label: 'Noeuds',     icon: 'nodes',       badge: true },
      { to: '/connections', label: 'Connexions', icon: 'connections'  },
    ],
  },
  {
    section: 'Compte',
    links: [
      { to: '/alerts',   label: 'Alertes',    icon: 'alerts',   badge: true },
      { to: '/api-keys', label: 'Clés API',   icon: 'apikeys'   },
      { to: '/settings', label: 'Paramètres', icon: 'settings'  },
    ],
  },
]

const navIcons: Record<string, string> = {
  dashboard:   `<rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.3"/><rect x="9" y="2" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.3"/><rect x="2" y="9" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.3"/><rect x="9" y="9" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.3"/>`,
  nodes:       `<rect x="1" y="3" width="14" height="4" rx="1.2" stroke="currentColor" stroke-width="1.3"/><rect x="1" y="9" width="14" height="4" rx="1.2" stroke="currentColor" stroke-width="1.3"/><circle cx="12.5" cy="5" r="1" fill="currentColor"/><circle cx="12.5" cy="11" r="1" fill="currentColor"/>`,
  connections: `<circle cx="5" cy="8" r="3" stroke="currentColor" stroke-width="1.3"/><circle cx="13" cy="4" r="2" stroke="currentColor" stroke-width="1.3"/><circle cx="13" cy="12" r="2" stroke="currentColor" stroke-width="1.3"/><path d="M8 7l3-2M8 9l3 2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>`,
  alerts:      `<path d="M8 2L14 13H2L8 2z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><line x1="8" y1="7" x2="8" y2="10" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><circle cx="8" cy="12" r=".7" fill="currentColor"/>`,
  apikeys:     `<rect x="2" y="3" width="12" height="10" rx="1.5" stroke="currentColor" stroke-width="1.3"/><path d="M5 7l2 2-2 2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/><line x1="9.5" y1="11" x2="12" y2="11" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>`,
  settings:    `<path d="M10.3 2.7l-1 1.7a3.5 3.5 0 0 0-2.6 0l-1-1.7A6 6 0 0 0 2.7 5.7l1.7 1a3.5 3.5 0 0 0 0 2.6l-1.7 1A6 6 0 0 0 5.7 13.3l1-1.7a3.5 3.5 0 0 0 2.6 0l1 1.7A6 6 0 0 0 13.3 10.3l-1.7-1a3.5 3.5 0 0 0 0-2.6l1.7-1A6 6 0 0 0 10.3 2.7z" stroke="currentColor" stroke-width="1.3" fill="none"/><circle cx="8" cy="8" r="1.8" stroke="currentColor" stroke-width="1.3" fill="none"/>`,
}

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
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" v-html="navIcons[link.icon]" />
              <span>{{ link.label }}</span>
              <span v-if="link.badge && alertCount > 0" class="nav-badge">{{ alertCount }}</span>
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

    </div>
</template>
