<script setup lang="ts">
defineProps<{ label: string; sub?: string }>()
</script>

<template>
  <div class="setting-row">
    <div class="setting-info">
      <div class="setting-lbl">{{ label }}</div>
      <div v-if="sub" class="setting-sub">{{ sub }}</div>
    </div>
    <slot />
  </div>
</template>
