<script setup lang="ts">
defineEmits<{ close: [] }>()

const nodeName = ref('')
const category = ref('sbc')
const copied   = ref(false)

const categories = [
  { value: 'sbc',     name: 'SBC',        desc: 'RPi, NanoPi…',         icon: `<rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" stroke-width="1.4"/><rect x="5" y="5" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.2"/><line x1="4" y1="0" x2="4" y2="2" stroke="currentColor" stroke-width="1.2"/><line x1="8" y1="0" x2="8" y2="2" stroke="currentColor" stroke-width="1.2"/><line x1="12" y1="0" x2="12" y2="2" stroke="currentColor" stroke-width="1.2"/>` },
  { value: 'vps',     name: 'VPS / Cloud', desc: 'Hetzner, OVH…',       icon: `<rect x="1" y="3" width="14" height="4" rx="1.2" stroke="currentColor" stroke-width="1.3"/><rect x="1" y="9" width="14" height="4" rx="1.2" stroke="currentColor" stroke-width="1.3"/><circle cx="12.5" cy="5" r="1" fill="currentColor"/><circle cx="12.5" cy="11" r="1" fill="currentColor"/>` },
  { value: 'router',  name: 'Routeur',     desc: 'GL.iNet, OpenWrt…',   icon: `<rect x="1" y="6" width="14" height="6" rx="1.5" stroke="currentColor" stroke-width="1.3"/><line x1="4" y1="6" x2="4" y2="4" stroke="currentColor" stroke-width="1.3"/><line x1="8" y1="6" x2="8" y2="2" stroke="currentColor" stroke-width="1.3"/><line x1="12" y1="6" x2="12" y2="4" stroke="currentColor" stroke-width="1.3"/>` },
  { value: 'nas',     name: 'NAS',         desc: 'Synology, TrueNAS…',  icon: `<rect x="2" y="2" width="12" height="4" rx="1" stroke="currentColor" stroke-width="1.3"/><rect x="2" y="7" width="12" height="4" rx="1" stroke="currentColor" stroke-width="1.3"/><circle cx="4.5" cy="4" r=".8" fill="currentColor"/><circle cx="4.5" cy="9" r=".8" fill="currentColor"/>` },
  { value: 'desktop', name: 'Desktop',     desc: 'Mac, Linux, PC…',     icon: `<rect x="1" y="2" width="14" height="10" rx="1.5" stroke="currentColor" stroke-width="1.3"/><line x1="8" y1="12" x2="8" y2="15" stroke="currentColor" stroke-width="1.3"/><line x1="5" y1="15" x2="11" y2="15" stroke="currentColor" stroke-width="1.3"/>` },
  { value: 'other',   name: 'Autre',       desc: 'Machine custom',      icon: `<circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.3"/><line x1="8" y1="5" x2="8" y2="9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="8" cy="11.5" r=".8" fill="currentColor"/>` },
]

const slug = computed(() => nodeName.value.replace(/\s/g, '-').toLowerCase())

function copyCmd() {
  const cmd = `curl -sSL https://get.umbra.network | bash -s -- \\\n  --name=${slug.value} \\\n  --token=umbra_reg_a4f2e9c3d1b0...`
  navigator.clipboard.writeText(cmd)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}
</script>

<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal add-node-modal">

      <div class="modal-header">
        <div>
          <div class="modal-title">Ajouter un noeud</div>
          <div class="modal-sub">Installez l'agent UMBRA sur votre machine</div>
        </div>
        <button class="close-btn" @click="$emit('close')">✕</button>
      </div>

      <div class="modal-body">

        <div class="form-group">
          <label class="form-label">Nom du noeud</label>
          <input v-model="nodeName" class="form-input" type="text" placeholder="ex: raspi-salon" autofocus />
        </div>

        <div class="form-group">
          <label class="form-label">Catégorie</label>
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
            &nbsp;&nbsp;--name=<span class="cmd-accent">{{ slug }}</span> \<br>
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
          Linux amd64, arm64, armv7 · Token expire dans <strong>23h 58m</strong>
        </div>

      </div>

      <div class="modal-footer">
        <button class="btn-ghost-sm" @click="$emit('close')">Fermer</button>
      </div>

    </div>
  </div>
</template>
