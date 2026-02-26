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

      <!-- Step 3 — C'est parti ! -->
      <div v-else class="onboard-body">

        <div class="success-banner">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.4"/>
            <path d="M5 8l2 2 4-4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <strong>{{ nodeName }}</strong> est enregistré et en ligne
        </div>

        <div class="next-actions-lbl">Que voulez-vous faire maintenant ?</div>

        <div class="next-actions">
          <div class="next-action" @click="navigateTo('/')">
            <div class="next-action-icon icon-connect">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.4"/><path d="M6 8h4M8 6v4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
            </div>
            <div class="next-action-info">
              <div class="next-action-title">Se connecter au noeud</div>
              <div class="next-action-sub">Établir le tunnel WireGuard maintenant</div>
            </div>
            <svg class="next-chevron" width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          </div>

          <div class="next-action" @click="step = 2; nodeName = ''; category = 'sbc'">
            <div class="next-action-icon icon-add">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 2v12M2 8h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
            </div>
            <div class="next-action-info">
              <div class="next-action-title">Ajouter un autre noeud</div>
              <div class="next-action-sub">VPS, routeur, NAS, SBC...</div>
            </div>
            <svg class="next-chevron" width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          </div>

          <div class="next-action" @click="navigateTo('/nodes')">
            <div class="next-action-icon icon-share">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="12" cy="4" r="2" stroke="currentColor" stroke-width="1.3"/><circle cx="4" cy="8" r="2" stroke="currentColor" stroke-width="1.3"/><circle cx="12" cy="12" r="2" stroke="currentColor" stroke-width="1.3"/><path d="M6 7l4-2M6 9l4 2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
            </div>
            <div class="next-action-info">
              <div class="next-action-title">Inviter quelqu'un</div>
              <div class="next-action-sub">Partager l'accès avec la famille ou l'équipe</div>
            </div>
            <svg class="next-chevron" width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          </div>

          <div class="next-action" @click="navigateTo('/')">
            <div class="next-action-icon icon-dashboard">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.3"/><rect x="9" y="2" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.3"/><rect x="2" y="9" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.3"/><rect x="9" y="9" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.3"/></svg>
            </div>
            <div class="next-action-info">
              <div class="next-action-title">Aller au dashboard</div>
              <div class="next-action-sub">Explorer l'interface UMBRA</div>
            </div>
            <svg class="next-chevron" width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          </div>
        </div>

      </div>

      <div class="onboard-footer">
        <button class="btn-ghost" @click="navigateTo('/')">Passer</button>
        <button
            class="btn-primary"
            :disabled="step === 2 && !nodeName"
            @click="next"
        >
          {{ step === 2 ? 'Continuer →' : 'Aller au dashboard →' }}
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
  padding: 18px 30px 16px;
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
  margin-bottom: 14px;
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

.step.done .step-num     { background: var(--accent); border-color: var(--accent); color: var(--bg); font-weight: 700; }
.step.current .step-num  { border-color: var(--accent); color: var(--accent); }
.step.current            { color: var(--text); }
.step-label              { white-space: nowrap; }

/* Body */
.onboard-body {
  padding: 18px 30px;
  display: flex;
  flex-direction: column;
  gap: 14px;
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
  padding: 8px 6px;
  border-radius: var(--r);
  border: 1px solid var(--border2);
  background: var(--bg);
  cursor: pointer;
  text-align: center;
  transition: all .15s;
}
.cat-opt:hover    { border-color: var(--border); }
.cat-opt.selected { border-color: var(--accent); background: rgba(79,255,176,.06); }

.cat-opt-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 5px;
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
  padding: 10px 14px;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text);
  line-height: 1.7;
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
.cmd-accent2 { color: var(--accent2); }

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

/* Waiting */
.pulse-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--pending);
  animation: blink 1.2s infinite;
  flex-shrink: 0;
}

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

@keyframes blink {
  0%,100% { opacity: 1; }
  50%     { opacity: .3; }
}

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

.next-actions-lbl {
  font-size: 10px;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: .1em;
}

.next-actions {
  display: flex;
  flex-direction: column;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--r);
  overflow: hidden;
}

.next-action {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 13px 16px;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  transition: background .1s;
}
.next-action:last-child { border-bottom: none; }
.next-action:hover      { background: var(--surface2); }

.next-action-icon {
  width: 30px;
  height: 30px;
  border-radius: 7px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.icon-connect   { background: rgba(79,255,176,.12);  color: var(--accent);  }
.icon-add       { background: rgba(79,168,255,.12);  color: #4fa8ff;        }
.icon-share     { background: rgba(123,110,246,.12); color: var(--accent2); }
.icon-dashboard { background: rgba(255,183,79,.12);  color: var(--warning); }

.next-action-info  { flex: 1; }
.next-action-title { font-size: 12px; font-weight: 500; color: var(--text); }
.next-action-sub   { font-size: 10px; color: var(--muted); margin-top: 2px; }

.next-chevron { color: var(--muted); flex-shrink: 0; }

/* Footer */
.onboard-footer {
  padding: 14px 30px;
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