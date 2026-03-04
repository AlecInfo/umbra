<script setup lang="ts">
import type { OrgMember, OrgRole } from '~/types/settings'

definePageMeta({ layout: 'default' })

const colorMode = useColorMode()
const lang       = ref('fr')
const autoUpdate = ref(true)
const heartbeat  = ref('30s')

// 2FA
const twofa       = ref(false)
const show2fa     = ref(false)
const twofa2Code  = ref('')
const twofaError  = ref(false)
// Fake TOTP secret for mock
const twofaSecret = 'JBSWY3DPEHPK3PXP'
const twofaQr     = computed(() =>
  `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(`otpauth://totp/UMBRA:alecptt%40example.com?secret=${twofaSecret}&issuer=UMBRA`)}`
)
function toggleTwofa(val: boolean) {
  if (val) { show2fa.value = true }
  else { twofa.value = false }
}
function confirm2fa() {
  if (twofa2Code.value.length === 6) {
    twofa.value = true; show2fa.value = false; twofa2Code.value = ''; twofaError.value = false
  } else { twofaError.value = true }
}
function cancel2fa() { show2fa.value = false; twofa2Code.value = ''; twofaError.value = false }

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
    name:   inviteEmail.value.split('@')[0] ?? inviteEmail.value,
    email:  inviteEmail.value,
    avatar: (inviteEmail.value[0] ?? '?').toUpperCase(),
    color:  'var(--surface2)',
    role:   inviteRole.value,
    status: 'pending',
  })
  inviteEmail.value = ''
  showInvite.value  = false
}

// Edit email modal
const showEditEmail = ref(false)
const newEmail      = ref('')
function saveEmail() { showEditEmail.value = false; newEmail.value = '' }

// Edit password modal
const showEditPwd  = ref(false)
const oldPwd       = ref('')
const newPwd       = ref('')
const confirmPwd   = ref('')
const pwdMatch     = computed(() => newPwd.value && newPwd.value === confirmPwd.value)
function savePassword() { showEditPwd.value = false; oldPwd.value = ''; newPwd.value = ''; confirmPwd.value = '' }

// Upgrade modal
const showUpgrade = ref(false)

// Sessions modal
const sessions = [
  { id: '1', device: 'MacBook Pro 16"', os: 'macOS 15.3', ip: '82.120.44.16',  location: 'Genève, CH',     last: 'En cours',       current: true  },
  { id: '2', device: 'iPhone 15 Pro',   os: 'iOS 18.3',   ip: '82.120.44.17',  location: 'Genève, CH',     last: 'il y a 2h',      current: false },
  { id: '3', device: 'Firefox / Linux', os: 'Ubuntu 24',  ip: '188.23.41.200', location: 'Paris, FR',      last: 'il y a 3 jours', current: false },
]
const showSessions   = ref(false)
const sessionsList   = ref([...sessions])
function revokeSession(id: string) { sessionsList.value = sessionsList.value.filter(s => s.id !== id) }

// Login logs modal
const loginLogs = [
  { success: true,  device: 'MacBook Pro 16"', ip: '82.120.44.16',  location: 'Genève, CH',    time: 'Aujourd\'hui 14:32' },
  { success: true,  device: 'iPhone 15 Pro',   ip: '82.120.44.17',  location: 'Genève, CH',    time: 'Aujourd\'hui 09:10' },
  { success: false, device: 'Inconnu',         ip: '45.33.32.156',  location: 'Moscou, RU',    time: 'Hier 23:47'         },
  { success: true,  device: 'Firefox / Linux', ip: '188.23.41.200', location: 'Paris, FR',     time: 'il y a 3j 08:15'    },
  { success: true,  device: 'MacBook Pro 16"', ip: '82.120.44.16',  location: 'Genève, CH',    time: 'il y a 5j 11:22'    },
]
const showLoginLogs = ref(false)

// Danger confirms
const showDeleteNodes   = ref(false)
const showDeleteAccount = ref(false)
const deleteAccConfirm  = ref('')
function deleteAllNodes() { showDeleteNodes.value = false }
function deleteAccount()  { if (deleteAccConfirm.value === 'supprimer') navigateTo('/login') }
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
              <button class="btn-ghost-sm" @click="showEditEmail = true">Modifier</button>
            </SettingRow>
            <SettingRow label="Mot de passe" sub="Dernière modification il y a 3 mois">
              <button class="btn-ghost-sm" @click="showEditPwd = true">Modifier</button>
            </SettingRow>
            <SettingRow label="Plan" sub="Free — 5 noeuds · 1 utilisateur · historique 24h">
              <button class="btn-accent-sm" @click="showUpgrade = true">Voir les plans →</button>
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
              <Toggle :model-value="twofa" @update:model-value="toggleTwofa" />
            </SettingRow>
            <SettingRow label="Sessions actives" sub="2 sessions — MacBook Pro, iPhone 15">
              <button class="btn-ghost-sm" @click="showSessions = true">Gérer</button>
            </SettingRow>
            <SettingRow label="Logs de connexion" sub="Historique des accès au compte">
              <button class="btn-ghost-sm" @click="showLoginLogs = true">Voir →</button>
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
              <button class="btn-danger-sm" @click="showDeleteNodes = true">Supprimer</button>
            </SettingRow>
            <SettingRow label="Supprimer le compte" sub="Action irréversible — toutes les données seront perdues">
              <button class="btn-danger-sm" @click="showDeleteAccount = true">Supprimer</button>
            </SettingRow>
          </div>
        </div>

      </div>
    </div>

  </div>

  <!-- Edit email modal -->
  <div v-if="showEditEmail" class="modal-overlay" @click.self="showEditEmail = false">
    <div class="modal" style="max-width:400px">
      <div class="modal-header">
        <div class="modal-title">Modifier l'email</div>
        <button class="close-btn" @click="showEditEmail = false"><UIcon name="i-lucide-x" style="width:12px;height:12px" /></button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Nouvel email</label>
          <input v-model="newEmail" class="form-input" type="email" placeholder="vous@example.com" />
        </div>
        <div class="form-group">
          <label class="form-label">Mot de passe actuel (confirmation)</label>
          <input class="form-input" type="password" placeholder="••••••••••" />
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-ghost-sm" @click="showEditEmail = false">Annuler</button>
        <button class="btn-accent-sm" :disabled="!newEmail" @click="saveEmail">Enregistrer</button>
      </div>
    </div>
  </div>

  <!-- Edit password modal -->
  <div v-if="showEditPwd" class="modal-overlay" @click.self="showEditPwd = false">
    <div class="modal" style="max-width:400px">
      <div class="modal-header">
        <div class="modal-title">Modifier le mot de passe</div>
        <button class="close-btn" @click="showEditPwd = false"><UIcon name="i-lucide-x" style="width:12px;height:12px" /></button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Mot de passe actuel</label>
          <input v-model="oldPwd" class="form-input" type="password" placeholder="••••••••••" />
        </div>
        <div class="form-group">
          <label class="form-label">Nouveau mot de passe</label>
          <input v-model="newPwd" class="form-input" type="password" placeholder="••••••••••" />
        </div>
        <div class="form-group">
          <label class="form-label">Confirmer</label>
          <input v-model="confirmPwd" class="form-input" type="password" placeholder="••••••••••" />
        </div>
        <div v-if="newPwd && confirmPwd && !pwdMatch" style="font-size:11px;color:var(--offline);margin-top:4px">Les mots de passe ne correspondent pas</div>
      </div>
      <div class="modal-footer">
        <button class="btn-ghost-sm" @click="showEditPwd = false">Annuler</button>
        <button class="btn-accent-sm" :disabled="!oldPwd || !pwdMatch" @click="savePassword">Enregistrer</button>
      </div>
    </div>
  </div>

  <!-- Upgrade modal -->
  <div v-if="showUpgrade" class="modal-overlay" @click.self="showUpgrade = false">
    <div class="modal upgrade-modal">
      <div class="modal-header">
        <div>
          <div class="modal-title">Plans & tarifs</div>
          <div class="modal-sub">Choisissez le plan adapté à vos besoins</div>
        </div>
        <button class="close-btn" @click="showUpgrade = false"><UIcon name="i-lucide-x" style="width:12px;height:12px" /></button>
      </div>
      <div class="modal-body up-body">
        <div class="upgrade-plans">

          <!-- Free (current) -->
          <div class="upgrade-plan">
            <div class="up-top">
              <span class="up-label">Plan actuel</span>
              <div class="up-name">Free</div>
              <div class="up-price">Gratuit</div>
              <div class="up-period">pour toujours</div>
            </div>
            <ul class="up-features">
              <li>5 noeuds</li>
              <li>1 utilisateur</li>
              <li>Historique 24h</li>
              <li>2 clés API</li>
              <li>Dashboard web</li>
              <li>Support communauté</li>
            </ul>
            <div class="up-cta">
              <span class="up-current-chip">Plan actuel</span>
            </div>
          </div>

          <!-- Pro -->
          <div class="upgrade-plan up-pro">
            <div class="up-top">
              <span class="up-label up-label-pro">Recommandé</span>
              <div class="up-name">Pro</div>
              <div class="up-price">8,90 €<span class="up-period-inline">/mois</span></div>
              <div class="up-period">facturé mensuellement</div>
            </div>
            <ul class="up-features">
              <li>25 noeuds</li>
              <li>10 utilisateurs</li>
              <li>Historique 90 jours</li>
              <li>Clés API illimitées</li>
              <li>Alertes email + webhook</li>
              <li>Support prioritaire 48h</li>
            </ul>
            <div class="up-cta">
              <button class="btn-accent-sm up-cta-btn" @click="showUpgrade = false">Passer à Pro →</button>
            </div>
          </div>

          <!-- Lifetime -->
          <div class="upgrade-plan up-lifetime-col">
            <div class="up-top">
              <span class="up-label up-label-lifetime">Paiement unique</span>
              <div class="up-name">Lifetime</div>
              <div class="up-price up-price-lifetime">149 €</div>
              <div class="up-period">une seule fois, à vie</div>
            </div>
            <ul class="up-features">
              <li>25 noeuds</li>
              <li>10 utilisateurs</li>
              <li>Historique 90 jours</li>
              <li>Clés API illimitées</li>
              <li>Alertes email + webhook</li>
              <li>Support prioritaire 48h</li>
            </ul>
            <div class="up-cta">
              <button class="up-cta-btn up-cta-lifetime" @click="showUpgrade = false">Obtenir Lifetime →</button>
            </div>
          </div>

        </div>

        <!-- Business — full-width contact banner -->
        <div class="upgrade-lifetime">
          <div class="up-lifetime-left">
            <span class="up-label up-label-biz">Entreprises</span>
            <div class="up-name">Business</div>
            <div class="up-lifetime-sub">Tarif adapté à votre organisation — sur devis.</div>
          </div>
          <ul class="up-lifetime-feats">
            <li>Noeuds illimités</li>
            <li>Utilisateurs illimités</li>
            <li>Historique 1 an</li>
            <li>SSO (SAML / OIDC)</li>
            <li>Logs d'audit</li>
          </ul>
          <div class="up-lifetime-right">
            <div class="up-price-contact" style="font-size:17px;margin-bottom:4px">Sur devis</div>
            <div class="up-lifetime-once">tarif personnalisé</div>
            <button class="up-cta-btn up-cta-biz" @click="showUpgrade = false">Prendre contact →</button>
          </div>
        </div>

      </div>
    </div>
  </div>

  <!-- 2FA setup modal -->
  <div v-if="show2fa" class="modal-overlay" @click.self="cancel2fa">
    <div class="modal" style="max-width:380px">
      <div class="modal-header">
        <div class="modal-title">Activer l'authentification 2FA</div>
        <button class="close-btn" @click="cancel2fa"><UIcon name="i-lucide-x" style="width:12px;height:12px" /></button>
      </div>
      <div class="modal-body">
        <div class="twofa-step">
          <div class="twofa-step-num">1</div>
          <div class="twofa-step-text">Scannez ce QR code avec votre application TOTP (Aegis, Bitwarden, Google Authenticator…)</div>
        </div>
        <div class="twofa-qr">
          <img :src="twofaQr" width="140" height="140" alt="QR code 2FA" style="border-radius:6px" />
          <div class="twofa-secret">
            <span class="form-label">Clé manuelle</span>
            <span class="mono-val">{{ twofaSecret }}</span>
          </div>
        </div>
        <div class="twofa-step">
          <div class="twofa-step-num">2</div>
          <div class="twofa-step-text">Entrez le code à 6 chiffres généré par l'application pour confirmer</div>
        </div>
        <input
          v-model="twofa2Code"
          class="form-input twofa-input"
          placeholder="000000"
          maxlength="6"
          inputmode="numeric"
          @keyup.enter="confirm2fa"
        />
        <div v-if="twofaError" style="font-size:11px;color:var(--offline);margin-top:6px">Code invalide — vérifiez votre application</div>
      </div>
      <div class="modal-footer">
        <button class="btn-ghost-sm" @click="cancel2fa">Annuler</button>
        <button class="btn-accent-sm" :disabled="twofa2Code.length !== 6" @click="confirm2fa">Confirmer</button>
      </div>
    </div>
  </div>

  <!-- Sessions modal -->
  <div v-if="showSessions" class="modal-overlay" @click.self="showSessions = false">
    <div class="modal">
      <div class="modal-header">
        <div><div class="modal-title">Sessions actives</div><div class="modal-sub">{{ sessionsList.length }} session{{ sessionsList.length > 1 ? 's' : '' }}</div></div>
        <button class="close-btn" @click="showSessions = false"><UIcon name="i-lucide-x" style="width:12px;height:12px" /></button>
      </div>
      <div class="modal-body">
        <div v-for="s in sessionsList" :key="s.id" class="session-row">
          <div class="session-icon">
            <UIcon name="i-lucide-monitor" style="width:13px;height:13px" />
          </div>
          <div class="session-info">
            <div class="session-device">{{ s.device }} <span v-if="s.current" class="badge-accent" style="font-size:9px">Actuelle</span></div>
            <div class="session-meta">{{ s.os }} · {{ s.ip }} · {{ s.location }}</div>
            <div class="session-meta" style="color:var(--muted)">{{ s.last }}</div>
          </div>
          <button v-if="!s.current" class="btn-danger-sm" @click="revokeSession(s.id)">Révoquer</button>
        </div>
        <div v-if="sessionsList.length === 0" style="font-size:12px;color:var(--muted);text-align:center;padding:12px">Aucune session active</div>
      </div>
      <div class="modal-footer">
        <button class="btn-ghost-sm" @click="showSessions = false">Fermer</button>
        <button class="btn-danger-sm" @click="sessionsList = sessionsList.filter(s => s.current)">Révoquer toutes les autres</button>
      </div>
    </div>
  </div>

  <!-- Login logs modal -->
  <div v-if="showLoginLogs" class="modal-overlay" @click.self="showLoginLogs = false">
    <div class="modal">
      <div class="modal-header">
        <div class="modal-title">Historique des connexions</div>
        <button class="close-btn" @click="showLoginLogs = false"><UIcon name="i-lucide-x" style="width:12px;height:12px" /></button>
      </div>
      <div class="modal-body">
        <div v-for="(log, i) in loginLogs" :key="i" class="log-row">
          <div class="log-icon" :style="log.success ? 'color:var(--accent)' : 'color:var(--offline)'">
            <UIcon :name="log.success ? 'i-lucide-circle-check' : 'i-lucide-circle-x'" style="width:14px;height:14px" />
          </div>
          <div class="log-info">
            <div class="log-device">{{ log.device }}</div>
            <div class="log-meta">{{ log.ip }} · {{ log.location }}</div>
          </div>
          <div class="log-time">{{ log.time }}</div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-ghost-sm" @click="showLoginLogs = false">Fermer</button>
      </div>
    </div>
  </div>

  <!-- Delete all nodes confirm -->
  <div v-if="showDeleteNodes" class="modal-overlay" @click.self="showDeleteNodes = false">
    <div class="modal" style="max-width:420px">
      <div class="modal-header">
        <div class="modal-title">Supprimer tous les noeuds ?</div>
        <button class="close-btn" @click="showDeleteNodes = false"><UIcon name="i-lucide-x" style="width:12px;height:12px" /></button>
      </div>
      <div class="modal-body">
        <div class="confirm-warn-box">
          <UIcon name="i-lucide-triangle-alert" style="width:14px;height:14px;flex-shrink:0" />
          Tous les agents seront révoqués et les données associées supprimées. Cette action est irréversible.
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-ghost-sm" @click="showDeleteNodes = false">Annuler</button>
        <button class="btn-danger-sm" @click="deleteAllNodes">Supprimer tous les noeuds</button>
      </div>
    </div>
  </div>

  <!-- Delete account confirm -->
  <div v-if="showDeleteAccount" class="modal-overlay" @click.self="showDeleteAccount = false">
    <div class="modal" style="max-width:420px">
      <div class="modal-header">
        <div class="modal-title">Supprimer le compte</div>
        <button class="close-btn" @click="showDeleteAccount = false"><UIcon name="i-lucide-x" style="width:12px;height:12px" /></button>
      </div>
      <div class="modal-body">
        <div class="confirm-warn-box">
          <UIcon name="i-lucide-triangle-alert" style="width:14px;height:14px;flex-shrink:0" />
          Toutes vos données seront définitivement supprimées. Cette action est irréversible.
        </div>
        <div class="form-group" style="margin-top:14px">
          <label class="form-label">Tapez <strong>supprimer</strong> pour confirmer</label>
          <input v-model="deleteAccConfirm" class="form-input" placeholder="supprimer" />
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-ghost-sm" @click="showDeleteAccount = false">Annuler</button>
        <button class="btn-danger-sm" :disabled="deleteAccConfirm !== 'supprimer'" @click="deleteAccount">Supprimer définitivement</button>
      </div>
    </div>
  </div>

</template>

<style scoped>
.settings-page { display: flex; flex-direction: column; }

/* ── 2FA modal ── */
.twofa-step { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 14px; }
.twofa-step-num {
  width: 18px; height: 18px; border-radius: 50%; background: var(--surface2); border: 1px solid var(--border2);
  font-size: 10px; font-weight: 700; color: var(--accent); display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.twofa-step-text { font-size: 11px; color: var(--muted); line-height: 1.5; padding-top: 1px; }
.twofa-qr { display: flex; align-items: center; gap: 16px; margin: 0 0 18px; padding: 14px; background: var(--surface2); border-radius: 8px; border: 1px solid var(--border); }
.twofa-secret { display: flex; flex-direction: column; gap: 4px; }
.twofa-input { text-align: center; letter-spacing: .25em; font-size: 18px; margin-top: 8px; }

/* ── Upgrade modal — 3 columns ── */
.upgrade-modal { width: 640px !important; max-width: 94vw !important; }
.up-body { padding-top: 16px !important; }

.upgrade-plans {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  align-items: stretch;
}

.upgrade-plan {
  background: var(--surface2);
  border: 1px solid var(--border2);
  border-radius: 10px;
  padding: 16px 14px 14px;
  display: flex;
  flex-direction: column;
  gap: 0;
}
.up-pro      { border-color: color-mix(in srgb, var(--accent)  35%, transparent); background: color-mix(in srgb, var(--accent)  4%, var(--surface2)); }
.up-business { border-color: color-mix(in srgb, var(--accent2) 30%, transparent); background: color-mix(in srgb, var(--accent2) 3%, var(--surface2)); }

/* Top section */
.up-top { margin-bottom: 14px; }
.up-label {
  display: inline-block;
  font-size: 9px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase;
  color: var(--muted); margin-bottom: 8px;
}
.up-label-pro  { color: var(--accent); }
.up-label-biz  { color: var(--accent2); }
.up-name {
  font-family: var(--font-disp); font-size: 17px; font-weight: 700;
  color: var(--text); margin-bottom: 6px;
}
.up-price {
  font-family: var(--font-disp); font-size: 20px; font-weight: 700;
  color: var(--accent); line-height: 1;
}
.up-pro      .up-price { color: var(--accent); }
.up-business .up-price { color: var(--accent2); }
.upgrade-plan:not(.up-pro):not(.up-business) .up-price { color: var(--muted); font-size: 16px; }
.up-period-inline { font-family: var(--font-mono); font-size: 10px; font-weight: 400; color: var(--muted); margin-left: 2px; }
.up-period { font-size: 10px; color: var(--muted); margin-top: 3px; }

/* Feature list */
.up-features {
  list-style: none; padding: 0; margin: 0;
  display: flex; flex-direction: column; gap: 6px;
  flex: 1;
}
.up-features li {
  font-size: 11px; color: var(--muted);
  padding-left: 14px; position: relative; line-height: 1.4;
}
.up-features li::before {
  content: '✓'; position: absolute; left: 0;
  font-size: 10px; color: var(--muted);
}
.up-pro      .up-features li::before { color: var(--accent); }
.up-business .up-features li::before { color: var(--accent2); }

/* CTA */
.up-cta { margin-top: 16px; }
.up-cta-btn {
  display: block; width: 100%; text-align: center;
  padding: 7px 10px; border-radius: var(--r);
  font-family: var(--font-mono); font-size: 10px; font-weight: 600;
  cursor: pointer; transition: filter .15s; border: none;
  background: var(--accent); color: var(--bg);
}
.up-cta-btn:hover { filter: brightness(1.08); }
.up-cta-biz {
  background: transparent;
  border: 1px solid color-mix(in srgb, var(--accent2) 40%, transparent);
  color: var(--accent2);
}
.up-cta-biz:hover { background: color-mix(in srgb, var(--accent2) 8%, transparent); filter: none; }
.up-current-chip {
  display: block; width: 100%; text-align: center;
  font-size: 10px; color: var(--muted); padding: 6px;
  border: 1px solid var(--border2); border-radius: var(--r);
}

/* Business — contact pricing */
.up-price-contact {
  font-family: var(--font-disp); font-size: 15px; font-weight: 600;
  color: var(--accent2); margin-top: 4px; margin-bottom: 3px;
}

/* Lifetime column */
.up-lifetime-col { border-color: color-mix(in srgb, #ffb74f 30%, transparent); background: color-mix(in srgb, #ffb74f 4%, var(--surface2)); }
.up-price-lifetime { color: #ffb74f !important; }
.up-lifetime-col .up-features li::before { color: #ffb74f; }
.up-cta-lifetime {
  background: #ffb74f; color: #1a1000; border: none;
}
.up-cta-lifetime:hover { filter: brightness(1.1); }

/* Business — full-width contact banner */
.upgrade-lifetime {
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: center;
  gap: 20px;
  margin-top: 10px;
  padding: 16px 18px;
  background: color-mix(in srgb, var(--accent2) 4%, var(--surface2));
  border: 1px solid color-mix(in srgb, var(--accent2) 30%, transparent);
  border-radius: 10px;
}
.up-label-lifetime { color: #ffb74f; }
.up-lifetime-left .up-name { margin-bottom: 4px; }
.up-lifetime-sub {
  font-size: 11px; color: var(--muted); line-height: 1.4; margin-top: 2px;
}
.up-lifetime-feats {
  list-style: none; padding: 0; margin: 0;
  display: flex; flex-direction: column; gap: 5px;
}
.up-lifetime-feats li {
  font-size: 10px; color: var(--muted);
  padding-left: 13px; position: relative;
}
.up-lifetime-feats li::before {
  content: '✓'; position: absolute; left: 0;
  font-size: 9px; color: var(--accent2);
}
.up-lifetime-right {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  min-width: 110px;
}
.up-lifetime-price {
  font-family: var(--font-disp); font-size: 22px; font-weight: 700;
  color: #ffb74f; line-height: 1;
}
.up-lifetime-once {
  font-size: 9px; color: var(--muted); letter-spacing: .04em;
  text-transform: uppercase; margin-bottom: 6px;
}
.up-cta-lifetime {
  background: #ffb74f; color: #1a1000;
  border: none;
}
.up-cta-lifetime:hover { filter: brightness(1.1); }

/* Sessions */
.session-row { display: flex; align-items: flex-start; gap: 10px; padding: 10px 0; border-bottom: 1px solid var(--border); }
.session-row:last-child { border-bottom: none; }
.session-icon { width: 28px; height: 28px; border-radius: 7px; background: var(--surface2); display: flex; align-items: center; justify-content: center; color: var(--muted); flex-shrink: 0; }
.session-info { flex: 1; min-width: 0; }
.session-device { font-size: 12px; color: var(--text); font-weight: 600; display: flex; align-items: center; gap: 6px; }
.session-meta { font-size: 10px; color: var(--muted); margin-top: 2px; }

/* Login logs */
.log-row { display: flex; align-items: flex-start; gap: 10px; padding: 9px 0; border-bottom: 1px solid var(--border); }
.log-row:last-child { border-bottom: none; }
.log-icon { flex-shrink: 0; margin-top: 1px; }
.log-info { flex: 1; min-width: 0; }
.log-device { font-size: 12px; color: var(--text); font-weight: 600; }
.log-meta { font-size: 10px; color: var(--muted); margin-top: 2px; }
.log-time { font-size: 10px; color: var(--muted); white-space: nowrap; flex-shrink: 0; }

/* Confirm warning */
.confirm-warn-box {
  display: flex; align-items: flex-start; gap: 10px;
  padding: 12px 14px; border-radius: var(--r);
  background: color-mix(in srgb, var(--warning) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--warning) 25%, transparent);
  color: var(--warning); font-size: 12px; line-height: 1.5;
}
</style>
