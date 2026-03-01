<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const step     = ref(2)
const nodeName = ref('')
const category = ref('sbc')
const copied   = ref(false)

const categories = [
  { value: 'sbc',     name: 'SBC',       desc: 'RPi, NanoPi, Orange Pi…',   icon: `<rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" stroke-width="1.4"/><rect x="5" y="5" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.2"/><line x1="4" y1="0" x2="4" y2="2" stroke="currentColor" stroke-width="1.2"/><line x1="8" y1="0" x2="8" y2="2" stroke="currentColor" stroke-width="1.2"/><line x1="12" y1="0" x2="12" y2="2" stroke="currentColor" stroke-width="1.2"/>` },
  { value: 'vps',     name: 'VPS / Cloud',desc: 'Hetzner, DigitalOcean…',    icon: `<rect x="1" y="3" width="14" height="4" rx="1.2" stroke="currentColor" stroke-width="1.3"/><rect x="1" y="9" width="14" height="4" rx="1.2" stroke="currentColor" stroke-width="1.3"/><circle cx="12.5" cy="5" r="1" fill="currentColor"/><circle cx="12.5" cy="11" r="1" fill="currentColor"/>` },
  { value: 'router',  name: 'Routeur',   desc: 'GL.iNet, OpenWrt…',          icon: `<rect x="1" y="6" width="14" height="6" rx="1.5" stroke="currentColor" stroke-width="1.3"/><line x1="4" y1="6" x2="4" y2="4" stroke="currentColor" stroke-width="1.3"/><line x1="8" y1="6" x2="8" y2="2" stroke="currentColor" stroke-width="1.3"/><line x1="12" y1="6" x2="12" y2="4" stroke="currentColor" stroke-width="1.3"/>` },
  { value: 'nas',     name: 'NAS',       desc: 'Synology, TrueNAS…',         icon: `<rect x="2" y="2" width="12" height="4" rx="1" stroke="currentColor" stroke-width="1.3"/><rect x="2" y="7" width="12" height="4" rx="1" stroke="currentColor" stroke-width="1.3"/><circle cx="4.5" cy="4" r=".8" fill="currentColor"/><circle cx="4.5" cy="9" r=".8" fill="currentColor"/>` },
  { value: 'desktop', name: 'Desktop',   desc: 'Mac, Linux, PC…',            icon: `<rect x="1" y="2" width="14" height="10" rx="1.5" stroke="currentColor" stroke-width="1.3"/><line x1="8" y1="12" x2="8" y2="15" stroke="currentColor" stroke-width="1.3"/><line x1="5" y1="15" x2="11" y2="15" stroke="currentColor" stroke-width="1.3"/>` },
  { value: 'other',   name: 'Autre',     desc: 'Machine personnalisée',       icon: `<circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.3"/><line x1="8" y1="5" x2="8" y2="9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="8" cy="11.5" r=".8" fill="currentColor"/>` },
]

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

<template>
  <div class="onboard-wrap">
    <div class="onboard-card">

      <div class="onboard-header">
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

      <!-- Step 2 -->
      <div v-if="step === 2" class="onboard-body">
        <div class="form-group">
          <label class="form-label">Nom du noeud</label>
          <input v-model="nodeName" class="form-input" type="text" placeholder="RPi maison" />
        </div>

        <div class="form-group">
          <label class="form-label">Catégorie de machine</label>
          <div class="cat-grid">
            <div
              v-for="c in categories"
              :key="c.value"
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

        <template v-if="nodeName">
          <div class="cmd-block">
            <button class="cmd-copy" @click="copyCmd">{{ copied ? '✓ Copié' : 'Copier' }}</button>
            <span class="cmd-comment"># Coller dans le terminal de votre machine</span><br>
            curl -sSL https://get.umbra.network | bash -s -- \<br>
            &nbsp;&nbsp;--name=<span class="cmd-accent">{{ nodeName.replace(/\s/g, '-').toLowerCase() }}</span> \<br>
            &nbsp;&nbsp;--token=<span class="cmd-accent2">umbra_reg_a4f2e9c3d1b0...</span>
          </div>

          <div class="waiting-indicator">
            <div class="pulse-dot" />
            <span>En attente de l'enregistrement de l'agent…</span>
          </div>
        </template>
        <div v-else class="cmd-placeholder">
          Entrez un nom pour générer la commande d'installation
        </div>

        <div class="platform-info">
          Plateformes : Linux amd64, arm64, armv7 · Token expire dans <strong>23h 58m</strong>
        </div>
      </div>

      <!-- Step 3 -->
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

          <div class="next-action" @click="navigateTo('/settings')">
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
