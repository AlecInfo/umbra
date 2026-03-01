<script setup lang="ts">
definePageMeta({ layout: 'default' })

const colorMode = useColorMode()
const lang       = ref('fr')
const twofa      = ref(false)
const autoUpdate = ref(true)
const heartbeat  = ref('30s')

const themes = [
  { value: 'dark',  label: 'Dark'  },
  { value: 'light', label: 'Light' },
]

const langs = [
  { value: 'fr', label: 'Français' },
  { value: 'en', label: 'English'  },
]

const heartbeats = [
  { value: '15s',  label: '15s'  },
  { value: '30s',  label: '30s'  },
  { value: '60s',  label: '1min' },
  { value: '300s', label: '5min' },
]

const notifications = ref([
  { key: 'crit',    label: 'Alertes critiques',        sub: 'Email immédiat pour chaque alerte critique',          enabled: true  },
  { key: 'warn',    label: 'Alertes warning',           sub: 'Email pour les avertissements système',               enabled: true  },
  { key: 'offline', label: 'Noeud hors ligne',          sub: 'Notification si un noeud devient injoignable',        enabled: true  },
  { key: 'weekly',  label: 'Résumé hebdomadaire',       sub: 'Rapport récapitulatif chaque lundi matin',            enabled: false },
  { key: 'update',  label: 'Mises à jour disponibles',  sub: "Notification lors de nouvelles versions de l'agent",  enabled: false },
])

type OrgRole = 'owner' | 'admin' | 'member'

interface OrgMember {
  id:     string
  name:   string
  email:  string
  avatar: string
  color:  string
  role:   OrgRole
  status: 'active' | 'pending'
}

const showInvite  = ref(false)
const inviteEmail = ref('')
const inviteRole  = ref<OrgRole>('member')

const roles = [
  { value: 'member', label: 'Membre' },
  { value: 'admin',  label: 'Admin'  },
]

const orgMembers = ref<OrgMember[]>([
  { id: 'me', name: 'alecptt', email: 'alecptt@example.com', avatar: 'A', color: 'linear-gradient(135deg,var(--accent2),var(--accent))', role: 'owner',  status: 'active'  },
  { id: '2',  name: 'marie',   email: 'marie@example.com',   avatar: 'M', color: 'linear-gradient(135deg,#ff6b6b,#ffa726)',              role: 'admin',  status: 'active'  },
  { id: '3',  name: 'thomas',  email: 'thomas@example.com',  avatar: 'T', color: 'linear-gradient(135deg,#4fa8ff,#7b6ef6)',              role: 'member', status: 'active'  },
  { id: '4',  name: 'sam',     email: 'sam@example.com',     avatar: 'S', color: 'var(--surface2)',                                      role: 'member', status: 'pending' },
])

function sendInvite() {
  if (!inviteEmail.value) return
  orgMembers.value.push({
    id:     Date.now().toString(),
    name:   inviteEmail.value.split('@')[0],
    email:  inviteEmail.value,
    avatar: inviteEmail.value[0].toUpperCase(),
    color:  'var(--surface2)',
    role:   inviteRole.value,
    status: 'pending',
  })
  inviteEmail.value = ''
  showInvite.value  = false
}

function removeMember(id: string) {
  orgMembers.value = orgMembers.value.filter(m => m.id !== id)
}
</script>

<template>
  <div class="settings-page">

    <div class="page-header">
      <div>
        <div class="page-title">Paramètres</div>
        <div class="page-sub">Préférences et configuration du compte</div>
      </div>
    </div>

    <div class="settings-layout">
      <div class="settings-col">

        <!-- Apparence -->
        <div class="card">
          <div class="card-header"><div class="card-title">Apparence</div></div>
          <div class="card-body">
            <div class="setting-row">
              <div class="setting-info">
                <div class="setting-lbl">Thème</div>
                <div class="setting-sub">Couleurs de l'interface</div>
              </div>
              <div class="theme-group">
                <button
                  v-for="t in themes"
                  :key="t.value"
                  class="theme-btn"
                  :class="{ active: colorMode.value === t.value }"
                  @click="colorMode.preference = t.value"
                >
                  <div class="theme-preview" :class="`preview-${t.value}`" />
                  {{ t.label }}
                </button>
              </div>
            </div>
            <div class="setting-row">
              <div class="setting-info">
                <div class="setting-lbl">Langue</div>
                <div class="setting-sub">Langue de l'interface</div>
              </div>
              <div class="seg-group">
                <button
                  v-for="l in langs"
                  :key="l.value"
                  class="seg-btn"
                  :class="{ active: lang === l.value }"
                  @click="lang = l.value"
                >{{ l.label }}</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Compte -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">Compte</div>
            <span class="plan-badge">Free</span>
          </div>
          <div class="card-body">
            <div class="setting-row">
              <div class="setting-info">
                <div class="setting-lbl">Email</div>
                <div class="setting-sub">alecptt@example.com</div>
              </div>
              <button class="btn-ghost-sm">Modifier</button>
            </div>
            <div class="setting-row">
              <div class="setting-info">
                <div class="setting-lbl">Mot de passe</div>
                <div class="setting-sub">Dernière modification il y a 3 mois</div>
              </div>
              <button class="btn-ghost-sm">Modifier</button>
            </div>
            <div class="setting-row">
              <div class="setting-info">
                <div class="setting-lbl">Plan</div>
                <div class="setting-sub">Free — 5 noeuds max, 3 utilisateurs</div>
              </div>
              <button class="btn-accent-sm">Passer à Pro →</button>
            </div>
          </div>
        </div>

        <!-- Notifications -->
        <div class="card">
          <div class="card-header"><div class="card-title">Notifications</div></div>
          <div class="card-body">
            <div v-for="notif in notifications" :key="notif.key" class="setting-row">
              <div class="setting-info">
                <div class="setting-lbl">{{ notif.label }}</div>
                <div class="setting-sub">{{ notif.sub }}</div>
              </div>
              <div class="toggle" :class="{ on: notif.enabled }" @click="notif.enabled = !notif.enabled">
                <div class="toggle-thumb" />
              </div>
            </div>
          </div>
        </div>

        <!-- Sécurité -->
        <div class="card">
          <div class="card-header"><div class="card-title">Sécurité</div></div>
          <div class="card-body">
            <div class="setting-row">
              <div class="setting-info">
                <div class="setting-lbl">Authentification 2FA</div>
                <div class="setting-sub">TOTP via application (Aegis, Bitwarden…)</div>
              </div>
              <div class="toggle" :class="{ on: twofa }" @click="twofa = !twofa">
                <div class="toggle-thumb" />
              </div>
            </div>
            <div class="setting-row">
              <div class="setting-info">
                <div class="setting-lbl">Sessions actives</div>
                <div class="setting-sub">2 sessions — MacBook Pro, iPhone 15</div>
              </div>
              <button class="btn-ghost-sm">Gérer</button>
            </div>
            <div class="setting-row">
              <div class="setting-info">
                <div class="setting-lbl">Logs de connexion</div>
                <div class="setting-sub">Historique des accès au compte</div>
              </div>
              <button class="btn-ghost-sm">Voir →</button>
            </div>
          </div>
        </div>

        <!-- Équipe -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">Équipe</div>
            <span class="member-count">{{ orgMembers.length }} membres</span>
          </div>
          <div class="card-body">

            <div class="setting-row">
              <div class="setting-info">
                <div class="setting-lbl">Inviter un membre</div>
                <div class="setting-sub">Accès à tous les noeuds de l'organisation</div>
              </div>
              <button class="btn-ghost-sm" @click="showInvite = !showInvite">+ Inviter</button>
            </div>

            <div v-if="showInvite" class="invite-form">
              <div class="invite-row">
                <input
                  v-model="inviteEmail"
                  class="form-input"
                  placeholder="email@example.com"
                  type="email"
                  style="flex: 1; width: auto"
                  @keyup.enter="sendInvite"
                />
                <div class="seg-group">
                  <button
                    v-for="r in roles"
                    :key="r.value"
                    class="seg-btn"
                    :class="{ active: inviteRole === r.value }"
                    @click="inviteRole = r.value as OrgRole"
                  >{{ r.label }}</button>
                </div>
                <button class="btn-accent-sm" :disabled="!inviteEmail" @click="sendInvite">Envoyer</button>
              </div>
              <div class="role-hint">
                <span v-if="inviteRole === 'member'">Lecture + connexion aux noeuds partagés</span>
                <span v-else-if="inviteRole === 'admin'">Peut gérer les membres et les noeuds</span>
              </div>
            </div>

            <div class="org-members">
              <div v-for="m in orgMembers" :key="m.id" class="org-member-row">
                <div class="member-avatar" :style="`background: ${m.color}`">{{ m.avatar }}</div>
                <div class="member-info">
                  <div class="member-name">
                    {{ m.name }}
                    <span v-if="m.id === 'me'" class="you-badge">vous</span>
                  </div>
                  <div class="member-email">{{ m.email }}</div>
                </div>
                <div v-if="m.status === 'pending'" class="pending-chip">⏳ En attente</div>
                <select
                  v-else-if="m.role !== 'owner'"
                  class="role-select"
                  :value="m.role"
                  @change="m.role = ($event.target as HTMLSelectElement).value as OrgRole"
                >
                  <option v-for="r in roles" :key="r.value" :value="r.value">{{ r.label }}</option>
                </select>
                <span v-else class="owner-badge">owner</span>
                <button v-if="m.id !== 'me' && m.role !== 'owner'" class="remove-btn" @click="removeMember(m.id)">✕</button>
                <div v-else class="remove-placeholder" />
              </div>
            </div>

          </div>
        </div>

        <!-- Agent & réseau -->
        <div class="card">
          <div class="card-header"><div class="card-title">Agent & réseau</div></div>
          <div class="card-body">
            <div class="setting-row">
              <div class="setting-info">
                <div class="setting-lbl">Intervalle heartbeat</div>
                <div class="setting-sub">Fréquence de rapport des agents</div>
              </div>
              <div class="seg-group">
                <button
                  v-for="h in heartbeats"
                  :key="h.value"
                  class="seg-btn"
                  :class="{ active: heartbeat === h.value }"
                  @click="heartbeat = h.value"
                >{{ h.label }}</button>
              </div>
            </div>
            <div class="setting-row">
              <div class="setting-info">
                <div class="setting-lbl">Auto-update des agents</div>
                <div class="setting-sub">Mise à jour automatique vers la dernière version stable</div>
              </div>
              <div class="toggle" :class="{ on: autoUpdate }" @click="autoUpdate = !autoUpdate">
                <div class="toggle-thumb" />
              </div>
            </div>
            <div class="setting-row">
              <div class="setting-info">
                <div class="setting-lbl">Subnet VPN par défaut</div>
                <div class="setting-sub">Plage d'adresses IP du réseau UMBRA</div>
              </div>
              <span class="mono-val">100.64.0.0/10</span>
            </div>
          </div>
        </div>

        <!-- Zone de danger -->
        <div class="card card-danger">
          <div class="card-header"><div class="card-title danger-title">Zone de danger</div></div>
          <div class="card-body">
            <div class="setting-row">
              <div class="setting-info">
                <div class="setting-lbl">Supprimer tous les noeuds</div>
                <div class="setting-sub">Révoque tous les agents et supprime les données associées</div>
              </div>
              <button class="btn-danger-sm">Supprimer</button>
            </div>
            <div class="setting-row">
              <div class="setting-info">
                <div class="setting-lbl">Supprimer le compte</div>
                <div class="setting-sub">Action irréversible — toutes les données seront perdues</div>
              </div>
              <button class="btn-danger-sm">Supprimer</button>
            </div>
          </div>
        </div>

      </div>
    </div>

  </div>
</template>

<style scoped>
.settings-page { display: flex; flex-direction: column; }
</style>
