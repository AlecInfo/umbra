<script setup lang="ts">
import { categoryIcons } from '~/composables/useCategoryIcons'

definePageMeta({ layout: 'mobile' })

const store     = useNodesStore()

onMounted(() => { if (!store.nodes.length) store.fetchNodes() })

// ── Connection timer (local, store has no connectedAt) ─────────────────────
const connectionStart = ref<number | null>(null)
const elapsed         = ref(0)
let timer: ReturnType<typeof setInterval> | null = null

watch(() => store.connectedNode, (node) => {
  if (timer) { clearInterval(timer); timer = null }
  if (node) {
    if (!connectionStart.value) connectionStart.value = Date.now()
    elapsed.value = Math.floor((Date.now() - connectionStart.value) / 1000)
    timer = setInterval(() => {
      elapsed.value = Math.floor((Date.now() - connectionStart.value!) / 1000)
    }, 1000)
  } else {
    connectionStart.value = null
    elapsed.value = 0
  }
}, { immediate: true })

onUnmounted(() => { if (timer) clearInterval(timer) })

const duration = computed(() => {
  const h = Math.floor(elapsed.value / 3600)
  const m = Math.floor((elapsed.value % 3600) / 60)
  const s = elapsed.value % 60
  return h > 0
      ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
})

// ── Last used (use persisted connectedId from store) ────────────────────────
const lastUsedId   = computed(() => store.connectedId ?? null)
const lastUsedNode = computed(() =>
    store.nodes.find(n => n.id === lastUsedId.value && n.status !== 'connected') ?? null
)

// ── Node picker modal ───────────────────────────────────────────────────────
const showModal = ref(false)

const STATUS_ORDER: Record<string, number> = {
  connected: 0, online: 1, warning: 2, pending: 3, offline: 4,
}

const sortedNodes = computed(() =>
    [...store.nodes].sort((a, b) => {
      const sd = STATUS_ORDER[a.status]! - STATUS_ORDER[b.status]!
      if (sd !== 0) return sd
      if (a.latency !== null && b.latency !== null) return a.latency - b.latency
      if (a.latency !== null) return -1
      if (b.latency !== null) return 1
      return a.name.localeCompare(b.name)
    })
)

function selectNode(id: string) {
  store.setConnected(id)
  showModal.value = false
}

// Latency quality → color
function latencyColor(ms: number | null) {
  if (ms === null) return 'var(--muted)'
  if (ms < 30)  return 'var(--accent)'
  if (ms < 100) return 'var(--warning)'
  return 'var(--offline)'
}
</script>

<template>
  <div class="m-shell">

    <!-- ── Header ── -->
    <header class="m-header">
      <div class="m-logo">
        <span class="m-logo-text">UMBRA</span><span class="m-logo-dot">.</span>
      </div>
      <button class="m-icon-btn" @click="navigateTo('/mobile-settings')" aria-label="Paramètres">
        <UIcon name="i-lucide-settings" style="width:16px;height:16px" />
      </button>
    </header>

    <!-- ── Hero ── -->
    <div class="m-hero">

      <!-- Animated ring -->
      <div class="m-ring-wrap" :class="{ connected: store.connectedNode }">
        <div class="m-ring m-ring-3" />
        <div class="m-ring m-ring-2" />
        <div class="m-ring m-ring-1" />
        <div class="m-ring-core">
          <UIcon v-if="!store.connectedNode" name="i-lucide-lock" class="m-ring-icon" style="width:28px;height:28px" />
          <UIcon v-else name="i-lucide-shield-check" class="m-ring-icon" style="width:28px;height:28px" />
        </div>
      </div>

      <!-- Status text -->
      <div class="m-hero-status">
        <div class="m-hero-label" :class="{ connected: store.connectedNode }">
          <span class="m-status-pip" :class="{ connected: store.connectedNode }" />
          {{ store.connectedNode ? 'PROTÉGÉ' : 'NON PROTÉGÉ' }}
        </div>
        <div class="m-hero-name">
          {{ store.connectedNode ? store.connectedNode.name : 'Non connecté' }}
        </div>
        <div class="m-hero-detail">
          {{ store.connectedNode
            ? `${store.connectedNode.ip} · ${store.connectedNode.location}`
            : 'Sélectionne un noeud pour te protéger'
          }}
        </div>
      </div>

    </div>

    <!-- ── Stats strip (always in DOM → no layout shift) ── -->
    <div class="m-stats-strip" :class="{ 'is-visible': store.connectedNode }">
      <div class="m-stat-item">
        <div class="m-stat-main">
          <UIcon name="i-lucide-arrow-up" class="m-stat-icon up" style="width:12px;height:12px" />
          <span class="m-stat-val">1.2 <span class="m-stat-unit">MB/s</span></span>
        </div>
        <span class="m-stat-lbl">Upload</span>
      </div>
      <div class="m-stat-sep" />
      <div class="m-stat-item">
        <div class="m-stat-main">
          <UIcon name="i-lucide-arrow-down" class="m-stat-icon dn" style="width:12px;height:12px" />
          <span class="m-stat-val">4.8 <span class="m-stat-unit">MB/s</span></span>
        </div>
        <span class="m-stat-lbl">Download</span>
      </div>
      <div class="m-stat-sep" />
      <div class="m-stat-item">
        <span class="m-stat-val" :style="`color: ${store.connectedNode ? latencyColor(store.connectedNode.latency) : 'var(--muted)'}`">
          {{ store.connectedNode?.latency ?? '—' }}<span class="m-stat-unit" style="color: var(--muted)">ms</span>
        </span>
        <span class="m-stat-lbl">Latence</span>
      </div>
      <div class="m-stat-sep" />
      <div class="m-stat-item">
        <span class="m-stat-val mono-timer">{{ duration || '00:00' }}</span>
        <span class="m-stat-lbl">Durée</span>
      </div>
    </div>

    <!-- ── Actions (fixed 2-slot height to avoid layout shift) ── -->
    <div class="m-actions">

      <!-- Slot 1: primary -->
      <button
          v-if="store.connectedNode"
          class="m-btn m-btn-cut"
          @click="store.disconnect()"
      >
        <UIcon name="i-lucide-square" style="width:14px;height:14px" />
        Déconnecter
      </button>
      <button
          v-else-if="lastUsedNode"
          class="m-btn m-btn-connect"
          @click="store.setConnected(lastUsedNode.id)"
      >
        <div class="nicon" :class="`cat-${lastUsedNode.category}`" style="width:18px;height:18px">
          <UIcon :name="categoryIcons[lastUsedNode.category]" style="width:10px;height:10px" />
        </div>
        Reconnecter à {{ lastUsedNode.name }}
      </button>
      <button
          v-else
          class="m-btn m-btn-connect"
          @click="showModal = true"
      >
        <UIcon name="i-lucide-network" style="width:14px;height:14px" />
        Choisir un noeud
      </button>

      <!-- Slot 2: secondary (always rendered, invisible when no secondary action) -->
      <button
          class="m-btn m-btn-ghost"
          :class="{ 'is-invisible': !store.connectedNode && !lastUsedNode }"
          :aria-hidden="!store.connectedNode && !lastUsedNode"
          @click="showModal = true"
      >
        <UIcon name="i-lucide-server" style="width:13px;height:13px" />
        {{ store.connectedNode ? 'Changer de noeud' : 'Choisir un noeud' }}
      </button>

    </div>

    <!-- ── Safe area spacer ── -->
    <div class="m-safe-bottom" />

    <!-- ── Node picker bottom sheet ── -->
    <Transition name="sheet">
      <div v-if="showModal" class="m-overlay" @click.self="showModal = false">
        <div class="m-sheet">

          <!-- Handle -->
          <div class="m-sheet-handle" />

          <!-- Header -->
          <div class="m-sheet-header">
            <span class="m-sheet-title">Noeuds disponibles</span>
            <span class="m-sheet-count">{{ store.onlineCount }} actifs</span>
            <button class="m-icon-btn" @click="showModal = false">
              <UIcon name="i-lucide-x" style="width:14px;height:14px" />
            </button>
          </div>

          <!-- Node list -->
          <div class="m-sheet-list">
            <div
                v-for="node in sortedNodes"
                :key="node.id"
                class="m-node-row"
                :class="{
                'is-connected': node.status === 'connected',
                'is-warning':   node.status === 'warning',
                'is-disabled':  node.status === 'offline' || node.status === 'pending',
              }"
                @click="node.status !== 'offline' && node.status !== 'pending' && selectNode(node.id)"
            >
              <!-- Icon -->
              <div class="nicon" :class="`cat-${node.category}`">
                <UIcon :name="categoryIcons[node.category]" style="width:14px;height:14px" />
              </div>

              <!-- Info -->
              <div class="m-node-info">
                <div class="m-node-name">
                  {{ node.name }}
                  <span v-if="node.status === 'connected'" class="m-tag m-tag-conn">ACTIF</span>
                  <span v-else-if="node.id === lastUsedId" class="m-tag m-tag-last">dernier</span>
                </div>
                <div class="m-node-sub">
                  {{ node.location }}
                  <span
                      v-if="node.latency !== null"
                      class="m-node-lat-inline"
                      :style="`color: ${latencyColor(node.latency)}`"
                  >· {{ node.latency }}ms</span>
                </div>
              </div>

              <!-- Right: status badge only -->
              <div class="m-node-right">
                <StatusBadge :status="node.status" />
              </div>

            </div>
          </div>

          <div class="m-sheet-safe" />
        </div>
      </div>
    </Transition>

  </div>
</template>

<style scoped>
/* ══════════════════════════════════════════
   SHELL
══════════════════════════════════════════ */
.m-shell {
  min-height: 100dvh;
  background: var(--bg);
  font-family: var(--font-mono);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

/* ══════════════════════════════════════════
   HEADER
══════════════════════════════════════════ */
.m-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px 0;
  padding-top: calc(16px + env(safe-area-inset-top));
  flex-shrink: 0;
}

.m-logo { display: flex; align-items: baseline; }
.m-logo-text {
  font-family: var(--font-disp);
  font-size: 16px;
  font-weight: 800;
  color: var(--text);
  letter-spacing: .04em;
}
.m-logo-dot { color: var(--accent); font-family: var(--font-disp); font-size: 16px; font-weight: 800; }

.m-icon-btn {
  background: var(--surface);
  border: 1px solid var(--border2);
  border-radius: 8px;
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--muted);
  cursor: pointer;
  transition: all .15s;
}
.m-icon-btn:active { background: var(--surface2); color: var(--text); }

/* ══════════════════════════════════════════
   HERO
══════════════════════════════════════════ */
.m-hero {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 28px;
  padding: 24px 20px 8px;
  min-height: 0;
}

/* ── Ring system ── */
.m-ring-wrap {
  position: relative;
  width: 192px;
  height: 192px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.m-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 1.5px solid;
  border-color: var(--border2);
  transition: border-color .5s, opacity .5s;
}

/* Connected: rings animate outward */
.m-ring-wrap.connected .m-ring-1 {
  border-color: color-mix(in srgb, var(--accent) 50%, transparent);
  animation: ring-out 2.4s ease-out infinite;
}
.m-ring-wrap.connected .m-ring-2 {
  border-color: color-mix(in srgb, var(--accent) 30%, transparent);
  animation: ring-out 2.4s ease-out infinite 0.6s;
}
.m-ring-wrap.connected .m-ring-3 {
  border-color: color-mix(in srgb, var(--accent) 15%, transparent);
  animation: ring-out 2.4s ease-out infinite 1.2s;
}

@keyframes ring-out {
  0%   { transform: scale(.7); opacity: .9; }
  100% { transform: scale(1.3); opacity: 0; }
}

/* Core circle */
.m-ring-core {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: var(--surface);
  border: 1.5px solid var(--border2);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 1;
  transition: all .5s;
}

.m-ring-wrap.connected .m-ring-core {
  background: color-mix(in srgb, var(--accent) 10%, var(--surface));
  border-color: color-mix(in srgb, var(--accent) 60%, transparent);
  box-shadow: 0 0 32px color-mix(in srgb, var(--accent) 20%, transparent),
  0 0 60px color-mix(in srgb, var(--accent) 10%, transparent);
}

.m-ring-icon {
  color: var(--muted);
  transition: color .5s;
}
.m-ring-wrap.connected .m-ring-icon { color: var(--accent); }

/* ── Status text ── */
.m-hero-status { text-align: center; display: flex; flex-direction: column; gap: 4px; }

.m-hero-label {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 10px;
  letter-spacing: .14em;
  color: var(--muted);
  font-weight: 600;
  transition: color .4s;
}
.m-hero-label.connected { color: var(--accent); }

.m-status-pip {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--muted);
  flex-shrink: 0;
  transition: background .4s;
}
.m-status-pip.connected {
  background: var(--accent);
  box-shadow: 0 0 6px var(--accent);
  animation: pip-pulse 2s infinite;
}
@keyframes pip-pulse {
  0%, 100% { box-shadow: 0 0 4px var(--accent); }
  50%       { box-shadow: 0 0 10px var(--accent), 0 0 18px color-mix(in srgb, var(--accent) 40%, transparent); }
}

.m-hero-name {
  font-family: var(--font-disp);
  font-size: 26px;
  font-weight: 700;
  color: var(--text);
  line-height: 1.1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 280px;
}

.m-hero-detail {
  font-size: 11px;
  color: var(--muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 260px;
}

/* ══════════════════════════════════════════
   STATS STRIP
══════════════════════════════════════════ */
.m-stats-strip {
  display: flex;
  align-items: center;
  gap: 0;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  margin: 0 16px;
  overflow: hidden;
  flex-shrink: 0;
}

.m-stat-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 10px 6px;
}
.m-stat-main {
  display: flex;
  align-items: center;
  gap: 3px;
}
.m-stat-icon.up  { color: var(--accent); }
.m-stat-icon.dn  { color: var(--accent2); }

.m-stat-val {
  font-family: var(--font-disp);
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
  line-height: 1;
  white-space: nowrap;
}
.m-stat-unit { font-size: 9px; font-weight: 400; color: var(--muted); }
.m-stat-lbl  { font-size: 9px; color: var(--muted); text-transform: uppercase; letter-spacing: .06em; }
.mono-timer  { font-family: var(--font-mono); font-size: 13px; letter-spacing: .04em; }

.m-stat-sep {
  width: 1px;
  height: 32px;
  background: var(--border);
  flex-shrink: 0;
}

/* Stats: invisible when disconnected, no layout shift */
.m-stats-strip {
  opacity: 0;
  pointer-events: none;
  transition: opacity .4s ease;
}
.m-stats-strip.is-visible {
  opacity: 1;
  pointer-events: auto;
}

/* ══════════════════════════════════════════
   ACTIONS
══════════════════════════════════════════ */
.m-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 16px 0;
  flex-shrink: 0;
}

.m-btn {
  width: 100%;
  padding: 15px;
  border-radius: 10px;
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  border: 1.5px solid transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all .15s;
  letter-spacing: .02em;
}

.m-btn-connect {
  background: var(--accent);
  color: var(--bg);
}
.m-btn-connect:active { filter: brightness(.88); transform: scale(.99); }

.m-btn-cut {
  background: transparent;
  border-color: color-mix(in srgb, var(--offline) 35%, transparent);
  color: var(--offline);
  background: color-mix(in srgb, var(--offline) 8%, transparent);
}
.m-btn-cut:active { background: color-mix(in srgb, var(--offline) 14%, transparent); transform: scale(.99); }

.m-btn-ghost {
  background: var(--surface);
  border-color: var(--border2);
  color: var(--muted);
}
.m-btn-ghost:active { background: var(--surface2); color: var(--text); transform: scale(.99); }

/* ══════════════════════════════════════════
   SAFE AREA
══════════════════════════════════════════ */
.m-safe-bottom {
  height: env(safe-area-inset-bottom, 16px);
  min-height: 8px;
  flex-shrink: 0;
}

/* ══════════════════════════════════════════
   BOTTOM SHEET
══════════════════════════════════════════ */
.m-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.65);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  z-index: 200;
  display: flex;
  align-items: flex-end;
}

.m-sheet {
  width: 100%;
  max-height: 82dvh;
  background: var(--surface);
  border-radius: 20px 20px 0 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-top: 1px solid var(--border2);
}

.m-sheet-handle {
  width: 36px;
  height: 4px;
  border-radius: 2px;
  background: var(--border2);
  margin: 12px auto 0;
  flex-shrink: 0;
}

.m-sheet-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 16px 12px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.m-sheet-title { font-size: 13px; font-weight: 500; color: var(--text); }
.m-sheet-count {
  font-size: 10px;
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent) 22%, transparent);
  border-radius: 10px;
  padding: 2px 8px;
  margin-left: 6px;
  flex-shrink: 0;
}
.m-sheet-header .m-icon-btn { margin-left: auto; }

.m-sheet-list {
  overflow-y: auto;
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  -webkit-overflow-scrolling: touch;
}

/* ── Node row ── */
.m-node-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 10px;
  border-radius: 8px;
  border: 1px solid transparent;
  transition: all .12s;
  cursor: pointer;
}
.m-node-row:not(.is-disabled):active { background: var(--surface2); }

.m-node-row.is-connected {
  background: color-mix(in srgb, var(--accent) 7%, transparent);
  border-color: color-mix(in srgb, var(--accent) 22%, transparent);
}
.m-node-row.is-warning {
  background: color-mix(in srgb, var(--warning) 6%, transparent);
  border-color: color-mix(in srgb, var(--warning) 18%, transparent);
}
.m-node-row.is-disabled { opacity: .45; cursor: default; }

.m-node-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }

.m-node-name {
  font-size: 12px;
  font-weight: 500;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: flex;
  align-items: center;
  gap: 6px;
}
.m-node-sub { font-size: 10px; color: var(--muted); }

/* Tags */
.m-tag {
  font-size: 8px;
  font-weight: 600;
  letter-spacing: .08em;
  padding: 1px 5px;
  border-radius: 3px;
  vertical-align: middle;
}
.m-tag-conn {
  background: color-mix(in srgb, var(--accent) 14%, transparent);
  color: var(--accent);
  border: 1px solid color-mix(in srgb, var(--accent) 28%, transparent);
}
.m-tag-last {
  background: color-mix(in srgb, var(--accent2) 12%, transparent);
  color: var(--accent2);
  border: 1px solid color-mix(in srgb, var(--accent2) 25%, transparent);
}

/* Invisible but keeps layout space */
.is-invisible { opacity: 0; pointer-events: none; }

/* Right side */
.m-node-right {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.m-node-lat-inline {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 500;
}

.m-sheet-safe {
  height: env(safe-area-inset-bottom, 16px);
  min-height: 8px;
  flex-shrink: 0;
}

/* ── Sheet transition ── */
.sheet-enter-active { transition: opacity .25s ease; }
.sheet-leave-active { transition: opacity .2s ease; }
.sheet-enter-active .m-sheet,
.sheet-leave-active .m-sheet { transition: transform .3s cubic-bezier(.22,1,.36,1); }
.sheet-enter-from { opacity: 0; }
.sheet-leave-to   { opacity: 0; }
.sheet-enter-from .m-sheet { transform: translateY(100%); }
.sheet-leave-to   .m-sheet { transform: translateY(100%); }
</style>