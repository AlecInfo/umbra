<script setup lang="ts">
definePageMeta({ layout: 'default' })

interface ApiKey {
  id:          string
  name:        string
  token:       string
  tokenMasked: string
  permissions: string[]
  created:     string
  lastUsed:    string
  expires:     string
  expiringSoon: boolean
  status:      'active' | 'revoked'
  revealed:    boolean
}

const keys = ref<ApiKey[]>([
  {
    id: '1', name: 'Script backup',
    token: 'umbra_sk_a4f2e9c3d1b07f5e2a8c6d9b3e1f4a7c',
    tokenMasked: 'umbra_sk_a4f2...f4a7c',
    permissions: ['read', 'nodes'],
    created: 'il y a 3 mois', lastUsed: 'il y a 2h',
    expires: 'dans 82j', expiringSoon: false,
    status: 'active', revealed: false,
  },
  {
    id: '2', name: 'CI/CD pipeline',
    token: 'umbra_sk_b7d3f1a9e6c2b4d8a5f7e3c1d9b2e6f8',
    tokenMasked: 'umbra_sk_b7d3...e6f8',
    permissions: ['read', 'write', 'nodes', 'alerts'],
    created: 'il y a 1 mois', lastUsed: 'il y a 1j',
    expires: 'dans 6 mois', expiringSoon: false,
    status: 'active', revealed: false,
  },
  {
    id: '3', name: 'Test local',
    token: 'umbra_sk_c1e5b9d3f7a2e4c8b6d1f3a9e7c5b2d4',
    tokenMasked: 'umbra_sk_c1e5...b2d4',
    permissions: ['read'],
    created: 'il y a 6 mois', lastUsed: 'il y a 3 mois',
    expires: 'expirée', expiringSoon: false,
    status: 'revoked', revealed: false,
  },
])

const statusLabel: Record<string, string> = {
  active:  'Active',
  revoked: 'Révoquée',
}

const showCreate = ref(false)
const newKey = ref({ name: '', permissions: ['read'] as string[], expiration: '90j' })

const allPermissions = ['read', 'write', 'nodes', 'connections', 'alerts', 'admin']
const expirations = [
  { value: '30j',   label: '30 jours' },
  { value: '90j',   label: '90 jours' },
  { value: '1an',   label: '1 an'     },
  { value: 'never', label: 'Jamais'   },
]

const copiedId = ref<string | null>(null)
function copy(id: string, token: string) {
  navigator.clipboard.writeText(token)
  copiedId.value = id
  setTimeout(() => copiedId.value = null, 2000)
}

function revoke(id: string) {
  const key = keys.value.find(k => k.id === id)
  if (key) key.status = 'revoked'
}

function deleteKey(id: string) {
  keys.value = keys.value.filter(k => k.id !== id)
}

function createKey() {
  keys.value.unshift({
    id: Date.now().toString(),
    name: newKey.value.name,
    token: `umbra_sk_${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`,
    tokenMasked: 'umbra_sk_xxxx...xxxx',
    permissions: [...newKey.value.permissions],
    created: "à l'instant",
    lastUsed: '—',
    expires: newKey.value.expiration === 'never' ? 'jamais' : `dans ${newKey.value.expiration}`,
    expiringSoon: false,
    status: 'active',
    revealed: true,
  })
  showCreate.value = false
  newKey.value = { name: '', permissions: ['read'], expiration: '90j' }
}
</script>

<template>
  <div class="apikeys-page">

    <div class="page-header">
      <div>
        <div class="page-title">Clés API</div>
        <div class="page-sub">{{ keys.length }} clé{{ keys.length > 1 ? 's' : '' }} · accès programmatique à UMBRA</div>
      </div>
      <button class="btn-primary" @click="showCreate = true">
        <UIcon name="i-lucide-plus" style="width:12px;height:12px;margin-right:6px" />
        Nouvelle clé
      </button>
    </div>

    <div class="keys-table">
      <div class="t-head">
        <span>Nom</span>
        <span>Clé</span>
        <span>Permissions</span>
        <span>Dernière utilisation</span>
        <span>Expire</span>
        <span>Statut</span>
        <span></span>
      </div>

      <div v-for="key in keys" :key="key.id" class="key-row" :class="{ revoked: key.status === 'revoked' }">
        <div class="key-name-cell">
          <div class="key-icon">
            <UIcon name="i-lucide-key" style="width:12px;height:12px" />
          </div>
          <div>
            <div class="key-name">{{ key.name }}</div>
            <div class="key-created">créée {{ key.created }}</div>
          </div>
        </div>

        <div class="token-cell" :class="{ 'token-cell-revealed': key.revealed }">
          <span class="token-val">{{ key.revealed ? key.token : key.tokenMasked }}</span>
          <button class="icon-btn" :title="key.revealed ? 'Masquer' : 'Révéler'" @click="key.revealed = !key.revealed">
            <UIcon v-if="key.revealed"  name="i-lucide-eye"     style="width:11px;height:11px" />
            <UIcon v-else               name="i-lucide-eye-off" style="width:11px;height:11px" />
          </button>
          <button class="icon-btn" :title="copiedId === key.id ? 'Copié !' : 'Copier'" @click="copy(key.id, key.token)">
            <UIcon v-if="copiedId === key.id" name="i-lucide-check" style="width:11px;height:11px;color:var(--accent)" />
            <UIcon v-else                      name="i-lucide-copy"  style="width:11px;height:11px" />
          </button>
        </div>

        <div class="perm-cell">
          <span v-for="p in key.permissions" :key="p" class="perm-badge">{{ p }}</span>
        </div>

        <span class="cell-mono">{{ key.lastUsed }}</span>
        <span class="cell-mono" :class="{ 'text-warn': key.expiringSoon }">{{ key.expires }}</span>

        <span class="status-badge" :class="`s-${key.status}`">
          <span class="sdot" />
          {{ statusLabel[key.status] }}
        </span>

        <div class="row-actions">
          <button v-if="key.status === 'active'" class="action-btn-sm danger" @click="revoke(key.id)">Révoquer</button>
          <button v-else class="action-btn-sm delete" @click="deleteKey(key.id)">
            <UIcon name="i-lucide-trash-2" style="width:11px;height:11px" />
            Supprimer
          </button>
        </div>
      </div>

      <div v-if="keys.length === 0" class="empty">Aucune clé API</div>
    </div>

    <div class="info-box">
      <UIcon name="i-lucide-info" style="width:13px;height:13px" />
      <span>Les clés API permettent d'accéder à l'API UMBRA depuis vos scripts et applications. Gardez-les secrètes — elles ont les mêmes droits que votre compte.</span>
    </div>

    <!-- Create modal -->
    <div v-if="showCreate" class="modal-overlay" @click.self="showCreate = false">
      <div class="modal">
        <div class="modal-header">
          <div class="modal-title">Nouvelle clé API</div>
          <button class="close-btn" @click="showCreate = false"><UIcon name="i-lucide-x" style="width:12px;height:12px" /></button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">Nom</label>
            <input v-model="newKey.name" class="form-input" placeholder="ex: script-backup, CI/CD..." />
          </div>
          <div class="form-group">
            <label class="form-label">Permissions</label>
            <div class="perm-grid">
              <label v-for="p in allPermissions" :key="p" class="perm-opt">
                <input type="checkbox" :value="p" v-model="newKey.permissions" />
                <span>{{ p }}</span>
              </label>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Expiration</label>
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
          <button class="btn-ghost" @click="showCreate = false">Annuler</button>
          <button class="btn-primary" :disabled="!newKey.name" @click="createKey">Créer la clé</button>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.apikeys-page { display: flex; flex-direction: column; }
</style>
