<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

definePageMeta({ layout: 'auth' })

const colorMode = useColorMode()
const auth = useAuthStore()
const { t } = useT()

const username = ref('')
const email    = ref('')
const password = ref('')
const confirmPwd = ref('')
const showPwd  = ref(false)
const showConfirm = ref(false)
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
  t(`auth_strength_${pwdStrength.value}`)
)

const pwdMatch = computed(() => !!confirmPwd.value && password.value === confirmPwd.value)

const canSubmit = computed(() =>
  username.value && email.value && password.value && pwdStrength.value >= 2 && pwdMatch.value
)

const oauthNotice = ref(false)
function triggerOAuth() {
  oauthNotice.value = true
  setTimeout(() => oauthNotice.value = false, 3000)
}

async function register() {
  if (!canSubmit.value) return
  loading.value = true
  error.value   = ''
  try {
    await auth.register(email.value, password.value, username.value)
    await navigateTo('/')
  } catch (e: any) {
    error.value = e?.data?.message || e?.data?.errors?.[0]?.message || t('auth_err_register')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-wrap">

    <div class="login-left">
      <div class="left-content">
        <div class="login-tagline">
          {{ t('auth_tagline_register_1') }}<br>
          <span class="accent">{{ t('auth_tagline_register_2') }}</span>
        </div>
        <div class="login-desc">
          {{ t('auth_desc_register') }}
        </div>
      </div>
    </div>

    <div class="login-right">

      <div class="auth-toggles">
        <LangToggle />
        <div class="theme-toggle">
          <button
            v-for="th in themes"
            :key="th.value"
            class="theme-dot"
            :class="{ active: colorMode.value === th.value }"
            :title="th.label"
            @click="colorMode.preference = th.value"
          >
            <div class="dot-preview" :class="`prev-${th.value}`" />
          </button>
        </div>
      </div>

      <div class="login-form">
        <div class="form-logo">UMBRA<span class="accent">.</span></div>
        <div class="form-sub">{{ t('auth_register_title') }}</div>

        <div v-if="oauthNotice" class="oauth-notice">
          <UIcon name="i-lucide-info" style="width:12px;height:12px;flex-shrink:0" />
          {{ t('auth_oauth_notice') }}
        </div>
        <div class="oauth-group">
          <button class="oauth-btn" @click="triggerOAuth">
            <UIcon name="i-lucide-github" style="width:16px;height:16px" />
            {{ t('auth_oauth_github') }}
          </button>
          <button class="oauth-btn" @click="triggerOAuth">
            <svg width="15" height="15" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {{ t('auth_oauth_google') }}
          </button>
        </div>

        <div class="divider">{{ t('auth_or_email') }}</div>

        <div class="form-fields">
          <div class="form-group">
            <label class="form-label">{{ t('auth_username') }}</label>
            <input v-model="username" class="form-input" :placeholder="t('auth_username_ph')" />
          </div>
          <div class="form-group">
            <label class="form-label">{{ t('auth_email') }}</label>
            <input v-model="email" class="form-input" type="email" :placeholder="t('auth_email_ph')" />
          </div>
          <div class="form-group">
            <label class="form-label">{{ t('auth_password') }}</label>
            <div class="input-wrap">
              <input
                v-model="password"
                class="form-input"
                :type="showPwd ? 'text' : 'password'"
                placeholder="••••••••••••"
              />
              <button class="eye-btn" @click="showPwd = !showPwd">
                <UIcon v-if="showPwd" name="i-lucide-eye-off" style="width:14px;height:14px" />
                <UIcon v-else name="i-lucide-eye" style="width:14px;height:14px" />
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
          <div class="form-group">
            <label class="form-label">{{ t('auth_password_confirm') }}</label>
            <div class="input-wrap">
              <input
                v-model="confirmPwd"
                class="form-input"
                :type="showConfirm ? 'text' : 'password'"
                placeholder="••••••••••••"
              />
              <button class="eye-btn" @click="showConfirm = !showConfirm">
                <UIcon v-if="showConfirm" name="i-lucide-eye-off" style="width:14px;height:14px" />
                <UIcon v-else name="i-lucide-eye" style="width:14px;height:14px" />
              </button>
            </div>
            <div v-if="confirmPwd && !pwdMatch" class="strength-lbl" style="color:var(--offline);margin-top:4px">
              {{ t('auth_password_mismatch') }}
            </div>
          </div>
        </div>

        <div v-if="error" class="error-msg">{{ error }}</div>

        <button class="btn-submit" :disabled="loading || !canSubmit" @click="register">
          <span v-if="!loading">{{ t('auth_register_btn') }}</span>
          <span v-else class="loading-dots">···</span>
        </button>

        <div class="form-footer">
          {{ t('auth_have_account') }}
          <NuxtLink to="/login" class="form-link">{{ t('auth_login_link') }}</NuxtLink>
        </div>
      </div>
    </div>

  </div>
</template>
