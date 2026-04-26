<script setup lang="ts">
import { watchDebounced } from '@vueuse/core'
import { categoryIcons } from '~/composables/useCategoryIcons'
import { useAuthStore } from '~/stores/auth'
import { useNodesStore } from '~/stores/nodes'

definePageMeta({ layout: 'auth' })

const auth  = useAuthStore()
const store = useNodesStore()
const { t } = useT()
const { public: { apiBase } } = useRuntimeConfig()

const step     = ref(2)
const nodeName = ref('')
const category = ref<'sbc' | 'vps' | 'router' | 'nas' | 'desktop' | 'other'>('sbc')
const copied   = ref(false)

const createdNodeId  = ref<string | null>(null)
const enrollToken    = ref<string | null>(null)
const tokenExpiresAt = ref<string | null>(null)
const enrolledNode   = ref<{ id: string; name: string } | null>(null)
const error          = ref<string | null>(null)
const now            = ref(Date.now())

let pollHandle: ReturnType<typeof setInterval> | null = null
let tickHandle: ReturnType<typeof setInterval> | null = null
let inFlight = false

const categories = computed(() => [
  { value: 'sbc',     name: t('onb_cat_sbc'),     desc: t('onb_cat_sbc_d')     },
  { value: 'vps',     name: t('onb_cat_vps'),     desc: t('onb_cat_vps_d')     },
  { value: 'router',  name: t('onb_cat_router'),  desc: t('onb_cat_router_d')  },
  { value: 'nas',     name: t('onb_cat_nas'),     desc: t('onb_cat_nas_d')     },
  { value: 'desktop', name: t('onb_cat_desktop'), desc: t('onb_cat_desktop_d') },
  { value: 'other',   name: t('onb_cat_other'),   desc: t('onb_cat_other_d')   },
] as const)

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

    const enrollRes = await api<{ enrollToken: string; expiresAt: string }>(
      `/nodes/${node.id}/enroll-token`,
      { method: 'POST' },
    )
    enrollToken.value    = enrollRes.enrollToken
    tokenExpiresAt.value = enrollRes.expiresAt
    startPolling(node.id)
  } catch (e: any) {
    error.value = e?.data?.message || t('onb_err_create')
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
    error.value = e?.data?.message || t('onb_err_update')
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
  pollHandle = setInterval(async () => {
    try {
      const api = useApi()
      const { node } = await api<{ node: { status: string; name: string; id: string } }>(`/nodes/${nodeId}`)
      if (node.status !== 'pending') {
        enrolledNode.value = { id: node.id, name: node.name }
        stopPolling()
        await store.fetchNodes()
        step.value = 3
      }
    } catch { /* ignore transient errors */ }
  }, 3000)
}

function stopPolling() {
  if (pollHandle) {
    clearInterval(pollHandle)
    pollHandle = null
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
  setTimeout(() => copied.value = false, 2000)
}

function onBeforeUnload() {
  if (!createdNodeId.value || enrolledNode.value) return
  try {
    fetch(`${apiBase}/nodes/${createdNodeId.value}`, {
      method: 'DELETE',
      keepalive: true,
      headers: auth.token ? { Authorization: `Bearer ${auth.token}` } : undefined,
    })
  } catch { /* ignore */ }
}

async function skipOnboarding() {
  if (createdNodeId.value && !enrolledNode.value) {
    try {
      const api = useApi()
      await api(`/nodes/${createdNodeId.value}`, { method: 'DELETE' })
    } catch { /* ignore */ }
  }
  navigateTo('/')
}

function next() {
  if (step.value === 2) {
    // wait for enrollment, otherwise skip directly
    if (!enrolledNode.value) skipOnboarding()
    else step.value = 3
  } else {
    navigateTo('/')
  }
}

onMounted(() => {
  tickHandle = setInterval(() => { now.value = Date.now() }, 1000)
  window.addEventListener('beforeunload', onBeforeUnload)
})

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
  <div class="onboard-wrap">
    <div class="onboard-card">

      <div class="onboard-header">
        <div class="onboard-steps">
          <div class="step done">
            <div class="step-num"><UIcon name="i-lucide-check" style="width:10px;height:10px" /></div>
            <div class="step-label">{{ t('onb_step_account') }}</div>
          </div>
          <div class="step" :class="{ current: step === 2, done: step > 2 }">
            <div class="step-num"><UIcon v-if="step > 2" name="i-lucide-check" style="width:10px;height:10px" /><template v-else>2</template></div>
            <div class="step-label">{{ t('onb_step_node') }}</div>
          </div>
          <div class="step" :class="{ current: step === 3 }">
            <div class="step-num">3</div>
            <div class="step-label">{{ t('onb_step_connect') }}</div>
          </div>
        </div>

        <template v-if="step === 2">
          <div class="onboard-title">{{ t('onb_title_2') }}</div>
          <div class="onboard-sub">{{ t('onb_sub_2') }}</div>
        </template>
        <template v-else>
          <div class="onboard-title">{{ t('onb_title_3') }}</div>
          <div class="onboard-sub">{{ t('onb_sub_3') }}</div>
        </template>
      </div>

      <!-- Step 2 -->
      <div v-if="step === 2" class="onboard-body">
        <div class="form-group">
          <label class="form-label">{{ t('onb_node_name') }}</label>
          <input v-model="nodeName" class="form-input" type="text" :placeholder="t('onb_node_name_ph')" />
        </div>

        <div class="form-group">
          <label class="form-label">{{ t('onb_node_cat') }}</label>
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
          <div v-if="enrollToken" class="cmd-block">
            <button class="cmd-copy" @click="copyCmd">
              <template v-if="copied"><UIcon name="i-lucide-check" style="width:10px;height:10px" /> {{ t('onb_cmd_copied') }}</template>
              <template v-else>{{ t('onb_cmd_copy') }}</template>
            </button>
            <span class="cmd-comment">{{ t('onb_cmd_comment') }}</span><br>
            curl -sSL https://get.umbravpn.io | bash -s -- \<br>
            &nbsp;&nbsp;--name=<span class="cmd-accent">{{ slug }}</span> \<br>
            &nbsp;&nbsp;--category=<span class="cmd-accent3">{{ category }}</span> \<br>
            &nbsp;&nbsp;--token=<span class="cmd-accent2" style="word-break:break-all">{{ enrollToken }}</span>
          </div>
          <div v-else-if="error" class="error-msg">{{ error }}</div>
          <div v-else class="cmd-placeholder">
            {{ t('onb_cmd_generating') }}
          </div>

          <div v-if="enrollToken" class="waiting-indicator">
            <div class="pulse-dot" />
            <span>{{ t('onb_waiting') }}</span>
          </div>
        </template>
        <div v-else class="cmd-placeholder">
          {{ t('onb_cmd_placeholder') }}
        </div>

        <div v-if="tokenExpiresLabel" class="platform-info">
          {{ t('onb_platform_with') }} <strong>{{ tokenExpiresLabel }}</strong>
        </div>
        <div v-else class="platform-info">
          {{ t('onb_platform_without') }}
        </div>
      </div>

      <!-- Step 3 -->
      <div v-else class="onboard-body">
        <div class="success-banner">
          <UIcon name="i-lucide-circle-check" style="width:16px;height:16px" />
          <strong>{{ enrolledNode?.name }}</strong> {{ t('onb_success') }}
        </div>

        <div class="next-actions-lbl">{{ t('onb_next_q') }}</div>

        <div class="next-actions">
          <div class="next-action" @click="navigateTo('/')">
            <div class="next-action-icon icon-connect">
              <UIcon name="i-lucide-plus" style="width:14px;height:14px" />
            </div>
            <div class="next-action-info">
              <div class="next-action-title">{{ t('onb_next_connect') }}</div>
              <div class="next-action-sub">{{ t('onb_next_connect_d') }}</div>
            </div>
            <UIcon name="i-lucide-chevron-right" class="next-chevron" style="width:12px;height:12px" />
          </div>

          <div class="next-action" @click="step = 2; nodeName = ''; category = 'sbc'; createdNodeId = null; enrollToken = null; tokenExpiresAt = null; enrolledNode = null">
            <div class="next-action-icon icon-add">
              <UIcon name="i-lucide-plus" style="width:14px;height:14px" />
            </div>
            <div class="next-action-info">
              <div class="next-action-title">{{ t('onb_next_add') }}</div>
              <div class="next-action-sub">{{ t('onb_next_add_d') }}</div>
            </div>
            <UIcon name="i-lucide-chevron-right" class="next-chevron" style="width:12px;height:12px" />
          </div>

          <div class="next-action" @click="navigateTo('/settings')">
            <div class="next-action-icon icon-share">
              <UIcon name="i-lucide-share-2" style="width:14px;height:14px" />
            </div>
            <div class="next-action-info">
              <div class="next-action-title">{{ t('onb_next_invite') }}</div>
              <div class="next-action-sub">{{ t('onb_next_invite_d') }}</div>
            </div>
            <UIcon name="i-lucide-chevron-right" class="next-chevron" style="width:12px;height:12px" />
          </div>

          <div class="next-action" @click="navigateTo('/')">
            <div class="next-action-icon icon-dashboard">
              <UIcon name="i-lucide-layout-dashboard" style="width:14px;height:14px" />
            </div>
            <div class="next-action-info">
              <div class="next-action-title">{{ t('onb_next_dash') }}</div>
              <div class="next-action-sub">{{ t('onb_next_dash_d') }}</div>
            </div>
            <UIcon name="i-lucide-chevron-right" class="next-chevron" style="width:12px;height:12px" />
          </div>
        </div>
      </div>

      <div class="onboard-footer">
        <button class="btn-ghost" @click="skipOnboarding">{{ t('onb_skip') }}</button>
        <button
          class="btn-primary"
          :disabled="step === 2 && !enrolledNode"
          @click="next"
        >
          {{ step === 2 ? t('onb_continue') : t('onb_go_dash') }}
        </button>
      </div>

    </div>
  </div>
</template>
