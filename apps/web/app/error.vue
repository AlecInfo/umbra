<script setup lang="ts">
const props = defineProps<{
  error: {
    statusCode: number
    statusMessage?: string
    message?: string
  }
}>()

const { t } = useT()
const is404 = computed(() => props.error?.statusCode === 404)
</script>

<template>
  <UApp>
    <div class="err-shell">
      <div class="err-wrap">
        <NuxtLink to="/" class="err-logo">UMBRA<span>.</span></NuxtLink>
        <div class="err-code">{{ error.statusCode }}</div>
        <div class="err-title">{{ is404 ? t('err_404_title') : t('err_generic_title') }}</div>
        <p class="err-msg">
          {{ is404
            ? t('err_404_msg')
            : (error.message || t('err_generic_msg'))
          }}
        </p>
        <button class="btn-primary" @click="clearError({ redirect: '/' })">
          {{ t('err_back') }}
        </button>
      </div>
    </div>
  </UApp>
</template>

<style scoped>
.err-shell {
  min-height: 100vh;
  background: var(--bg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-mono);
}

.err-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  text-align: center;
  padding: 40px 24px;
}

.err-logo {
  font-family: var(--font-disp);
  font-size: 16px;
  font-weight: 700;
  letter-spacing: .08em;
  color: var(--text);
  text-decoration: none;
  margin-bottom: 24px;
}
.err-logo span { color: var(--accent); }

.err-code {
  font-family: var(--font-disp);
  font-size: 96px;
  font-weight: 800;
  line-height: 1;
  color: var(--accent);
  letter-spacing: -.02em;
}

.err-title {
  font-family: var(--font-disp);
  font-size: 20px;
  font-weight: 600;
  color: var(--text);
}

.err-msg {
  font-size: 12px;
  color: var(--muted);
  max-width: 320px;
  line-height: 1.6;
  margin: 0 0 16px;
}
</style>
