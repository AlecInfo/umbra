<script setup lang="ts">
import type { OrgMember, OrgRole } from '~/types/settings'

definePageMeta({ layout: 'default' })

const colorMode = useColorMode()
const lang       = ref('fr')
const twofa      = ref(false)
const autoUpdate = ref(true)
const heartbeat  = ref('30s')

const themes     = [{ value: 'dark', label: 'Dark' }, { value: 'light', label: 'Light' }]
const langs      = [{ value: 'fr', label: 'Français' }, { value: 'en', label: 'English' }]
const heartbeats = [{ value: '15s', label: '15s' }, { value: '30s', label: '30s' }, { value: '60s', label: '1min' }, { value: '300s', label: '5min' }]
const roles: { value: OrgRole; label: string }[] = [{ value: 'member', label: 'Membre' }, { value: 'admin', label: 'Admin' }]

const notifications = ref([
  { key: 'crit',    label: 'Alertes critiques',       sub: 'Email immédiat pour chaque alerte critique',         enabled: true  },
  { key: 'warn',    label: 'Alertes warning',          sub: 'Email pour les avertissements système',              enabled: true  },
  { key: 'offline', label: 'Noeud hors ligne',         sub: 'Notification si un noeud devient injoignable',       enabled: true  },
  { key: 'weekly',  label: 'Résumé hebdomadaire',      sub: 'Rapport récapitulatif chaque lundi matin',           enabled: false },
  { key: 'update',  label: 'Mises à jour disponibles', sub: "Notification lors de nouvelles versions de l'agent", enabled: false },
])

const showInvite  = ref(false)
const inviteEmail = ref('')
const inviteRole  = ref<OrgRole>('member')

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
</script>

<template>
  <div class="settings-page">

    <div class="page-header">
      <div>
        <div class="page-title">Paramètres</div>
        <div class="page-sub">Préférences et configuration du compte</div>
      </div>
    </div>

    <div class="settings-wrap">

      <nav class="settings-nav">
        <a href="#apparence">Apparence</a>
        <a href="#compte">Compte</a>
        <a href="#notifications">Notifications</a>
        <a href="#securite">Sécurité</a>
        <a href="#equipe">Équipe</a>
        <a href="#agent">Agent & réseau</a>
        <a href="#danger">Zone de danger</a>
      </nav>

      <div class="settings-content">

        <!-- Apparence -->
        <div id="apparence" class="card">
          <div class="card-header"><div class="card-title">Apparence</div></div>
          <div class="card-body">
            <SettingRow label="Thème" sub="Couleurs de l'interface">
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
            </SettingRow>
            <SettingRow label="Langue" sub="Langue de l'interface">
              <SegmentedControl v-model="lang" :options="langs" />
            </SettingRow>
          </div>
        </div>

        <!-- Compte -->
        <div id="compte" class="card">
          <div class="card-header">
            <div class="card-title">Compte</div>
            <span class="plan-badge">Free</span>
          </div>
          <div class="card-body">
            <SettingRow label="Email" sub="alecptt@example.com">
              <button class="btn-ghost-sm">Modifier</button>
            </SettingRow>
            <SettingRow label="Mot de passe" sub="Dernière modification il y a 3 mois">
              <button class="btn-ghost-sm">Modifier</button>
            </SettingRow>
            <SettingRow label="Plan" sub="Free — 5 noeuds max, 3 utilisateurs">
              <button class="btn-accent-sm">Passer à Pro →</button>
            </SettingRow>
          </div>
        </div>

        <!-- Notifications -->
        <div id="notifications" class="card">
          <div class="card-header"><div class="card-title">Notifications</div></div>
          <div class="card-body">
            <SettingRow
              v-for="notif in notifications"
              :key="notif.key"
              :label="notif.label"
              :sub="notif.sub"
            >
              <Toggle v-model="notif.enabled" />
            </SettingRow>
          </div>
        </div>

        <!-- Sécurité -->
        <div id="securite" class="card">
          <div class="card-header"><div class="card-title">Sécurité</div></div>
          <div class="card-body">
            <SettingRow label="Authentification 2FA" sub="TOTP via application (Aegis, Bitwarden…)">
              <Toggle v-model="twofa" />
            </SettingRow>
            <SettingRow label="Sessions actives" sub="2 sessions — MacBook Pro, iPhone 15">
              <button class="btn-ghost-sm">Gérer</button>
            </SettingRow>
            <SettingRow label="Logs de connexion" sub="Historique des accès au compte">
              <button class="btn-ghost-sm">Voir →</button>
            </SettingRow>
          </div>
        </div>

        <!-- Équipe -->
        <div id="equipe" class="card">
          <div class="card-header">
            <div class="card-title">Équipe</div>
            <span class="member-count">{{ orgMembers.length }} membres</span>
          </div>
          <div class="card-body">

            <SettingRow label="Inviter un membre" sub="Accès à tous les noeuds de l'organisation">
              <button class="btn-ghost-sm" @click="showInvite = !showInvite">+ Inviter</button>
            </SettingRow>

            <div v-if="showInvite" class="invite-form">
              <div class="invite-row">
                <input
                  v-model="inviteEmail"
                  class="form-input"
                  placeholder="email@example.com"
                  type="email"
                  @keyup.enter="sendInvite"
                />
                <SegmentedControl v-model="inviteRole" :options="roles" />
                <button class="btn-accent-sm" :disabled="!inviteEmail" @click="sendInvite">Envoyer</button>
              </div>
              <div class="role-hint">
                <span v-if="inviteRole === 'member'">Lecture + connexion aux noeuds partagés</span>
                <span v-else-if="inviteRole === 'admin'">Peut gérer les membres et les noeuds</span>
              </div>
            </div>

            <div class="org-members">
              <OrgMemberRow
                v-for="m in orgMembers"
                :key="m.id"
                :member="m"
                :is-me="m.id === 'me'"
                :roles="roles"
                @update:role="r => m.role = r"
                @remove="orgMembers = orgMembers.filter(x => x.id !== m.id)"
              />
            </div>

          </div>
        </div>

        <!-- Agent & réseau -->
        <div id="agent" class="card">
          <div class="card-header"><div class="card-title">Agent & réseau</div></div>
          <div class="card-body">
            <SettingRow label="Intervalle heartbeat" sub="Fréquence de rapport des agents">
              <SegmentedControl v-model="heartbeat" :options="heartbeats" />
            </SettingRow>
            <SettingRow label="Auto-update des agents" sub="Mise à jour automatique vers la dernière version stable">
              <Toggle v-model="autoUpdate" />
            </SettingRow>
            <SettingRow label="Subnet VPN par défaut" sub="Plage d'adresses IP du réseau UMBRA">
              <span class="mono-val">100.64.0.0/10</span>
            </SettingRow>
          </div>
        </div>

        <!-- Zone de danger -->
        <div id="danger" class="card card-danger">
          <div class="card-header"><div class="card-title danger-title">Zone de danger</div></div>
          <div class="card-body">
            <SettingRow label="Supprimer tous les noeuds" sub="Révoque tous les agents et supprime les données associées">
              <button class="btn-danger-sm">Supprimer</button>
            </SettingRow>
            <SettingRow label="Supprimer le compte" sub="Action irréversible — toutes les données seront perdues">
              <button class="btn-danger-sm">Supprimer</button>
            </SettingRow>
          </div>
        </div>

      </div>
    </div>

  </div>
</template>

<style scoped>
.settings-page { display: flex; flex-direction: column; }
</style>
