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
  apikeys:     `<circle cx="6" cy="9" r="3.5" stroke="currentColor" stroke-width="1.3"/><path d="M8.5 8.5L14 3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><path d="M12 5l1.5 1.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>`,
  settings:    `<circle cx="8" cy="8" r="2.5" stroke="currentColor" stroke-width="1.3"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>`,
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
