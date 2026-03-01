<script setup lang="ts">
defineProps<{
  modelValue: string
  options:    { value: string; label: string }[]
}>()
defineEmits<{ 'update:modelValue': [string] }>()
</script>

<template>
  <div class="seg-group">
    <button
      v-for="opt in options"
      :key="opt.value"
      class="seg-btn"
      :class="{ active: modelValue === opt.value }"
      @click="$emit('update:modelValue', opt.value)"
    >{{ opt.label }}</button>
  </div>
</template>
