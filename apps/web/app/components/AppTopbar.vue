<template>
  <header class="topbar">

    <div class="topbar-left">
      <span class="page-title">{{ title }}</span>
    </div>

    <div class="topbar-right">
      <!-- Theme switcher -->
      <div class="theme-switcher">
        <button
            v-for="t in themes"
            :key="t.value"
            class="theme-btn"
            :class="{ 'theme-btn--active': theme === t.value }"
            @click="theme = t.value"
        >{{ t.label }}</button>
      </div>
    </div>

  </header>
</template>

<script setup lang="ts">
const route = useRoute()

const theme = useCookie('umbra-theme', { default: () => 'dark' })

const themes = [
  { value: 'dark', label: 'D' },
  { value: 'mid',  label: 'M' },
  { value: 'light', label: 'L' },
]

const titles: Record<string, string> = {
  '/':            'Dashboard',
  '/nodes':       'Noeuds',
  '/connections': 'Connexions',
  '/alerts':      'Alertes',
  '/api-keys':    'Clés API',
  '/settings':    'Paramètres',
  '/profile':     'Profil',
}

const title = computed(() => titles[route.path] ?? '')
</script>

<style scoped>
.topbar {
  height: var(--topbar-h);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--sp-6);
  flex-shrink: 0;
}

.page-title {
  font-family: var(--font-disp);
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
}

.theme-switcher {
  display: flex;
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: var(--r);
  padding: 2px;
  gap: 2px;
}

.theme-btn {
  background: none;
  border: none;
  color: var(--muted);
  font-size: 10px;
  padding: 3px 8px;
  border-radius: 4px;
  transition: all .15s;
}

.theme-btn--active {
  background: var(--border2);
  color: var(--text);
}
</style>