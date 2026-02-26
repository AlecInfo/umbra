<template>
  <div class="settings-page">

    <!-- Header -->
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
                    v-for="t in themes" :key="t.value"
                    class="theme-btn" :class="{ active: theme === t.value }"
                    @click="setTheme(t.value)"
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
                <button v-for="l in langs" :key="l.value"
                        class="seg-btn" :class="{ active: lang === l.value }"
                        @click="lang = l.value">{{ l.label }}</button>
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
            <div class="setting-row" v-for="notif in notifications" :key="notif.key">
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

            <!-- Invite row -->
            <div class="setting-row">
              <div class="setting-info">
                <div class="setting-lbl">Inviter un membre</div>
                <div class="setting-sub">Accès à tous les noeuds de l'organisation</div>
              </div>
              <button class="btn-ghost-sm" @click="showInvite = !showInvite">
                + Inviter
              </button>
            </div>

            <!-- Invite form (collapsible) -->
            <div v-if="showInvite" class="invite-form">
              <div class="invite-row">
                <input v-model="inviteEmail" class="form-input" placeholder="email@example.com" type="email" @keyup.enter="sendInvite" />
                <div class="seg-group">
                  <button v-for="r in roles" :key="r.value"
                          class="seg-btn" :class="{ active: inviteRole === r.value }"
                          @click="inviteRole = r.value">{{ r.label }}</button>
                </div>
                <button class="btn-accent-sm" :disabled="!inviteEmail" @click="sendInvite">Envoyer</button>
              </div>
              <div class="role-hint">
                <span v-if="inviteRole === 'member'">👁️ Lecture + connexion aux noeuds partagés</span>
                <span v-else-if="inviteRole === 'admin'">⚙️ Peut gérer les membres et les noeuds</span>
              </div>
            </div>

            <!-- Members list -->
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
                <button v-for="h in heartbeats" :key="h.value"
                        class="seg-btn" :class="{ active: heartbeat === h.value }"
                        @click="heartbeat = h.value">{{ h.label }}</button>
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

        <!-- Danger zone -->
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

<script setup lang="ts">
const theme = useCookie('umbra-theme', { default: () => 'dark' })
const lang      = ref('fr')
const twofa     = ref(false)
const autoUpdate = ref(true)
const heartbeat = ref('30s')

const themes = [
  { value: 'dark',  label: 'Dark'  },
  { value: 'mid',   label: 'Mid'   },
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
  { key: 'crit',    label: 'Alertes critiques',       sub: 'Email immédiat pour chaque alerte critique',         enabled: true  },
  { key: 'warn',    label: 'Alertes warning',          sub: 'Email pour les avertissements système',              enabled: true  },
  { key: 'offline', label: 'Noeud hors ligne',         sub: 'Notification si un noeud devient injoignable',       enabled: true  },
  { key: 'weekly',  label: 'Résumé hebdomadaire',      sub: 'Rapport récapitulatif chaque lundi matin',           enabled: false },
  { key: 'update',  label: 'Mises à jour disponibles', sub: 'Notification lors de nouvelles versions de l\'agent', enabled: false },
])

function setTheme(t: string) {
  theme.value = t
}

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

<style scoped>
.settings-page { display: flex; flex-direction: column; }

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: var(--sp-5);
}
.page-title { font-family: var(--font-disp); font-size: 21px; font-weight: 700; color: var(--text); }
.page-sub   { font-size: 11px; color: var(--muted); margin-top: 3px; }

.settings-layout { display: flex; flex-direction: column; }
.settings-col    { display: flex; flex-direction: column; gap: var(--sp-4); max-width: 720px; }

/* Card */
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r);
  overflow: hidden;
}
.card-danger { border-color: rgba(255,79,107,.25); }

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
}
.card-title  { font-size: 12px; font-weight: 500; color: var(--text); }
.danger-title { color: var(--offline); }

.card-body { padding: 0; }

/* Setting row */
.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 13px 16px;
  border-bottom: 1px solid var(--border);
  gap: 16px;
}
.setting-row:last-child { border-bottom: none; }

.setting-info { flex: 1; min-width: 0; }
.setting-lbl  { font-size: 12px; color: var(--text); font-weight: 500; }
.setting-sub  { font-size: 10px; color: var(--muted); margin-top: 2px; }

/* Plan badge */
.plan-badge {
  font-size: 9px;
  background: rgba(79,168,255,.1);
  color: var(--pending);
  border: 1px solid rgba(79,168,255,.2);
  padding: 2px 7px;
  border-radius: 10px;
}

/* Theme selector */
.theme-group { display: flex; gap: 6px; }

.theme-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding: 7px 10px;
  border-radius: var(--r);
  border: 1px solid var(--border2);
  background: var(--bg);
  color: var(--muted);
  font-family: var(--font-mono);
  font-size: 10px;
  cursor: pointer;
  transition: all .15s;
  min-width: 56px;
}
.theme-btn:hover { border-color: var(--text); color: var(--text); }
.theme-btn.active { border-color: var(--accent); color: var(--accent); background: rgba(79,255,176,.06); }

.theme-preview {
  width: 32px;
  height: 18px;
  border-radius: 3px;
  border: 1px solid var(--border2);
}
.preview-dark  { background: #0e0f11; }
.preview-mid   { background: #1a1d21; }
.preview-light { background: #f0f2f5; }

/* Segmented control */
.seg-group {
  display: flex;
  gap: 2px;
  background: var(--bg);
  border: 1px solid var(--border2);
  border-radius: 5px;
  padding: 2px;
}

.seg-btn {
  background: none;
  border: none;
  color: var(--muted);
  font-family: var(--font-mono);
  font-size: 10px;
  padding: 4px 10px;
  border-radius: 4px;
  cursor: pointer;
  transition: all .15s;
  white-space: nowrap;
}
.seg-btn:hover  { color: var(--text); }
.seg-btn.active { background: var(--surface); color: var(--accent); }

/* Toggle */
.toggle {
  width: 32px;
  height: 17px;
  border-radius: 9px;
  background: var(--border2);
  position: relative;
  cursor: pointer;
  transition: background .2s;
  flex-shrink: 0;
}
.toggle.on { background: var(--accent); }
.toggle-thumb {
  position: absolute;
  left: 2px;
  top: 2px;
  width: 13px;
  height: 13px;
  border-radius: 50%;
  background: var(--bg);
  transition: left .2s;
}
.toggle.on .toggle-thumb { left: 17px; }

/* Buttons */
.btn-ghost-sm {
  display: inline-flex;
  align-items: center;
  padding: 5px 11px;
  border-radius: var(--r);
  font-family: var(--font-mono);
  font-size: 10px;
  cursor: pointer;
  background: transparent;
  border: 1px solid var(--border2);
  color: var(--muted);
  white-space: nowrap;
  transition: all .15s;
}
.btn-ghost-sm:hover { border-color: var(--text); color: var(--text); }

.btn-accent-sm {
  display: inline-flex;
  align-items: center;
  padding: 5px 11px;
  border-radius: var(--r);
  font-family: var(--font-mono);
  font-size: 10px;
  cursor: pointer;
  border: none;
  background: var(--accent);
  color: var(--bg);
  font-weight: 600;
  white-space: nowrap;
  transition: filter .15s;
}
.btn-accent-sm:hover { filter: brightness(1.08); }

.btn-danger-sm {
  display: inline-flex;
  align-items: center;
  padding: 5px 11px;
  border-radius: var(--r);
  font-family: var(--font-mono);
  font-size: 10px;
  cursor: pointer;
  background: transparent;
  border: 1px solid rgba(255,79,107,.3);
  color: var(--offline);
  white-space: nowrap;
  transition: all .15s;
}
.btn-danger-sm:hover { background: rgba(255,79,107,.08); }

/* Misc */
.mono-val {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--muted);
  background: var(--bg);
  border: 1px solid var(--border2);
  padding: 4px 9px;
  border-radius: 4px;
  white-space: nowrap;
}

/* ── Équipe ── */
.member-count {
  font-size: 10px;
  color: var(--muted);
  font-family: var(--font-mono);
}

.invite-form {
  padding: 12px 16px;
  background: var(--bg);
  border-bottom: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.invite-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.form-input {
  flex: 1;
  background: var(--surface);
  border: 1px solid var(--border2);
  border-radius: var(--r);
  padding: 7px 10px;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text);
  outline: none;
  transition: border-color .15s;
}
.form-input:focus { border-color: var(--accent); }

.role-hint {
  font-size: 10px;
  color: var(--muted);
  padding-left: 2px;
}

.org-members { display: flex; flex-direction: column; }

.org-member-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--border);
  transition: background .1s;
}
.org-member-row:last-child { border-bottom: none; }
.org-member-row:hover      { background: var(--surface2); }

.member-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
  color: var(--bg);
  flex-shrink: 0;
}

.member-info  { flex: 1; min-width: 0; }
.member-name  { font-size: 12px; font-weight: 500; color: var(--text); display: flex; align-items: center; gap: 6px; }
.member-email { font-size: 10px; color: var(--muted); margin-top: 1px; }

.you-badge {
  font-size: 8px;
  background: rgba(79,255,176,.1);
  color: var(--accent);
  border: 1px solid rgba(79,255,176,.2);
  padding: 1px 5px;
  border-radius: 3px;
}

.owner-badge {
  font-size: 9px;
  font-family: var(--font-mono);
  background: rgba(255,183,79,.1);
  color: var(--warning);
  border: 1px solid rgba(255,183,79,.2);
  padding: 2px 7px;
  border-radius: 3px;
}

.pending-chip {
  font-size: 9px;
  color: var(--warning);
  font-family: var(--font-mono);
}

.role-select {
  font-family: var(--font-mono);
  font-size: 9px;
  background: var(--surface2);
  color: var(--muted);
  border: 1px solid var(--border2);
  border-radius: 3px;
  padding: 3px 6px;
  cursor: pointer;
  outline: none;
}

.remove-btn {
  background: none;
  border: none;
  color: var(--muted);
  font-size: 11px;
  cursor: pointer;
  padding: 3px 5px;
  border-radius: 3px;
  transition: all .15s;
}
.remove-btn:hover { color: var(--offline); background: rgba(255,79,107,.08); }

.remove-placeholder { width: 24px; }
</style>