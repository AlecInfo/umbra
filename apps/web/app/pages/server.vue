<script setup lang="ts">
/*
| First screen of the packaged apps, and the only one the web never shows.
|
| The address is checked against /health before it is kept. Storing whatever
| was typed and letting the login screen fail later would blame the credentials
| for a typo in the hostname, which is the single most likely mistake here.
*/
definePageMeta({ layout: 'auth' })

const { t } = useT()
const server = useServerUrl()

const input   = ref('')
const testing = ref(false)
const error   = ref('')

async function submit() {
  error.value = ''
  const base = normalizeServerUrl(input.value)
  if (!base) {
    error.value = t('server_invalid')
    return
  }

  testing.value = true
  try {
    const res = await fetch(`${base}/health`)
    if (!res.ok) throw new Error(String(res.status))
    server.stored.value = base
    await navigateTo('/login')
  } catch {
    error.value = t('server_unreachable')
  } finally {
    testing.value = false
  }
}
</script>

<template>
  <div class="login-wrap">
    <div class="login-left">
      <div class="left-content">
        <div class="login-tagline">
          {{ t('server_tagline_1') }}<br>
          <span class="accent">{{ t('server_tagline_2') }}</span>
        </div>
        <div class="login-desc">{{ t('server_desc') }}</div>
      </div>
    </div>

    <div class="login-right">
      <div class="login-form">
        <div class="form-logo">UMBRA<span class="accent">.</span></div>
        <div class="form-sub">{{ t('server_title') }}</div>

        <div class="form-fields">
          <div class="form-group">
            <label class="form-label">{{ t('server_label') }}</label>
            <input
              v-model="input"
              class="form-input"
              type="text"
              placeholder="ex: umbra.mondomaine.ch"
              @keyup.enter="submit"
            >
          </div>

          <div v-if="error" class="server-error">{{ error }}</div>

          <button class="btn-primary" :disabled="testing" @click="submit">
            {{ testing ? t('server_testing') : t('server_btn') }}
          </button>

          <div class="server-hint">{{ t('server_hint') }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.server-error {
  font-size: 11px;
  color: var(--offline);
  line-height: 1.5;
}

.server-hint {
  font-size: 11px;
  color: var(--muted);
  line-height: 1.6;
}
</style>
