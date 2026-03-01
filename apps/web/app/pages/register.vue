<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const colorMode = useColorMode()

const username = ref('')
const email    = ref('')
const password = ref('')
const showPwd  = ref(false)
const loading  = ref(false)
const error    = ref('')

const themes = [
  { value: 'dark',  label: 'Dark'  },
  { value: 'light', label: 'Light' },
]

const pwdStrength = computed(() => {
  const p = password.value
  if (!p) return 0
  let score = 0
  if (p.length >= 8)           score++
  if (/[A-Z]/.test(p))        score++
  if (/[0-9]/.test(p))        score++
  if (/[^A-Za-z0-9]/.test(p)) score++
  return score
})

const strengthLabel = computed(() =>
  ['', 'Faible', 'Moyen', 'Fort', 'Très fort'][pwdStrength.value]
)

const canSubmit = computed(() =>
  username.value && email.value && password.value && pwdStrength.value >= 2
)

async function register() {
  if (!canSubmit.value) return
  loading.value = true
  error.value   = ''
  await new Promise(r => setTimeout(r, 800))
  loading.value = false
  navigateTo('/')
}
</script>

<template>
  <div class="login-wrap">

    <div class="login-left">
      <div class="left-content">
        <div class="login-tagline">
          Prêt en<br>
          <span class="accent">une commande.</span>
        </div>
        <div class="login-desc">
          Créez votre compte, ajoutez un noeud, connectez-vous.
          Tout en moins de 5 minutes.
        </div>
      </div>
    </div>

    <div class="login-right">

      <div class="theme-toggle">
        <button
          v-for="t in themes"
          :key="t.value"
          class="theme-dot"
          :class="{ active: colorMode.value === t.value }"
          :title="t.label"
          @click="colorMode.preference = t.value"
        >
          <div class="dot-preview" :class="`prev-${t.value}`" />
        </button>
      </div>

      <div class="login-form">
        <div class="form-logo">UMBRA<span class="accent">.</span></div>
        <div class="form-sub">Créer un compte gratuit</div>

        <div class="oauth-group">
          <button class="oauth-btn">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
            </svg>
            Continuer avec GitHub
          </button>
          <button class="oauth-btn">
            <svg width="15" height="15" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continuer avec Google
          </button>
        </div>

        <div class="divider">ou par email</div>

        <div class="form-fields">
          <div class="form-group">
            <label class="form-label">Nom d'utilisateur</label>
            <input v-model="username" class="form-input" placeholder="alecptt" />
          </div>
          <div class="form-group">
            <label class="form-label">Email</label>
            <input v-model="email" class="form-input" type="email" placeholder="vous@example.com" />
          </div>
          <div class="form-group">
            <label class="form-label">Mot de passe</label>
            <div class="input-wrap">
              <input
                v-model="password"
                class="form-input"
                :type="showPwd ? 'text' : 'password'"
                placeholder="••••••••••••"
              />
              <button class="eye-btn" @click="showPwd = !showPwd">
                <svg v-if="!showPwd" width="13" height="13" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="3" stroke="currentColor" stroke-width="1.4"/>
                  <path d="M1 8s3-5 7-5 7 5 7 5-3 5-7 5-7-5-7-5z" stroke="currentColor" stroke-width="1.4"/>
                </svg>
                <svg v-else width="13" height="13" viewBox="0 0 16 16" fill="none">
                  <path d="M2 2l12 12M6.5 6.7A3 3 0 009.3 9.5M4.2 4.3C2.6 5.4 1 8 1 8s3 5 7 5c1.4 0 2.7-.4 3.8-1.2M6.5 3.1C7 3 7.5 3 8 3c4 0 7 5 7 5s-.8 1.4-2 2.7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
                </svg>
              </button>
            </div>
          </div>
          <div class="pwd-strength">
            <div class="strength-bars">
              <div
                v-for="i in 4"
                :key="i"
                class="strength-bar"
                :class="{ active: pwdStrength >= i, [`s${pwdStrength}`]: true }"
              />
            </div>
            <span class="strength-lbl">{{ strengthLabel }}</span>
          </div>
        </div>

        <div v-if="error" class="error-msg">{{ error }}</div>

        <button class="btn-submit" :disabled="loading || !canSubmit" @click="register">
          <span v-if="!loading">Créer le compte →</span>
          <span v-else class="loading-dots">···</span>
        </button>

        <div class="form-footer">
          Déjà un compte ?
          <NuxtLink to="/login" class="form-link">Se connecter</NuxtLink>
        </div>
      </div>
    </div>

  </div>
</template>
