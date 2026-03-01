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

function copy(token: string) {
  navigator.clipboard.writeText(token)
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
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style="margin-right: 6px">
          <path d="M8 2v12M2 8h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
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
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <circle cx="5.5" cy="5.5" r="3" stroke="currentColor" stroke-width="1.4"/>
              <line x1="7.5" y1="7.5" x2="14" y2="14" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
              <line x1="11.5" y1="12" x2="13" y2="10.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
            </svg>
          </div>
          <div>
            <div class="key-name">{{ key.name }}</div>
            <div class="key-created">créée {{ key.created }}</div>
          </div>
        </div>

        <div class="token-cell">
          <span class="token-val">{{ key.revealed ? key.token : key.tokenMasked }}</span>
          <button class="icon-btn" :title="key.revealed ? 'Masquer' : 'Révéler'" @click="key.revealed = !key.revealed">
            <svg v-if="!key.revealed" width="11" height="11" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="3" stroke="currentColor" stroke-width="1.4"/>
              <path d="M1 8s3-5 7-5 7 5 7 5-3 5-7 5-7-5-7-5z" stroke="currentColor" stroke-width="1.4"/>
            </svg>
            <svg v-else width="11" height="11" viewBox="0 0 16 16" fill="none">
              <path d="M2 2l12 12M6.5 6.7A3 3 0 009.3 9.5M4.2 4.3C2.6 5.4 1 8 1 8s3 5 7 5c1.4 0 2.7-.4 3.8-1.2M6.5 3.1C7 3 7.5 3 8 3c4 0 7 5 7 5s-.8 1.4-2 2.7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
            </svg>
          </button>
          <button class="icon-btn" title="Copier" @click="copy(key.token)">
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
              <rect x="5" y="5" width="9" height="9" rx="1.5" stroke="currentColor" stroke-width="1.4"/>
              <path d="M4 11H3a1 1 0 01-1-1V3a1 1 0 011-1h7a1 1 0 011 1v1" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
            </svg>
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
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
              <path d="M2 4h12M6 4V2h4v2M5 4v9a1 1 0 001 1h4a1 1 0 001-1V4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
            </svg>
            Supprimer
          </button>
        </div>
      </div>

      <div v-if="keys.length === 0" class="empty">Aucune clé API</div>
    </div>

    <div class="info-box">
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.4"/>
        <line x1="8" y1="7" x2="8" y2="11" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
        <circle cx="8" cy="5" r=".8" fill="currentColor"/>
      </svg>
      <span>Les clés API permettent d'accéder à l'API UMBRA depuis vos scripts et applications. Gardez-les secrètes — elles ont les mêmes droits que votre compte.</span>
    </div>

    <!-- Create modal -->
    <div v-if="showCreate" class="modal-overlay" @click.self="showCreate = false">
      <div class="modal">
        <div class="modal-header">
          <div class="modal-title">Nouvelle clé API</div>
          <button class="close-btn" @click="showCreate = false">✕</button>
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
