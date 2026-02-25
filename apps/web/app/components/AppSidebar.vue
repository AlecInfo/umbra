<template>
  <aside class="sidebar">

    <!-- Logo -->
    <div class="sidebar-logo">
      <span class="logo-text">UMBRA<span class="logo-dot">.</span></span>
      <span class="logo-sub">VPN Manager</span>
    </div>

    <!-- Navigation -->
    <nav class="sidebar-nav">
      <div class="nav-section">Navigation</div>
      <NuxtLink class="nav-item" to="/" exact-active-class="nav-item--active">
        <IconDashboard /><span>Dashboard</span>
      </NuxtLink>
      <NuxtLink class="nav-item" to="/nodes" active-class="nav-item--active">
        <IconNodes /><span>Noeuds</span>
        <span v-if="alertCount > 0" class="nav-badge">12</span>
      </NuxtLink>
      <NuxtLink class="nav-item" to="/connections" active-class="nav-item--active">
        <IconConnections /><span>Connexions</span>
      </NuxtLink>

      <div class="nav-section">Compte</div>
      <NuxtLink class="nav-item" to="/alerts" active-class="nav-item--active">
        <IconAlerts /><span>Alertes</span>
        <span v-if="alertCount > 0" class="nav-badge">{{ alertCount }}</span>
      </NuxtLink>
      <NuxtLink class="nav-item" to="/api-keys" active-class="nav-item--active">
        <IconApiKeys /><span>Clés API</span>
      </NuxtLink>
      <NuxtLink class="nav-item" to="/settings" active-class="nav-item--active">
        <IconSettings /><span>Paramètres</span>
      </NuxtLink>
    </nav>

    <!-- Bottom -->
    <div class="sidebar-bottom">
      <div class="user-pill">
        <div class="avatar">A</div>
        <div>
          <div class="user-name">alecptt</div>
          <div class="user-plan">Free</div>
        </div>
      </div>
    </div>

  </aside>
</template>

<script setup lang="ts">
// TODO: connect to alerts store
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
  padding: 27px 18px 18px;
  border-bottom: 1px solid var(--border);
  display: flex;
  flex-direction: column;
}

.logo-sub {
  font-size: 9px;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: .1em;
  margin-top: 2px;
}

.user-pill {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 7px 9px;
  border-radius: 5px;
  cursor: pointer;
  transition: background .15s;
  margin-top: 4px;
}

.user-pill:hover { background: var(--surface2); }

.avatar {
  width: 27px;
  height: 27px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--accent2), var(--accent));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
}

.user-name { font-size: 11px; color: var(--text); }
.user-plan { font-size: 9px; color: var(--muted); text-transform: uppercase; letter-spacing: .08em; }

.logo-text {
  font-family: var(--font-disp);
  font-size: 17px;
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

.nav-section {
  padding: 11px 11px 3px;
  font-size: 9px;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: .1em;
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