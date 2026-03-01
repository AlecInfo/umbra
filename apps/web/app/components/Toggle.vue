<script setup lang="ts">
defineProps<{ modelValue: boolean }>()
defineEmits<{ 'update:modelValue': [boolean] }>()
</script>

<template>
  <div class="toggle" :class="{ on: modelValue }" @click="$emit('update:modelValue', !modelValue)">
    <div class="toggle-thumb" />
  </div>
</template>
