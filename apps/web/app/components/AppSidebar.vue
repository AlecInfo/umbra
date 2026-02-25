<template>
  <aside class="sidebar">

    <!-- Logo -->
    <div class="sidebar-logo">
      <span class="logo-text">UMBRA<span class="logo-dot">.</span></span>
    </div>

    <!-- Navigation -->
    <nav class="sidebar-nav">
      <NuxtLink class="nav-item" to="/" exact-active-class="nav-item--active">
        <IconDashboard />
        <span>Dashboard</span>
      </NuxtLink>
      <NuxtLink class="nav-item" to="/nodes" active-class="nav-item--active">
        <IconNodes />
        <span>Noeuds</span>
      </NuxtLink>
      <NuxtLink class="nav-item" to="/connections" active-class="nav-item--active">
        <IconConnections />
        <span>Connexions</span>
      </NuxtLink>
      <NuxtLink class="nav-item" to="/alerts" active-class="nav-item--active">
        <IconAlerts />
        <span>Alertes</span>
        <span v-if="alertCount > 0" class="nav-badge">{{ alertCount }}</span>
      </NuxtLink>
      <NuxtLink class="nav-item" to="/api-keys" active-class="nav-item--active">
        <IconApiKeys />
        <span>Clés API</span>
      </NuxtLink>
    </nav>

    <!-- Bottom -->
    <div class="sidebar-bottom">
      <NuxtLink class="nav-item" to="/settings" active-class="nav-item--active">
        <IconSettings />
        <span>Paramètres</span>
      </NuxtLink>
      <NuxtLink class="nav-item" to="/profile" active-class="nav-item--active">
        <IconProfile />
        <span>Profil</span>
      </NuxtLink>
    </div>

  </aside>
</template>

<script setup lang="ts">
// TODO: brancher sur le store alerts
const alertCount = ref(2)
</script>

<style scoped>
.sidebar {
  width: var(--sidebar-w);
  height: 100vh;
  background: var(--surface);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.sidebar-logo {
  height: var(--topbar-h);
  display: flex;
  align-items: center;
  padding: 0 var(--sp-4);
  border-bottom: 1px solid var(--border);
}

.logo-text {
  font-family: var(--font-disp);
  font-size: 15px;
  font-weight: 800;
  color: var(--text);
  letter-spacing: .03em;
}

.logo-dot {
  color: var(--accent);
}

.sidebar-nav {
  flex: 1;
  padding: var(--sp-3) var(--sp-2);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sidebar-bottom {
  padding: var(--sp-3) var(--sp-2);
  border-top: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: 7px var(--sp-3);
  border-radius: var(--r);
  color: var(--muted);
  font-size: 12px;
  transition: all .15s;
  position: relative;
}

.nav-item:hover {
  background: var(--surface2);
  color: var(--text);
}

.nav-item--active {
  background: var(--surface2);
  color: var(--text);
}

.nav-item--active svg {
  color: var(--accent);
}

.nav-badge {
  margin-left: auto;
  background: var(--offline);
  color: #fff;
  font-size: 9px;
  font-weight: 600;
  padding: 1px 5px;
  border-radius: 10px;
  font-family: var(--font-mono);
}
</style>