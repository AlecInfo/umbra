<script setup lang="ts">
const { t } = useLandingT()

interface DemoNode {
  name: string
  ip: string
  loc: string
  ms: number | null
  cpu: number | null
  cat: 'sbc' | 'nas' | 'vps'
  icon: string
  status: 'online' | 'offline' | 'warning'
}

const NODES: DemoNode[] = [
  { name: 'raspi-home',     ip: '100.64.0.1', loc: 'Genève, CH',    ms: 2,    cpu: 12, cat: 'sbc', icon: 'i-lucide-cpu',        status: 'online' },
  { name: 'synology-home',  ip: '100.64.0.2', loc: 'Genève, CH',    ms: 3,    cpu: 8,  cat: 'nas', icon: 'i-lucide-hard-drive',  status: 'online' },
  { name: 'vps-frankfurt',  ip: '100.64.0.3', loc: 'Frankfurt, DE', ms: 8,    cpu: 34, cat: 'vps', icon: 'i-lucide-server',      status: 'online' },
  { name: 'vps-tokyo',      ip: '100.64.0.4', loc: 'Tokyo, JP',     ms: 52,   cpu: 78, cat: 'vps', icon: 'i-lucide-server',      status: 'warning' },
  { name: 'vps-london',     ip: '100.64.0.5', loc: 'London, GB',    ms: null, cpu: null, cat: 'vps', icon: 'i-lucide-server',    status: 'offline' },
]

const connName = ref('raspi-home')
const connNode = computed(() => NODES.find(n => n.name === connName.value) ?? null)
const onlineCount = computed(() => NODES.filter(n => n.status !== 'offline').length)
const warningCount = computed(() => NODES.filter(n => n.status === 'warning').length)

function connect(n: DemoNode) { connName.value = n.name }
function disconnect() { connName.value = '' }
</script>

<template>
  <section class="l-section">
    <div class="wrap">
      <div class="l-sh center reveal">
        <div class="l-sh-eyebrow">
          {{ t('ss_eyebrow') }}
        </div>
        <h2 class="l-sh-title">
          {{ t('ss_title') }}
        </h2>
        <p class="l-sh-sub" style="margin-top:12px">
          {{ t('ss_caption') }}
        </p>
      </div>

      <!-- ── App window ── -->
      <div class="dm-window reveal d1">

        <!-- Title bar -->
        <div class="dm-titlebar">
          <div class="dm-wdots">
            <span class="dm-wdot" /><span class="dm-wdot" /><span class="dm-wdot" />
          </div>
          <span class="dm-wtab">UMBRA — Dashboard</span>
        </div>

        <!-- Shell -->
        <div class="dm-shell">

          <!-- Sidebar -->
          <aside class="dm-sidebar">
            <div class="dm-sidebar-logo">
              <span class="dm-logo-text">UMBRA<span class="dm-logo-dot">.</span></span>
              <span class="dm-logo-sub">{{ t('dm_vpnmgr') }}</span>
            </div>
            <nav class="dm-sidebar-nav">
              <div class="dm-nav-section">{{ t('dm_nav') }}</div>
              <div class="dm-nav-item active">
                <UIcon name="i-lucide-layout-dashboard" style="width:14px;height:14px;flex-shrink:0" />
                <span>{{ t('dm_dashboard') }}</span>
              </div>
              <div class="dm-nav-item">
                <UIcon name="i-lucide-server" style="width:14px;height:14px;flex-shrink:0" />
                <span>{{ t('dm_nodes') }}</span>
                <span class="dm-nav-badge-n">5</span>
              </div>
              <div class="dm-nav-item">
                <UIcon name="i-lucide-network" style="width:14px;height:14px;flex-shrink:0" />
                <span>{{ t('dm_connections') }}</span>
              </div>
              <div class="dm-nav-section">{{ t('dm_compte') }}</div>
              <div class="dm-nav-item">
                <UIcon name="i-lucide-triangle-alert" style="width:14px;height:14px;flex-shrink:0" />
                <span>{{ t('dm_alerts') }}</span>
                <span v-if="warningCount" class="dm-nav-badge-w">{{ warningCount }}</span>
              </div>
              <div class="dm-nav-item">
                <UIcon name="i-lucide-terminal" style="width:14px;height:14px;flex-shrink:0" />
                <span>{{ t('dm_apikeys') }}</span>
              </div>
              <div class="dm-nav-item">
                <UIcon name="i-lucide-settings" style="width:14px;height:14px;flex-shrink:0" />
                <span>{{ t('dm_settings') }}</span>
              </div>
            </nav>
            <div class="dm-sidebar-bottom">
              <div class="dm-user-pill">
                <div class="dm-user-avatar">A</div>
                <div>
                  <div class="dm-user-name">alecptt</div>
                  <div class="dm-user-plan">{{ t('dm_freeplan') }}</div>
                </div>
              </div>
            </div>
          </aside>

          <!-- Main content -->
          <div class="dm-main">
            <div class="dm-page">
              <div class="dm-page-header">
                <div>
                  <div class="dm-page-title">{{ t('dm_dashboard') }}</div>
                  <div class="dm-page-sub">{{ onlineCount }}/{{ NODES.length }} {{ t('dm_nodes_online') }}</div>
                </div>
                <button class="dm-btn-add">
                  <UIcon name="i-lucide-plus" style="width:12px;height:12px" />
                  {{ t('dm_addnode') }}
                </button>
              </div>

              <!-- Node table -->
              <div class="dm-card">
                <div class="dm-card-header">
                  <span class="dm-card-title">{{ t('dm_card_nodes') }}</span>
                </div>
                <div
                  v-for="n in NODES"
                  :key="n.name"
                  :class="['dm-node-row',
                    connName === n.name ? 'r-conn' : '',
                    n.status === 'warning' ? 'r-warn' : '',
                    n.status === 'offline' ? 'r-off' : ''
                  ]"
                >
                  <!-- Name + IP -->
                  <div class="dm-nc">
                    <div :class="['dm-nicon', `cat-${n.cat}`]">
                      <UIcon :name="n.icon" style="width:15px;height:15px" />
                    </div>
                    <div>
                      <div class="dm-nname">{{ n.name }}</div>
                      <div class="dm-nid">
                        {{ n.ip }}
                        <span v-if="n.status === 'warning'" class="dm-warn-hint">
                          <UIcon name="i-lucide-triangle-alert" style="width:9px;height:9px" /> CPU {{ n.cpu }}%
                        </span>
                      </div>
                    </div>
                  </div>
                  <!-- Location -->
                  <span class="dm-cell-m">{{ n.loc }}</span>
                  <!-- Status badge -->
                  <span>
                    <span :class="['dm-status-pill', connName === n.name ? 'connected' : n.status]">
                      {{ connName === n.name ? t('dm_status_connected') : n.status === 'online' ? t('dm_status_online') : n.status === 'warning' ? t('dm_status_warning') : t('dm_status_offline') }}
                    </span>
                  </span>
                  <!-- Latency -->
                  <span class="dm-cell-m" :style="connName === n.name ? 'color:var(--accent)' : ''">
                    {{ n.ms != null ? n.ms + 'ms' : '—' }}
                  </span>
                  <!-- CPU -->
                  <span class="dm-cell-m" :style="n.cpu != null && n.cpu > 70 ? 'color:var(--warning)' : n.cpu == null ? 'opacity:.3' : ''">
                    {{ n.cpu != null ? n.cpu + '%' : '—' }}
                  </span>
                  <!-- Action -->
                  <div class="dm-cell-action">
                    <button
                      :class="['dm-conn-btn', connName === n.name ? 'cut' : '']"
                      :disabled="n.status === 'offline'"
                      @click.stop="connName === n.name ? disconnect() : connect(n)"
                    >
                      <UIcon
                        :name="connName === n.name ? 'i-lucide-square' : 'i-lucide-play'"
                        style="width:8px;height:8px"
                      />
                      {{ connName === n.name ? t('dm_cut') : t('dm_connect') }}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- VPN bar (inside window, at bottom) -->
            <Transition name="dm-vpn">
              <div v-if="connNode" class="dm-vpn-bar">
                <div class="dm-vpn-dot" />
                <div class="dm-vpn-info">
                  <span class="dm-vpn-name">{{ connNode.name }} — {{ connNode.loc }}</span>
                  <div class="dm-vpn-detail">{{ connNode.ip }} · WireGuard · umbra0</div>
                </div>
                <div class="dm-vpn-stats">
                  <div class="dm-vstat">
                    <div class="dm-vstat-val">{{ connNode.ms }}ms</div>
                    <div class="dm-vstat-lbl">{{ t('dm_latency') }}</div>
                  </div>
                  <div class="dm-vstat">
                    <div class="dm-vstat-val">↑ 1.2 MB/s</div>
                    <div class="dm-vstat-lbl">{{ t('dm_upload') }}</div>
                  </div>
                  <div class="dm-vstat">
                    <div class="dm-vstat-val">↓ 4.8 MB/s</div>
                    <div class="dm-vstat-lbl">{{ t('dm_download') }}</div>
                  </div>
                </div>
                <button class="dm-btn-cut" @click="disconnect">{{ t('dm_disconnect') }}</button>
              </div>
            </Transition>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* ── Window chrome ─────────────────────────────────────────────── */
.dm-window {
  margin-top: 48px;
  border: 1px solid var(--border2);
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 40px 100px rgba(0,0,0,.5);
}

.dm-titlebar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 14px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
}

.dm-wdots { display: flex; gap: 5px; }
.dm-wdot { width: 10px; height: 10px; border-radius: 50%; }
.dm-wdot:nth-child(1) { background: #ff5f57; }
.dm-wdot:nth-child(2) { background: #febc2e; }
.dm-wdot:nth-child(3) { background: #28c840; }
.dm-wtab { font-size: 11px; color: var(--muted); font-family: var(--font-mono); }

/* ── Shell ─────────────────────────────────────────────────────── */
.dm-shell {
  display: flex;
  background: var(--bg);
}

/* ── Sidebar — miroir exact du vrai ────────────────────────────── */
.dm-sidebar {
  width: 214px;
  flex-shrink: 0;
  background: var(--surface);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
}

.dm-sidebar-logo {
  padding: 22px 18px 16px;
  border-bottom: 1px solid var(--border);
  display: flex;
  flex-direction: column;
}

.dm-logo-text {
  font-family: var(--font-disp);
  font-size: 17px;
  font-weight: 800;
  color: var(--text);
  letter-spacing: .03em;
}
.dm-logo-dot { color: var(--accent); }
.dm-logo-sub {
  font-size: 9px;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: .1em;
  margin-top: 2px;
}

.dm-sidebar-nav {
  flex: 1;
  padding: 12px 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.dm-nav-section {
  padding: 11px 11px 3px;
  font-size: 9px;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: .1em;
}

.dm-nav-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 12px;
  border-radius: 6px;
  color: var(--muted);
  font-size: 12px;
  cursor: default;
}
.dm-nav-item.active {
  background: var(--surface2);
  color: var(--text);
}
.dm-nav-item.active svg { color: var(--accent); }

.dm-nav-badge-n {
  margin-left: auto;
  background: var(--surface2);
  color: var(--muted);
  font-size: 9px;
  padding: 1px 6px;
  border-radius: 10px;
  font-family: var(--font-mono);
}
.dm-nav-badge-w {
  margin-left: auto;
  background: var(--offline);
  color: #fff;
  font-size: 9px;
  font-weight: 600;
  padding: 1px 5px;
  border-radius: 10px;
}

.dm-sidebar-bottom {
  padding: 12px 8px;
  border-top: 1px solid var(--border);
}

.dm-user-pill {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 7px 9px;
  border-radius: 5px;
}
.dm-user-avatar {
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
.dm-user-name { font-size: 11px; color: var(--text); }
.dm-user-plan { font-size: 9px; color: var(--muted); text-transform: uppercase; letter-spacing: .08em; }

/* ── Main area ─────────────────────────────────────────────────── */
.dm-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  position: relative;
}

.dm-page {
  flex: 1;
  padding: 24px;
  overflow: hidden;
}

.dm-page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 20px;
}

.dm-page-title {
  font-family: var(--font-disp);
  font-size: 21px;
  font-weight: 700;
  color: var(--text);
}
.dm-page-sub { font-size: 11px; color: var(--muted); margin-top: 3px; }

.dm-btn-add {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border-radius: 6px;
  font-family: var(--font-mono);
  font-size: 11px;
  cursor: default;
  background: var(--accent);
  border: none;
  color: #0a0a0b;
  font-weight: 600;
}

/* ── Card ──────────────────────────────────────────────────────── */
.dm-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  overflow: hidden;
}

.dm-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
}
.dm-card-title { font-size: 12px; font-weight: 500; color: var(--text); }

/* ── Node rows — miroir exact ──────────────────────────────────── */
.dm-node-row {
  display: grid;
  grid-template-columns: 2fr 1.1fr 1fr 0.7fr 0.7fr 88px;
  padding: 11px 16px;
  border-bottom: 1px solid var(--border);
  align-items: center;
  transition: background .1s;
  cursor: default;
}
.dm-node-row:last-child { border-bottom: none; }
.dm-node-row:hover { background: var(--surface2); }

.r-conn { background: rgba(79,255,176,.04); border-left: 2px solid var(--accent); padding-left: 14px; }
.r-warn { background: rgba(255,183,79,.04); border-left: 2px solid var(--warning); padding-left: 14px; }
.r-off { opacity: .6; }

.dm-nc { display: flex; align-items: center; gap: 9px; }

.dm-nicon {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.cat-sbc { background: rgba(79,255,176,.12);  color: var(--accent); }
.cat-vps { background: rgba(79,168,255,.15);  color: var(--pending); }
.cat-nas { background: rgba(123,110,246,.15); color: var(--accent2); }

.dm-nname { font-size: 12px; font-weight: 500; color: var(--text); }
.dm-nid   { font-size: 9px; color: var(--muted); margin-top: 1px; }
.dm-warn-hint { color: var(--warning); margin-left: 4px; }
.dm-cell-m { font-size: 11px; color: var(--muted); }
.dm-cell-action { display: flex; justify-content: flex-end; }

/* Status pills — copie de StatusBadge */
.dm-status-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 10px;
  font-family: var(--font-mono);
  white-space: nowrap;
}
.dm-status-pill.online    { background: rgba(79,255,176,.1);  color: var(--accent); }
.dm-status-pill.connected { background: rgba(79,255,176,.14); color: var(--accent); font-weight: 600; }
.dm-status-pill.warning   { background: rgba(255,183,79,.1);  color: var(--warning); }
.dm-status-pill.offline   { background: var(--surface2);       color: var(--muted); }

/* conn-btn — copie exacte */
.dm-conn-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 4px;
  font-family: var(--font-mono);
  font-size: 10px;
  cursor: pointer;
  border: 1px solid var(--border2);
  background: none;
  color: var(--muted);
  transition: all .15s;
  white-space: nowrap;
}
.dm-conn-btn:hover:not(:disabled) {
  border-color: var(--accent);
  color: var(--accent);
  background: rgba(79,255,176,.06);
}
.dm-conn-btn.cut {
  border-color: rgba(255,79,107,.4);
  color: var(--offline);
}
.dm-conn-btn:disabled { opacity: .3; cursor: not-allowed; }

/* ── VPN bar — copie exacte ────────────────────────────────────── */
.dm-vpn-bar {
  display: flex;
  align-items: center;
  gap: 14px;
  margin: 0 20px 16px;
  background: color-mix(in srgb, var(--bg) 85%, transparent);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid color-mix(in srgb, var(--accent) 25%, transparent);
  border-radius: 6px;
  padding: 9px 14px;
  font-size: 11px;
  box-shadow: 0 2px 12px rgba(0,0,0,.25);
}

.dm-vpn-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--accent);
  flex-shrink: 0;
  animation: vpnp 2s infinite;
}

.dm-vpn-info { flex: 1; }
.dm-vpn-name { color: var(--accent); font-weight: 500; }
.dm-vpn-detail { color: var(--muted); font-size: 10px; margin-top: 1px; }

.dm-vpn-stats { display: flex; gap: 20px; }
.dm-vstat { text-align: right; }
.dm-vstat-val { font-size: 12px; font-weight: 600; color: var(--text); }
.dm-vstat-lbl { font-size: 9px; color: var(--muted); text-transform: uppercase; letter-spacing: .07em; }

.dm-btn-cut {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 4px;
  font-family: var(--font-mono);
  font-size: 10px;
  cursor: pointer;
  background: color-mix(in srgb, var(--offline) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--offline) 30%, transparent);
  color: var(--offline);
  transition: all .15s;
  white-space: nowrap;
}
.dm-btn-cut:hover { background: color-mix(in srgb, var(--offline) 18%, transparent); }

/* ── Transition ────────────────────────────────────────────────── */
.dm-vpn-enter-active, .dm-vpn-leave-active { transition: opacity .25s, transform .25s; }
.dm-vpn-enter-from, .dm-vpn-leave-to { opacity: 0; transform: translateY(8px); }

/* ── Light mode ────────────────────────────────────────────────── */
html.light .dm-window { box-shadow: 0 24px 64px rgba(0,0,0,.1); }

/* ── Responsive ────────────────────────────────────────────────── */
@media (max-width: 860px) {
  .dm-sidebar { display: none; }
  .dm-node-row { grid-template-columns: 2fr 1fr 80px; }
  .dm-cell-m, .dm-status-pill, span:has(> .dm-status-pill) { display: none; }
}
@media (max-width: 500px) {
  .dm-window { margin-top: 32px; }
  .dm-vpn-stats { display: none; }
  .dm-vpn-bar { gap: 10px; }
  .dm-page { padding: 16px; }
  .dm-node-row { grid-template-columns: 1fr 72px; }
}
</style>
