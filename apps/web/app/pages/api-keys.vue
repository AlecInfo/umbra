<script setup lang="ts">
definePageMeta({ layout: 'default' })

const { t } = useT()

interface ApiKey {
  id:          string
  name:        string
  tokenMasked: string
  token:       string | null  // only set right after creation
  scopes:      string[]
  createdAt:   string
  lastUsedAt:  string | null
  expiresAt:   string | null
  revokedAt:   string | null
  status:      'active' | 'revoked'
  revealed:    boolean
}

const keys    = ref<ApiKey[]>([])
const loading = ref(false)

function fmtDate(iso: string | null): string {
  if (!iso) return t('common_dash')
  return new Date(iso).toLocaleDateString(t('date_locale'), { day: 'numeric', month: 'short', year: 'numeric' })
}

function expiringSoon(iso: string | null): boolean {
  if (!iso) return false
  return new Date(iso).getTime() - Date.now() < 7 * 86400_000
}

async function fetchKeys() {
  loading.value = true
  try {
    const api = useApi()
    const res = await api<{ data: any[] }>('/api-keys')
    keys.value = res.data.map((k) => ({ ...k, token: null, revealed: false }))
  } finally {
    loading.value = false
  }
}

onMounted(fetchKeys)

const statusLabel = computed<Record<string, string>>(() => ({
  active:  t('apikeys_status_active'),
  revoked: t('apikeys_status_revoked'),
}))

const showCreate = ref(false)
const newKey     = ref({ name: '', scopes: ['read'] as string[], expiration: '90d' })

const allScopes   = ['read', 'write', 'nodes', 'connections', 'alerts', 'admin']
const expirations = computed(() => [
  { value: '30d',   label: t('apikeys_exp_30')    },
  { value: '90d',   label: t('apikeys_exp_90')    },
  { value: '365d',  label: t('apikeys_exp_1y')    },
  { value: 'never', label: t('apikeys_exp_never') },
])

const subLabel = computed(() => {
  const n = keys.value.length
  return t(n > 1 ? 'apikeys_sub_many' : 'apikeys_sub_one', { n })
})

const copiedId = ref<string | null>(null)
function copy(id: string, token: string) {
  navigator.clipboard.writeText(token)
  copiedId.value = id
  setTimeout(() => copiedId.value = null, 2000)
}

async function revoke(id: string) {
  const api = useApi()
  const res = await api<{ data: any }>(`/api-keys/${id}/revoke`, { method: 'PATCH' })
  const idx = keys.value.findIndex(k => k.id === id)
  if (idx >= 0) keys.value[idx] = { ...keys.value[idx]!, ...res.data, token: null, revealed: false }
}

async function deleteKey(id: string) {
  const api = useApi()
  await api(`/api-keys/${id}`, { method: 'DELETE' })
  keys.value = keys.value.filter(k => k.id !== id)
}

const creating = ref(false)
async function createKey() {
  if (!newKey.value.name || creating.value) return
  creating.value = true
  try {
    const api     = useApi()
    let expiresAt: string | undefined
    if (newKey.value.expiration !== 'never') {
      const days = parseInt(newKey.value.expiration)
      expiresAt  = new Date(Date.now() + days * 86400_000).toISOString()
    }
    const res = await api<{ data: any }>('/api-keys', {
      method: 'POST',
      body:   { name: newKey.value.name, scopes: newKey.value.scopes, expiresAt },
    })
    keys.value.unshift({ ...res.data, revealed: true })
    showCreate.value = false
    newKey.value     = { name: '', scopes: ['read'], expiration: '90d' }
  } finally {
    creating.value = false
  }
}
</script>

<template>
  <div class="apikeys-page">

    <div class="page-header">
      <div>
        <div class="page-title">{{ t('apikeys_title') }}</div>
        <div class="page-sub">{{ subLabel }}</div>
      </div>
      <button class="btn-primary" @click="showCreate = true">
        <UIcon name="i-lucide-plus" style="width:12px;height:12px;margin-right:6px" />
        {{ t('apikeys_new') }}
      </button>
    </div>

    <div v-if="loading" class="empty">{{ t('common_loading') }}</div>

    <div v-else class="keys-table">
      <div class="t-head">
        <span>{{ t('apikeys_th_name') }}</span>
        <span>{{ t('apikeys_th_key') }}</span>
        <span>{{ t('apikeys_th_perms') }}</span>
        <span>{{ t('apikeys_th_lastused') }}</span>
        <span>{{ t('apikeys_th_expires') }}</span>
        <span>{{ t('apikeys_th_status') }}</span>
        <span></span>
      </div>

      <div v-for="key in keys" :key="key.id" class="key-row" :class="{ revoked: key.status === 'revoked' }">
        <div class="key-name-cell">
          <div class="key-icon">
            <UIcon name="i-lucide-key" style="width:12px;height:12px" />
          </div>
          <div>
            <div class="key-name">{{ key.name }}</div>
            <div class="key-created">{{ t('apikeys_created', { when: fmtDate(key.createdAt) }) }}</div>
          </div>
        </div>

        <div class="token-cell" :class="{ 'token-cell-revealed': key.revealed }">
          <span class="token-val">{{ key.revealed && key.token ? key.token : key.tokenMasked }}</span>
          <button class="icon-btn" :title="key.revealed ? t('apikeys_hide') : t('apikeys_reveal')" @click="key.revealed = !key.revealed">
            <UIcon v-if="key.revealed"  name="i-lucide-eye"     style="width:11px;height:11px" />
            <UIcon v-else               name="i-lucide-eye-off" style="width:11px;height:11px" />
          </button>
          <button
            v-if="key.token || key.revealed"
            class="icon-btn"
            :title="copiedId === key.id ? t('apikeys_copied') : t('apikeys_copy')"
            @click="copy(key.id, key.token ?? key.tokenMasked)"
          >
            <UIcon v-if="copiedId === key.id" name="i-lucide-check" style="width:11px;height:11px;color:var(--accent)" />
            <UIcon v-else                      name="i-lucide-copy"  style="width:11px;height:11px" />
          </button>
        </div>

        <div class="perm-cell">
          <span v-for="s in key.scopes" :key="s" class="perm-badge">{{ s }}</span>
        </div>

        <span class="cell-mono">{{ fmtDate(key.lastUsedAt) }}</span>
        <span class="cell-mono" :class="{ 'text-warn': expiringSoon(key.expiresAt) }">{{ fmtDate(key.expiresAt) }}</span>

        <span class="status-badge" :class="`s-${key.status}`">
          <span class="sdot" />
          {{ statusLabel[key.status] }}
        </span>

        <div class="row-actions">
          <button v-if="key.status === 'active'" class="action-btn-sm danger" @click="revoke(key.id)">{{ t('apikeys_revoke') }}</button>
          <button v-else class="action-btn-sm delete" @click="deleteKey(key.id)">
            <UIcon name="i-lucide-trash-2" style="width:11px;height:11px" />
            {{ t('apikeys_delete') }}
          </button>
        </div>
      </div>

      <div v-if="keys.length === 0" class="empty">{{ t('apikeys_empty') }}</div>
    </div>

    <div class="info-box">
      <UIcon name="i-lucide-info" style="width:13px;height:13px" />
      <span>{{ t('apikeys_info') }}</span>
    </div>

    <!-- Create modal -->
    <div v-if="showCreate" class="modal-overlay" @click.self="showCreate = false">
      <div class="modal">
        <div class="modal-header">
          <div class="modal-title">{{ t('apikeys_modal_title') }}</div>
          <button class="close-btn" @click="showCreate = false"><UIcon name="i-lucide-x" style="width:12px;height:12px" /></button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">{{ t('apikeys_modal_name') }}</label>
            <input v-model="newKey.name" class="form-input" :placeholder="t('apikeys_modal_name_ph')" />
          </div>
          <div class="form-group">
            <label class="form-label">{{ t('apikeys_modal_perms') }}</label>
            <div class="perm-grid">
              <label v-for="s in allScopes" :key="s" class="perm-opt">
                <input type="checkbox" :value="s" v-model="newKey.scopes" />
                <span>{{ s }}</span>
              </label>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">{{ t('apikeys_modal_exp') }}</label>
            <div class="exp-group">
              <button
                v-for="e in expirations"
                :key="e.value"
                class="exp-btn"
                :class="{ active: newKey.expiration === e.value }"
                @click="newKey.expiration = e.value"
              >
                {{ e.label }}
              </button>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-ghost" @click="showCreate = false">{{ t('common_cancel') }}</button>
          <button class="btn-primary" :disabled="!newKey.name || creating" @click="createKey">{{ t('apikeys_create_btn') }}</button>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.apikeys-page { display: flex; flex-direction: column; }
</style>
