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
