<template>
  <div class="auth-shell" data-theme="dark">
    <slot />
  </div>
</template>

<style scoped>
.auth-shell {
  min-height: 100vh;
  background: var(--bg);
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>