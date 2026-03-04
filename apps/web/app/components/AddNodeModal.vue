<script setup lang="ts">
import { categoryIcons } from '~/composables/useCategoryIcons'

defineEmits<{ close: [] }>()

const nodeName = ref('')
const category = ref('sbc')
const copied   = ref(false)

const categories = [
  { value: 'sbc',     name: 'SBC',         desc: 'RPi, NanoPi…'        },
  { value: 'vps',     name: 'VPS / Cloud', desc: 'Hetzner, OVH…'       },
  { value: 'router',  name: 'Routeur',     desc: 'GL.iNet, OpenWrt…'   },
  { value: 'nas',     name: 'NAS',         desc: 'Synology, TrueNAS…'  },
  { value: 'desktop', name: 'Desktop',     desc: 'Mac, Linux, PC…'     },
  { value: 'other',   name: 'Autre',       desc: 'Machine custom'      },
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
        <button class="close-btn" @click="$emit('close')"><UIcon name="i-lucide-x" style="width:12px;height:12px" /></button>
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
                <UIcon :name="categoryIcons[c.value]" style="width:16px;height:16px" />
              </div>
              <div class="cat-opt-name">{{ c.name }}</div>
              <div class="cat-opt-desc">{{ c.desc }}</div>
            </div>
          </div>
        </div>

        <template v-if="nodeName">
          <div class="cmd-block">
            <button class="cmd-copy" @click="copyCmd">
              <template v-if="copied"><UIcon name="i-lucide-check" style="width:10px;height:10px" /> Copié</template>
              <template v-else>Copier</template>
            </button>
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
