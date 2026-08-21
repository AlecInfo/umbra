<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

/*
| Shown when an account still holds the temporary password it was provisioned
| with. Deliberately not dismissible: no close button, no click-outside, no
| escape. The account is usable only once the password has actually changed.
|
| The current password is asked for rather than skipped. The holder typed it
| moments ago to get here, and not weakening change-password for one case keeps
| a single rule: replacing a password always requires proving you know it.
*/
const auth = useAuthStore()
const { t } = useT()

const current = ref('')
const next    = ref('')
const confirm = ref('')
const saving  = ref(false)
const error   = ref<string | null>(null)

// Same scoring as the sign-up form: a password chosen here is a real one, and
// nothing was telling the user how strong it was.
const pwdStrength = computed(() => {
  const p = next.value
  let score = 0
  if (p.length >= 8)          score++
  if (/[A-Z]/.test(p))        score++
  if (/[0-9]/.test(p))        score++
  if (/[^A-Za-z0-9]/.test(p)) score++
  return score
})
const strengthLabel = computed(() => t(`auth_strength_${pwdStrength.value}`))

const tooShort = computed(() => next.value.length > 0 && next.value.length < 8)
const mismatch = computed(() => confirm.value.length > 0 && next.value !== confirm.value)
const canSubmit = computed(
  () => current.value.length > 0 && next.value.length >= 8 && next.value === confirm.value && !saving.value
)

async function submit() {
  if (!canSubmit.value) return
  saving.value = true
  error.value = null
  try {
    const api = useApi()
    await api('/auth/change-password', {
      method: 'POST',
      body: { currentPassword: current.value, newPassword: next.value },
    })
    auth.mustChangePassword = false
    current.value = next.value = confirm.value = ''
  } catch (e: any) {
    error.value = e?.data?.message ?? t('force_pwd_error')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <div v-if="auth.mustChangePassword" class="modal-overlay force-pwd-overlay">
      <div class="modal" style="max-width:420px">
        <div class="modal-header">
          <div>
            <div class="modal-title">{{ t('force_pwd_title') }}</div>
            <div class="modal-sub">{{ t('force_pwd_sub') }}</div>
          </div>
        </div>

        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">{{ t('force_pwd_current') }}</label>
            <input v-model="current" class="form-input" type="password" placeholder="••••••••••" autofocus />
          </div>
          <div class="form-group">
            <label class="form-label">{{ t('force_pwd_new') }}</label>
            <input v-model="next" class="form-input" type="password" placeholder="••••••••••" @keyup.enter="submit" />
            <div v-if="next" class="pwd-strength">
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
            <div v-if="tooShort" class="form-error">{{ t('force_pwd_short') }}</div>
          </div>
          <div class="form-group">
            <label class="form-label">{{ t('force_pwd_confirm') }}</label>
            <input v-model="confirm" class="form-input" type="password" placeholder="••••••••••" @keyup.enter="submit" />
            <div v-if="mismatch" class="form-error">{{ t('force_pwd_mismatch') }}</div>
          </div>
          <div v-if="error" class="form-error">{{ error }}</div>
        </div>

        <div class="modal-footer">
          <button class="btn-accent-sm" :disabled="!canSubmit" @click="submit">
            {{ saving ? t('force_pwd_saving') : t('force_pwd_submit') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
