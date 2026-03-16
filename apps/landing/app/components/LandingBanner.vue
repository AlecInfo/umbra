<script setup lang="ts">
const { t } = useLandingT()
const dismissed = ref(false)
</script>

<template>
  <div
    v-if="!dismissed"
    class="l-banner"
  >
    <div class="l-banner-inner">
      <span class="l-banner-text">{{ t('banner_text') }}</span>
      <NuxtLink
        to="/#waitlist"
        class="l-banner-cta"
      >
        {{ t('banner_cta') }}
      </NuxtLink>
    </div>
    <button
      class="l-banner-close"
      aria-label="Close"
      @click="dismissed = true"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        width="12"
        height="12"
      >
        <path
          d="M18 6L6 18M6 6l12 12"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>
  </div>
</template>
