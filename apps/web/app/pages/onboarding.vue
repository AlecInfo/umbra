<template>
  <div class="onboard-wrap">
    <div class="onboard-card">

      <!-- Header -->
      <div class="onboard-header">

        <!-- Steps -->
        <div class="onboard-steps">
          <div class="step done">
            <div class="step-num">✓</div>
            <div class="step-label">Compte</div>
          </div>
          <div class="step" :class="{ current: step === 2, done: step > 2 }">
            <div class="step-num">{{ step > 2 ? '✓' : '2' }}</div>
            <div class="step-label">Noeud</div>
          </div>
          <div class="step" :class="{ current: step === 3 }">
            <div class="step-num">3</div>
            <div class="step-label">Connexion</div>
          </div>
        </div>

        <template v-if="step === 2">
          <div class="onboard-title">Configurer le premier noeud</div>
          <div class="onboard-sub">Donnez un nom à votre machine et choisissez sa catégorie. La commande ci-dessous installe et enregistre l'agent automatiquement.</div>
        </template>
        <template v-else>
          <div class="onboard-title">Se connecter au noeud</div>
          <div class="onboard-sub">Votre noeud est enregistré. Choisissez-le dans la liste et connectez-vous via WireGuard.</div>
        </template>

      </div>

      <!-- Step 2 — Noeud -->
      <div v-if="step === 2" class="onboard-body">

        <div class="form-group">
          <label class="form-label">Nom du noeud</label>
          <input v-model="nodeName" class="form-input" type="text" placeholder="RPi maison" />
        </div>

        <div class="form-group">
          <label class="form-label">Catégorie de machine</label>
          <div class="cat-grid">
            <div
                v-for="c in categories" :key="c.value"
                class="cat-opt"
                :class="{ selected: category === c.value }"
                @click="category = c.value"
            >
              <div class="cat-opt-icon" :class="`cat-${c.value}`">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" v-html="c.icon" />
              </div>
              <div class="cat-opt-name">{{ c.name }}</div>
              <div class="cat-opt-desc">{{ c.desc }}</div>
            </div>
          </div>
        </div>

        <!-- Command block -->
        <div v-if="nodeName" class="cmd-block">
          <button class="cmd-copy" @click="copyCmd">{{ copied ? '✓ Copié' : 'Copier' }}</button>
          <div class="cmd-content">
            <span class="cmd-comment"># Coller dans le terminal de votre machine</span><br>
            curl -sSL https://get.umbra.network | bash -s -- \<br>
            &nbsp;&nbsp;--name=<span class="cmd-accent">{{ nodeName.replace(/\s/g, '-').toLowerCase() }}</span> \<br>
            &nbsp;&nbsp;--token=<span class="cmd-accent2">umbra_reg_a4f2e9c3d1b0...</span>
          </div>
        </div>

        <div v-else class="cmd-placeholder">
          Entrez un nom pour générer la commande d'installation
        </div>

        <!-- Waiting indicator -->
        <div v-if="nodeName" class="waiting-indicator">
          <div class="pulse-dot" />
          <span>En attente de l'enregistrement de l'agent…</span>
        </div>

        <!-- Platform info -->
        <div class="platform-info">
          Plateformes : Linux amd64, arm64, armv7
          <span class="sep">·</span>
          Token expire dans <strong>23h 58m</strong>
        </div>
      </div>

      <!-- Step 3 — Connexion -->
      <div v-else class="onboard-body">

        <div class="success-banner">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.4"/>
            <path d="M5 8l2 2 4-4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Noeud <strong>{{ nodeName || 'mon-noeud' }}</strong> enregistré avec succès
        </div>

        <div class="form-group">
          <label class="form-label">Se connecter à</label>
          <div class="node-select-list">
            <div class="node-select-item selected">
              <div class="nicon" :class="`cat-${category}`">
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" v-html="selectedCategoryIcon" />
              </div>
              <div class="node-select-info">
                <div class="node-select-name">{{ nodeName || 'mon-noeud' }}</div>
                <div class="node-select-loc">Nouveau · vient d'être enregistré</div>
              </div>
              <span class="new-badge">Nouveau</span>
            </div>
          </div>
        </div>

        <div class="connect-info">
          <div class="info-row-ob"><span class="info-lbl-ob">IP VPN</span><span class="info-val-ob">100.64.0.13/32</span></div>
          <div class="info-row-ob"><span class="info-lbl-ob">Interface</span><span class="info-val-ob">umbra0</span></div>
          <div class="info-row-ob"><span class="info-lbl-ob">Port</span><span class="info-val-ob">:51820 UDP</span></div>
        </div>

      </div>

      <!-- Footer -->
      <div class="onboard-footer">
        <button class="btn-ghost" @click="navigateTo('/')">Passer</button>
        <button
            class="btn-primary"
            :disabled="step === 2 && !nodeName"
            @click="next"
        >
          {{ step === 2 ? 'Continuer →' : 'Se connecter →' }}
        </button>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const step     = ref(2)
const nodeName = ref('')
const category = ref('sbc')
const copied   = ref(false)

const categories = [
  {
    value: 'sbc', name: 'SBC', desc: 'RPi, NanoPi, Orange Pi…',
    icon: `<rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" stroke-width="1.4"/><rect x="5" y="5" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.2"/><line x1="4" y1="0" x2="4" y2="2" stroke="currentColor" stroke-width="1.2"/><line x1="8" y1="0" x2="8" y2="2" stroke="currentColor" stroke-width="1.2"/><line x1="12" y1="0" x2="12" y2="2" stroke="currentColor" stroke-width="1.2"/>`,
  },
  {
    value: 'vps', name: 'VPS / Cloud', desc: 'Hetzner, DigitalOcean…',
    icon: `<rect x="1" y="3" width="14" height="4" rx="1.2" stroke="currentColor" stroke-width="1.3"/><rect x="1" y="9" width="14" height="4" rx="1.2" stroke="currentColor" stroke-width="1.3"/><circle cx="12.5" cy="5" r="1" fill="currentColor"/><circle cx="12.5" cy="11" r="1" fill="currentColor"/>`,
  },
  {
    value: 'router', name: 'Routeur', desc: 'GL.iNet, OpenWrt…',
    icon: `<rect x="1" y="6" width="14" height="6" rx="1.5" stroke="currentColor" stroke-width="1.3"/><line x1="4" y1="6" x2="4" y2="4" stroke="currentColor" stroke-width="1.3"/><line x1="8" y1="6" x2="8" y2="2" stroke="currentColor" stroke-width="1.3"/><line x1="12" y1="6" x2="12" y2="4" stroke="currentColor" stroke-width="1.3"/><circle cx="5" cy="9.5" r="1" fill="currentColor"/><circle cx="9" cy="9.5" r="1" fill="currentColor"/>`,
  },
  {
    value: 'nas', name: 'NAS', desc: 'Synology, TrueNAS…',
    icon: `<rect x="2" y="2" width="12" height="4" rx="1" stroke="currentColor" stroke-width="1.3"/><rect x="2" y="7" width="12" height="4" rx="1" stroke="currentColor" stroke-width="1.3"/><circle cx="4.5" cy="4" r=".8" fill="currentColor"/><circle cx="4.5" cy="9" r=".8" fill="currentColor"/>`,
  },
  {
    value: 'desktop', name: 'Desktop', desc: 'Mac, Linux, PC…',
    icon: `<rect x="1" y="2" width="14" height="10" rx="1.5" stroke="currentColor" stroke-width="1.3"/><line x1="8" y1="12" x2="8" y2="15" stroke="currentColor" stroke-width="1.3"/><line x1="5" y1="15" x2="11" y2="15" stroke="currentColor" stroke-width="1.3"/>`,
  },
  {
    value: 'other', name: 'Autre', desc: 'Machine personnalisée',
    icon: `<circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.3"/><line x1="8" y1="5" x2="8" y2="9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="8" cy="11.5" r=".8" fill="currentColor"/>`,
  },
]

const selectedCategoryIcon = computed(() =>
    categories.find(c => c.value === category.value)?.icon ?? ''
)

function copyCmd() {
  const cmd = `curl -sSL https://get.umbra.network | bash -s -- \\\n  --name=${nodeName.value || 'mon-noeud'} \\\n  --token=umbra_reg_a4f2e9c3d1b0...`
  navigator.clipboard.writeText(cmd)
  copied.value = true
  setTimeout(() => copied.value = false, 2000)
}

function next() {
  if (step.value === 2) step.value = 3
  else navigateTo('/')
}
</script>

<style scoped>
.onboard-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 36px;
  background: var(--bg);
  min-height: 100vh;
}

.onboard-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  width: 100%;
  max-width: 600px;
  overflow: hidden;
}

/* Header */
.onboard-header {
  padding: 26px 30px 22px;
  border-bottom: 1px solid var(--border);
}

.onboard-title {
  font-family: var(--font-disp);
  font-size: 20px;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 6px;
}

.onboard-sub {
  font-size: 11px;
  color: var(--muted);
  line-height: 1.7;
}

/* Steps */
.onboard-steps {
  display: flex;
  margin-bottom: 20px;
}

.step {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 10px;
  color: var(--muted);
}

.step::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--border);
  margin: 0 7px;
}
.step:last-child::after { display: none; }

.step-num {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1px solid var(--border2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  flex-shrink: 0;
}

.step.done .step-num  { background: var(--accent); border-color: var(--accent); color: var(--bg); font-weight: 700; }
.step.current .step-num { border-color: var(--accent); color: var(--accent); }
.step.current { color: var(--text); }
.step-label   { white-space: nowrap; }

/* Body */
.onboard-body {
  padding: 26px 30px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group { display: flex; flex-direction: column; gap: 7px; }

.form-label {
  font-size: 9px;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: .1em;
}

.form-input {
  background: var(--bg);
  border: 1px solid var(--border2);
  border-radius: var(--r);
  padding: 9px 12px;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text);
  outline: none;
  transition: border-color .15s;
}
.form-input:focus { border-color: var(--accent); }

/* Category grid */
.cat-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.cat-opt {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 8px;
  border-radius: var(--r);
  border: 1px solid var(--border2);
  background: var(--bg);
  cursor: pointer;
  text-align: center;
  transition: all .15s;
}
.cat-opt:hover   { border-color: var(--border); }
.cat-opt.selected { border-color: var(--accent); background: rgba(79,255,176,.06); }

.cat-opt-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
}

.cat-sbc     { background: rgba(79,255,176,.12);  color: var(--accent);  }
.cat-vps     { background: rgba(79,168,255,.15);  color: #4fa8ff;        }
.cat-router  { background: rgba(255,183,79,.12);  color: var(--warning); }
.cat-nas     { background: rgba(123,110,246,.15); color: var(--accent2); }
.cat-desktop { background: rgba(200,200,220,.1);  color: var(--muted);   }
.cat-other   { background: var(--surface2);       color: var(--muted);   }

.cat-opt-name { font-size: 10px; font-weight: 500; color: var(--text); }
.cat-opt-desc { font-size: 9px; color: var(--muted); margin-top: 2px; }

/* Command block */
.cmd-block {
  position: relative;
  background: var(--bg);
  border: 1px solid var(--border2);
  border-radius: var(--r);
  padding: 14px 16px;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text);
  line-height: 1.9;
}

.cmd-copy {
  position: absolute;
  top: 10px;
  right: 10px;
  background: var(--surface2);
  border: none;
  color: var(--muted);
  font-family: var(--font-mono);
  font-size: 9px;
  padding: 4px 8px;
  border-radius: 3px;
  cursor: pointer;
  text-transform: uppercase;
  transition: all .15s;
}
.cmd-copy:hover { color: var(--text); }

.cmd-comment { color: var(--muted); }
.cmd-accent  { color: var(--accent); }
.cmd-token   { color: var(--accent2); }

.fade-enter-active, .fade-leave-active { transition: opacity .2s, transform .2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(-4px); }

/* Waiting */
.waiting-indicator {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  background: rgba(79,168,255,.06);
  border: 1px solid rgba(79,168,255,.2);
  border-radius: var(--r);
  font-size: 11px;
  color: var(--pending);
}

.pulse-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--pending);
  animation: blink 1.2s infinite;
  flex-shrink: 0;
}

@keyframes blink {
  0%,100% { opacity: 1; }
  50%     { opacity: .3; }
}

.cmd-placeholder {
  padding: 14px 16px;
  background: var(--bg);
  border: 1px dashed var(--border2);
  border-radius: var(--r);
  font-size: 11px;
  color: var(--muted);
  font-family: var(--font-mono);
  text-align: center;
}

.cmd-accent2 { color: var(--accent2); }

.platform-info {
  font-size: 10px;
  color: var(--muted);
  line-height: 1.8;
}
.platform-info strong { color: var(--text); }
.sep { margin: 0 4px; }

/* Step 3 */
.success-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  background: rgba(79,255,176,.06);
  border: 1px solid rgba(79,255,176,.2);
  border-radius: var(--r);
  font-size: 11px;
  color: var(--accent);
}
.success-banner strong { font-weight: 600; }

.node-select-list {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--r);
  overflow: hidden;
}

.node-select-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all .15s;
}
.node-select-item.selected { border-color: var(--accent); background: rgba(79,255,176,.04); }

.nicon {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.node-select-info { flex: 1; }
.node-select-name { font-size: 12px; font-weight: 500; color: var(--text); }
.node-select-loc  { font-size: 10px; color: var(--muted); margin-top: 1px; }

.new-badge {
  font-size: 9px;
  background: rgba(79,255,176,.1);
  color: var(--accent);
  border: 1px solid rgba(79,255,176,.2);
  padding: 2px 7px;
  border-radius: 10px;
}

.connect-info {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--r);
  overflow: hidden;
}

.info-row-ob {
  display: flex;
  justify-content: space-between;
  padding: 9px 14px;
  border-bottom: 1px solid var(--border);
  font-size: 11px;
}
.info-row-ob:last-child { border-bottom: none; }
.info-lbl-ob { color: var(--muted); }
.info-val-ob { color: var(--text); font-family: var(--font-mono); font-weight: 500; }

/* Footer */
.onboard-footer {
  padding: 18px 30px;
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.btn-ghost {
  display: inline-flex;
  align-items: center;
  padding: 8px 16px;
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
  padding: 8px 18px;
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
.btn-primary:hover    { filter: brightness(1.08); }
.btn-primary:disabled { opacity: .35; cursor: not-allowed; }
</style>