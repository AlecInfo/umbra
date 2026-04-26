<script setup lang="ts">
import { watchDebounced } from '@vueuse/core'
import { categoryIcons } from '~/composables/useCategoryIcons'
import { useNodesStore } from '~/stores/nodes'
import { useAuthStore } from '~/stores/auth'

const emit = defineEmits<{ close: [], created: [nodeId: string] }>()

const store = useNodesStore()
const auth  = useAuthStore()
const { t } = useT()
const { public: { apiBase } } = useRuntimeConfig()

const nodeName = ref('')
const category = ref<'sbc' | 'vps' | 'router' | 'nas' | 'desktop' | 'other'>('sbc')
const copied   = ref(false)
const error    = ref<string | null>(null)

const createdNodeId  = ref<string | null>(null)
const enrollToken    = ref<string | null>(null)
const tokenExpiresAt = ref<string | null>(null)
const polling        = ref(false)
const enrolled       = ref(false)
const regenerating   = ref(false)
const now            = ref(Date.now())
let pollHandle: ReturnType<typeof setInterval> | null = null
let tickHandle: ReturnType<typeof setInterval> | null = null
let inFlight = false

const expired = ref(false)

watch(now, () => {
  if (expired.value || !tokenExpiresAt.value) return
  if (new Date(tokenExpiresAt.value).getTime() <= now.value) {
    expired.value = true
    stopPolling()
  }
})

const categories = computed(() => [
  { value: 'sbc',     name: t('onb_cat_sbc'),     desc: t('addnode_cat_sbc_d')    },
  { value: 'vps',     name: t('onb_cat_vps'),     desc: t('addnode_cat_vps_d')    },
  { value: 'router',  name: t('onb_cat_router'),  desc: t('onb_cat_router_d')     },
  { value: 'nas',     name: t('onb_cat_nas'),     desc: t('onb_cat_nas_d')        },
  { value: 'desktop', name: t('onb_cat_desktop'), desc: t('onb_cat_desktop_d')    },
  { value: 'other',   name: t('onb_cat_other'),   desc: t('addnode_cat_other_d')  },
])

const slug = computed(() => nodeName.value.trim().replace(/\s+/g, '-').toLowerCase())
const tokenExpiresLabel = computed(() => {
  if (!tokenExpiresAt.value) return null
  const diff = new Date(tokenExpiresAt.value).getTime() - now.value
  if (diff <= 0) return t('onb_token_expired')
  const h = Math.floor(diff / 3_600_000)
  const m = Math.floor((diff % 3_600_000) / 60_000)
  const s = Math.floor((diff % 60_000) / 1_000)
  if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m`
  return `${m}m ${s.toString().padStart(2, '0')}s`
})

function onBeforeUnload() {
  if (!createdNodeId.value || enrolled.value) return
  try {
    fetch(`${apiBase}/nodes/${createdNodeId.value}`, {
      method: 'DELETE',
      keepalive: true,
      headers: auth.token ? { Authorization: `Bearer ${auth.token}` } : undefined,
    })
  } catch { /* ignore */ }
}

onMounted(() => {
  tickHandle = setInterval(() => { now.value = Date.now() }, 1000)
  window.addEventListener('beforeunload', onBeforeUnload)
})

async function createNode() {
  if (inFlight || !slug.value) return
  inFlight = true
  error.value = null
  try {
    const api = useApi()
    const { node } = await api<{ node: { id: string } }>('/nodes', {
      method: 'POST',
      body: { name: slug.value, category: category.value },
    })
    createdNodeId.value = node.id

    const enrollRes = await api<{
      enrollToken: string
      expiresAt: string
      installCommand: string
    }>(`/nodes/${node.id}/enroll-token`, { method: 'POST' })

    enrollToken.value = enrollRes.enrollToken
    tokenExpiresAt.value = enrollRes.expiresAt
    expired.value = false

    startPolling(node.id)
  } catch (e: any) {
    error.value = e?.data?.message || e?.data?.errors?.[0]?.message || t('onb_err_create')
  } finally {
    inFlight = false
  }
}

async function patchNode() {
  if (!createdNodeId.value || inFlight || !slug.value) return
  inFlight = true
  error.value = null
  try {
    const api = useApi()
    await api(`/nodes/${createdNodeId.value}`, {
      method: 'PATCH',
      body: { name: slug.value, category: category.value },
    })
  } catch (e: any) {
    error.value = e?.data?.message || e?.data?.errors?.[0]?.message || t('onb_err_update')
  } finally {
    inFlight = false
  }
}

watchDebounced(
  [nodeName, category],
  () => {
    if (!slug.value) return
    if (!createdNodeId.value) createNode()
    else patchNode()
  },
  { debounce: 400 }
)

function startPolling(nodeId: string) {
  polling.value = true
  pollHandle = setInterval(async () => {
    try {
      const api = useApi()
      const { node } = await api<{ node: { status: string } }>(`/nodes/${nodeId}`)
      if (node.status !== 'pending') {
        enrolled.value = true
        stopPolling()
        await store.fetchNodes()
        emit('created', nodeId)
        emit('close')
      }
    } catch { /* ignore transient errors */ }
  }, 3000)
}

function stopPolling() {
  polling.value = false
  if (pollHandle) {
    clearInterval(pollHandle)
    pollHandle = null
  }
}

async function regenerateToken() {
  if (!createdNodeId.value || regenerating.value) return
  regenerating.value = true
  error.value = null
  try {
    const api = useApi()
    const res = await api<{ enrollToken: string; expiresAt: string }>(
      `/nodes/${createdNodeId.value}/enroll-token`,
      { method: 'POST' }
    )
    enrollToken.value    = res.enrollToken
    tokenExpiresAt.value = res.expiresAt
    expired.value        = false
    startPolling(createdNodeId.value)
  } catch (e: any) {
    error.value = e?.data?.message || t('onb_err_create')
  } finally {
    regenerating.value = false
  }
}

const installCmd = computed(() => {
  if (!enrollToken.value) return null
  return [
    'curl -sSL https://get.umbravpn.io | bash -s -- \\',
    `  --name=${slug.value} \\`,
    `  --category=${category.value} \\`,
    `  --token=${enrollToken.value}`,
  ].join('\n')
})

function copyCmd() {
  if (!installCmd.value) return
  navigator.clipboard.writeText(installCmd.value)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}

async function handleClose() {
  stopPolling()
  if (createdNodeId.value && !enrolled.value) {
    try {
      const api = useApi()
      await api(`/nodes/${createdNodeId.value}`, { method: 'DELETE' })
    } catch { /* silent */ }
  }
  emit('close')
}

onUnmounted(() => {
  stopPolling()
  if (tickHandle) {
    clearInterval(tickHandle)
    tickHandle = null
  }
  window.removeEventListener('beforeunload', onBeforeUnload)
})
</script>

<template>
  <div class="modal-overlay" @click.self="handleClose">
    <div class="modal add-node-modal">

      <div class="modal-header">
        <div>
          <div class="modal-title">{{ t('addnode_title') }}</div>
          <div class="modal-sub">{{ t('addnode_sub') }}</div>
        </div>
        <button class="close-btn" @click="handleClose"><UIcon name="i-lucide-x" style="width:12px;height:12px" /></button>
      </div>

      <div class="modal-body">

        <div class="form-group">
          <label class="form-label">{{ t('addnode_name') }}</label>
          <input v-model="nodeName" class="form-input" type="text" :placeholder="t('addnode_name_ph')" autofocus />
        </div>

        <div class="form-group">
          <label class="form-label">{{ t('addnode_cat') }}</label>
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
          <template v-if="enrollToken">
            <!-- Token expiré -->
            <div v-if="expired" class="token-expired-banner">
              <div class="token-expired-icon">
                <UIcon name="i-lucide-clock-alert" style="width:14px;height:14px" />
              </div>
              <div class="token-expired-body">
                <div class="token-expired-title">{{ t('addnode_expired_title') }}</div>
                <div class="token-expired-desc">{{ t('addnode_expired_desc') }}</div>
              </div>
              <button class="btn-regen" :disabled="regenerating" @click="regenerateToken">
                <UIcon v-if="!regenerating" name="i-lucide-rotate-ccw" style="width:10px;height:10px" />
                <UIcon v-else name="i-lucide-loader-circle" class="spin" style="width:10px;height:10px" />
                {{ regenerating ? t('addnode_regen_loading') : t('addnode_regen') }}
              </button>
            </div>

            <!-- Commande d'installation -->
            <template v-else>
              <div class="cmd-block">
                <button class="cmd-copy" @click="copyCmd">
                  <template v-if="copied"><UIcon name="i-lucide-check" style="width:10px;height:10px" /> {{ t('onb_cmd_copied') }}</template>
                  <template v-else>{{ t('onb_cmd_copy') }}</template>
                </button>
                <div class="cmd-scroll">
<pre class="cmd-pre"><span class="cmd-comment">{{ t('onb_cmd_comment') }}</span>
curl -sSL https://get.umbravpn.io | bash -s -- \
  --name=<span class="cmd-accent">{{ slug }}</span> \
  --category=<span class="cmd-accent3">{{ category }}</span> \
  --token=<span class="cmd-accent2">{{ enrollToken }}</span></pre>
                </div>
              </div>
              <div class="waiting-indicator">
                <div class="pulse-dot" />
                <span>{{ t('onb_waiting') }}</span>
              </div>
              <div class="platform-info">
                {{ t('addnode_platform_with') }} <strong>{{ tokenExpiresLabel }}</strong>
              </div>
            </template>
          </template>

          <!-- Erreur / génération -->
          <div v-else-if="error" class="error-msg">{{ error }}</div>
          <div v-else class="cmd-placeholder">{{ t('onb_cmd_generating') }}</div>
        </template>
        <div v-else class="cmd-placeholder">{{ t('onb_cmd_placeholder') }}</div>

      </div>

      <div class="modal-footer">
        <button class="btn-ghost-sm" @click="handleClose">{{ t('common_close') }}</button>
      </div>

    </div>
  </div>
</template>
