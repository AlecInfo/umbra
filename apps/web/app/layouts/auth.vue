<template>
  <div class="auth-shell" :data-theme="theme">
    <slot />
  </div>
</template>

<script setup lang="ts">
const { theme } = useTheme()
</script>

<style scoped>
.auth-shell {
  min-height: 100vh;
  background: var(--bg);
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>