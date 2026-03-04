<script setup lang="ts">
import { categoryIcons } from '~/composables/useCategoryIcons'

definePageMeta({ layout: 'auth' })

const step     = ref(2)
const nodeName = ref('')
const category = ref('sbc')
const copied   = ref(false)

const categories = [
  { value: 'sbc',     name: 'SBC',         desc: 'RPi, NanoPi, Orange Pi…'  },
  { value: 'vps',     name: 'VPS / Cloud', desc: 'Hetzner, DigitalOcean…'   },
  { value: 'router',  name: 'Routeur',     desc: 'GL.iNet, OpenWrt…'        },
  { value: 'nas',     name: 'NAS',         desc: 'Synology, TrueNAS…'       },
  { value: 'desktop', name: 'Desktop',     desc: 'Mac, Linux, PC…'          },
  { value: 'other',   name: 'Autre',       desc: 'Machine personnalisée'    },
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
            <div class="step-num"><UIcon name="i-lucide-check" style="width:10px;height:10px" /></div>
            <div class="step-label">Compte</div>
          </div>
          <div class="step" :class="{ current: step === 2, done: step > 2 }">
            <div class="step-num"><UIcon v-if="step > 2" name="i-lucide-check" style="width:10px;height:10px" /><template v-else>2</template></div>
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
          <UIcon name="i-lucide-circle-check" style="width:16px;height:16px" />
          <strong>{{ nodeName }}</strong> est enregistré et en ligne
        </div>

        <div class="next-actions-lbl">Que voulez-vous faire maintenant ?</div>

        <div class="next-actions">
          <div class="next-action" @click="navigateTo('/')">
            <div class="next-action-icon icon-connect">
              <UIcon name="i-lucide-plus" style="width:14px;height:14px" />
            </div>
            <div class="next-action-info">
              <div class="next-action-title">Se connecter au noeud</div>
              <div class="next-action-sub">Établir le tunnel WireGuard maintenant</div>
            </div>
            <UIcon name="i-lucide-chevron-right" class="next-chevron" style="width:12px;height:12px" />
          </div>

          <div class="next-action" @click="step = 2; nodeName = ''; category = 'sbc'">
            <div class="next-action-icon icon-add">
              <UIcon name="i-lucide-plus" style="width:14px;height:14px" />
            </div>
            <div class="next-action-info">
              <div class="next-action-title">Ajouter un autre noeud</div>
              <div class="next-action-sub">VPS, routeur, NAS, SBC...</div>
            </div>
            <UIcon name="i-lucide-chevron-right" class="next-chevron" style="width:12px;height:12px" />
          </div>

          <div class="next-action" @click="navigateTo('/settings')">
            <div class="next-action-icon icon-share">
              <UIcon name="i-lucide-share-2" style="width:14px;height:14px" />
            </div>
            <div class="next-action-info">
              <div class="next-action-title">Inviter quelqu'un</div>
              <div class="next-action-sub">Partager l'accès avec la famille ou l'équipe</div>
            </div>
            <UIcon name="i-lucide-chevron-right" class="next-chevron" style="width:12px;height:12px" />
          </div>

          <div class="next-action" @click="navigateTo('/')">
            <div class="next-action-icon icon-dashboard">
              <UIcon name="i-lucide-layout-dashboard" style="width:14px;height:14px" />
            </div>
            <div class="next-action-info">
              <div class="next-action-title">Aller au dashboard</div>
              <div class="next-action-sub">Explorer l'interface UMBRA</div>
            </div>
            <UIcon name="i-lucide-chevron-right" class="next-chevron" style="width:12px;height:12px" />
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
