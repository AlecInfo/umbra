<template>
  <div v-if="node" class="detail-page">

    <!-- Back -->
    <div class="back-link" @click="navigateTo('/nodes')">← Mes noeuds</div>

    <!-- Page header -->
    <div class="page-header">
      <div class="header-left">
        <div class="node-title">
          <div class="nicon" :class="`cat-${node.category}`">
            <svg width="17" height="17" viewBox="0 0 16 16" fill="none" v-html="categoryIcon" />
          </div>
          <span class="page-title">{{ node.name }}</span>
          <StatusPill :status="node.status" />
          <CategoryBadge :category="node.category" />
        </div>
        <div class="page-sub">{{ node.ip }} · {{ node.location }} · Agent v1.0.0</div>
      </div>
      <div class="header-actions">
        <button class="btn-ghost">Partager</button>
        <button class="btn-ghost">Configurer</button>
        <button
            class="btn-primary"
            :class="{ 'btn-danger': node.status === 'connected' }"
            :disabled="node.status === 'offline'"
            @click="onConnect"
        >
          {{ node.status === 'connected' ? 'Déconnecter' : 'Se connecter' }}
        </button>
      </div>
    </div>

    <!-- VPN bar -->
    <VpnBar
        v-if="node.status === 'connected'"
        :node="node"
        upload="1.2 MB/s"
        download="4.8 MB/s"
        class="mb"
        @cut="store.disconnect()"
    />

    <!-- Main grid -->
    <div class="detail-grid">

      <!-- Left col -->
      <div class="col-left">
        <div class="card">
          <div class="card-header">
            <div class="card-title">Métriques système</div>
            <div class="card-meta">
              <div class="period-group">
                <button
                    v-for="p in periods"
                    :key="p.value"
                    class="period-btn"
                    :class="{ active: period === p.value }"
                    @click="period = p.value"
                >
                  {{ p.label }}
                </button>
              </div>
              <span class="heartbeat">heartbeat il y a 2s</span>
            </div>
          </div>
          <div class="card-body">
            <!-- Metric boxes — step 2 -->
            <div class="metrics-placeholder">Métriques — à venir</div>
          </div>
        </div>
      </div>

      <!-- Right col -->
      <div class="col-right">

        <!-- Machine -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">Machine</div>
          </div>
          <div class="card-body card-body--tight">
            <div class="info-row"><span class="info-lbl">Hardware</span><span class="info-val">Raspberry Pi 4B</span></div>
            <div class="info-row"><span class="info-lbl">RAM</span><span class="info-val">4 GB</span></div>
            <div class="info-row"><span class="info-lbl">OS</span><span class="info-val">Ubuntu 24.04 LTS</span></div>
            <div class="info-row"><span class="info-lbl">Arch.</span><span class="info-val">arm64</span></div>
            <div class="info-row"><span class="info-lbl">IP publique</span><span class="info-val">203.0.113.42 <span class="badge-blue">IPv4</span></span></div>
            <div class="info-row"><span class="info-lbl">Localisation</span><span class="info-val">{{ node.location }}</span></div>
            <div class="info-row"><span class="info-lbl">ISP</span><span class="info-val">Swisscom AG</span></div>
          </div>
        </div>

        <!-- WireGuard -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">WireGuard</div>
            <span class="badge-accent">interface umbra0</span>
          </div>
          <div class="card-body card-body--tight">
            <div class="info-row"><span class="info-lbl">IP VPN</span><span class="info-val">{{ node.ip }}/32</span></div>
            <div class="info-row"><span class="info-lbl">Port</span><span class="info-val">:51820 UDP</span></div>
            <div class="info-row"><span class="info-lbl">MTU</span><span class="info-val">1420</span></div>
            <div class="info-row"><span class="info-lbl">DNS</span><span class="info-val">1.1.1.1, 8.8.8.8</span></div>
            <div class="info-row">
              <span class="info-lbl">Clé publique</span>
              <span class="info-val">xK3mP2…n9Qa <button class="copy-btn" title="Copier">⧉</button></span>
            </div>
            <div class="info-row"><span class="info-lbl">Pairs</span><span class="info-val">3 autorisés · 2 actifs</span></div>
          </div>
        </div>

        <!-- Agent UMBRA -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">Agent UMBRA</div>
          </div>
          <div class="card-body card-body--tight">
            <div class="info-row">
              <span class="info-lbl">Version</span>
              <span class="info-val">v1.0.0 <span class="badge-green">à jour</span></span>
            </div>
            <div class="info-row"><span class="info-lbl">Dernier heartbeat</span><span class="info-val accent">il y a 2s</span></div>
            <div class="info-row"><span class="info-lbl">Intervalle</span><span class="info-val">30s</span></div>
            <div class="info-row">
              <span class="info-lbl">Auto-update</span>
              <span class="info-val toggle-row">
                <span class="accent">Actif</span>
                <div class="toggle on"><div class="toggle-thumb" /></div>
              </span>
            </div>
            <div class="info-row"><span class="info-lbl">JWT expire</span><span class="info-val">dans 82j</span></div>
          </div>
        </div>

        <!-- Actions -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">Actions</div>
          </div>
          <div class="actions-body">
            <button class="action-btn">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M2 8a6 6 0 1 0 1-3.3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M2 4v4h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
              Redémarrer l'agent
            </button>
            <button class="action-btn">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="5.5" cy="5.5" r="3" stroke="currentColor" stroke-width="1.4"/><line x1="7.5" y1="7.5" x2="14" y2="14" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><line x1="11.5" y1="12" x2="13" y2="10.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
              Régénérer les clés WG
            </button>
            <button class="action-btn">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M8 2v8M5 7l3 3 3-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><rect x="2" y="11" width="12" height="3" rx="1" stroke="currentColor" stroke-width="1.3"/></svg>
              Télécharger config .conf
            </button>
            <button class="action-btn">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="1.5" stroke="currentColor" stroke-width="1.4"/><line x1="5" y1="6" x2="11" y2="6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><line x1="5" y1="9" x2="9" y2="9" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
              Voir les logs
            </button>
            <button class="action-btn danger">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M6 4V2h4v2M5 4v9a1 1 0 001 1h4a1 1 0 001-1V4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
              Supprimer le noeud
            </button>
          </div>
        </div>

      </div><!-- /col-right -->

    </div><!-- /detail-grid -->

  </div>

  <!-- Loading / not found -->
  <div v-else-if="store.loading" class="state-msg">Chargement...</div>
  <div v-else class="state-msg">Noeud introuvable</div>
</template>

<script setup lang="ts">
const route = useRoute()
const store = useNodesStore()

onMounted(() => { if (!store.nodes.length) store.fetchNodes() })

const node = computed(() =>
    store.nodes.find(n => n.id === route.params.id) ?? null
)

const period = ref('1j')
const periods = [
  { value: '1h', label: '1h' },
  { value: '1j', label: '1j' },
  { value: '1s', label: '1s' },
  { value: '1m', label: '1m' },
  { value: '1a', label: '1a' },
]

const categoryIcons: Record<string, string> = {
  sbc:     `<rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" stroke-width="1.4"/><rect x="5" y="5" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.2"/><line x1="4" y1="0" x2="4" y2="2" stroke="currentColor" stroke-width="1.2"/><line x1="8" y1="0" x2="8" y2="2" stroke="currentColor" stroke-width="1.2"/><line x1="12" y1="0" x2="12" y2="2" stroke="currentColor" stroke-width="1.2"/><line x1="4" y1="14" x2="4" y2="16" stroke="currentColor" stroke-width="1.2"/>`,
  vps:     `<rect x="1" y="3" width="14" height="4" rx="1.2" stroke="currentColor" stroke-width="1.3"/><rect x="1" y="9" width="14" height="4" rx="1.2" stroke="currentColor" stroke-width="1.3"/><circle cx="12.5" cy="5" r="1" fill="currentColor"/><circle cx="12.5" cy="11" r="1" fill="currentColor"/>`,
  router:  `<rect x="1" y="6" width="14" height="6" rx="1.5" stroke="currentColor" stroke-width="1.3"/><line x1="4" y1="6" x2="4" y2="4" stroke="currentColor" stroke-width="1.3"/><line x1="8" y1="6" x2="8" y2="2" stroke="currentColor" stroke-width="1.3"/><line x1="12" y1="6" x2="12" y2="4" stroke="currentColor" stroke-width="1.3"/><circle cx="5" cy="9.5" r="1" fill="currentColor"/><circle cx="9" cy="9.5" r="1" fill="currentColor"/>`,
  nas:     `<rect x="2" y="2" width="12" height="4" rx="1" stroke="currentColor" stroke-width="1.3"/><rect x="2" y="7" width="12" height="4" rx="1" stroke="currentColor" stroke-width="1.3"/><circle cx="4.5" cy="4" r=".8" fill="currentColor"/><circle cx="4.5" cy="9" r=".8" fill="currentColor"/>`,
  desktop: `<rect x="1" y="2" width="14" height="10" rx="1.5" stroke="currentColor" stroke-width="1.3"/><line x1="8" y1="12" x2="8" y2="15" stroke="currentColor" stroke-width="1.3"/><line x1="5" y1="15" x2="11" y2="15" stroke="currentColor" stroke-width="1.3"/>`,
  other:   `<circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.3"/><line x1="8" y1="5" x2="8" y2="8.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><circle cx="8" cy="11" r=".8" fill="currentColor" stroke="none"/>`,
}

const categoryIcon = computed(() => categoryIcons[node.value?.category ?? 'other'])

function onConnect() {
  if (!node.value) return
  if (node.value.status === 'connected') store.disconnect()
  else store.setConnected(node.value.id)
}
</script>

<style scoped>
/* ── Layout ── */
.detail-page { display: flex; flex-direction: column; }
.mb { margin-bottom: var(--sp-5); }

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: var(--sp-4);
  align-items: start;
}

.col-left  { display: flex; flex-direction: column; }
.col-right { display: flex; flex-direction: column; gap: var(--sp-4); }

/* ── Back link ── */
.back-link {
  font-size: 11px;
  color: var(--muted);
  cursor: pointer;
  margin-bottom: var(--sp-3);
  transition: color .15s;
}
.back-link:hover { color: var(--text); }

/* ── Page header ── */
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: var(--sp-5);
}

.node-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}

.page-title {
  font-family: var(--font-disp);
  font-size: 21px;
  font-weight: 700;
  color: var(--text);
}

.page-sub {
  font-size: 11px;
  color: var(--muted);
}

/* ── Node icon ── */
.nicon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.cat-sbc     { background: rgba(79,255,176,.12);  color: var(--accent);  }
.cat-vps     { background: rgba(79,168,255,.15);  color: #4fa8ff;        }
.cat-router  { background: rgba(255,183,79,.12);  color: var(--warning); }
.cat-nas     { background: rgba(123,110,246,.15); color: var(--accent2); }
.cat-desktop { background: rgba(200,200,220,.1);  color: var(--muted);   }
.cat-other   { background: var(--surface2);       color: var(--muted);   }

/* ── Header buttons ── */
.header-actions { display: flex; gap: 7px; align-items: center; }

.btn-ghost {
  display: inline-flex;
  align-items: center;
  padding: 7px 14px;
  border-radius: var(--r);
  font-family: var(--font-mono);
  font-size: 11px;
  cursor: pointer;
  background: transparent;
  border: 1px solid var(--border2);
  color: var(--muted);
  transition: all .15s;
}
.btn-ghost:hover { border-color: var(--text); color: var(--text); }

.btn-primary {
  display: inline-flex;
  align-items: center;
  padding: 7px 14px;
  border-radius: var(--r);
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  background: var(--accent);
  color: var(--bg);
  transition: filter .15s;
}
.btn-primary:hover { filter: brightness(1.08); }
.btn-primary:disabled { opacity: .35; cursor: not-allowed; }
.btn-danger {
  background: rgba(255,79,107,.1) !important;
  border: 1px solid rgba(255,79,107,.3) !important;
  color: var(--offline) !important;
}

/* ── Card ── */
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r);
  overflow: hidden;
}

.col-left .card { margin-bottom: var(--sp-4); }

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
}

.card-title        { font-size: 12px; font-weight: 500; color: var(--text); }
.card-meta         { display: flex; align-items: center; gap: 10px; }
.card-body         { padding: 14px 16px; }
.card-body--tight  { padding: 6px 16px; }

/* ── Period selector ── */
.period-group {
  display: flex;
  gap: 2px;
  background: var(--bg);
  border: 1px solid var(--border2);
  border-radius: 5px;
  padding: 2px;
}

.period-btn {
  background: none;
  border: none;
  color: var(--muted);
  font-family: var(--font-mono);
  font-size: 10px;
  padding: 3px 9px;
  border-radius: 4px;
  cursor: pointer;
  transition: all .15s;
}
.period-btn:hover  { color: var(--text); }
.period-btn.active { background: var(--surface); color: var(--accent); }

.heartbeat { font-size: 10px; color: var(--muted); }

/* ── Info rows ── */
.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 7px 0;
  border-bottom: 1px solid var(--border);
  font-size: 11px;
}
.info-row:last-child { border-bottom: none; }
.info-lbl { color: var(--muted); }
.info-val { color: var(--text); font-weight: 500; }
.accent   { color: var(--accent); }

/* ── Badges ── */
.badge-accent {
  font-size: 9px;
  background: rgba(79,255,176,.08);
  color: var(--accent);
  border: 1px solid rgba(79,255,176,.18);
  padding: 2px 7px;
  border-radius: 10px;
}

.badge-green {
  font-size: 9px;
  background: rgba(79,255,176,.1);
  color: var(--accent);
  padding: 1px 5px;
  border-radius: 3px;
}

.badge-blue {
  font-size: 9px;
  background: rgba(79,168,255,.1);
  color: var(--pending);
  padding: 1px 5px;
  border-radius: 3px;
}

/* ── Copy button ── */
.copy-btn {
  background: none;
  border: none;
  color: var(--muted);
  font-size: 10px;
  cursor: pointer;
  padding: 0;
  transition: color .15s;
}
.copy-btn:hover { color: var(--text); }

/* ── Toggle ── */
.toggle-row { display: flex; align-items: center; gap: 7px; }

.toggle {
  display: inline-block;
  width: 28px;
  height: 15px;
  border-radius: 8px;
  position: relative;
  cursor: pointer;
}
.toggle.on    { background: var(--accent); }
.toggle-thumb {
  position: absolute;
  right: 2px;
  top: 2px;
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: var(--bg);
}

/* ── Action buttons ── */
.actions-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 16px;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  padding: 7px 10px;
  border-radius: var(--r);
  font-family: var(--font-mono);
  font-size: 11px;
  cursor: pointer;
  background: transparent;
  border: 1px solid var(--border2);
  color: var(--muted);
  transition: all .15s;
}
.action-btn:hover        { border-color: var(--text); color: var(--text); }
.action-btn.danger       { border-color: rgba(255,79,107,.3); color: var(--offline); }
.action-btn.danger:hover { background: rgba(255,79,107,.08); }

/* ── Placeholders / states ── */
.metrics-placeholder {
  font-size: 11px;
  color: var(--muted);
  padding: var(--sp-6);
  text-align: center;
}

.state-msg {
  text-align: center;
  padding: var(--sp-10);
  font-size: 11px;
  color: var(--muted);
}
</style>