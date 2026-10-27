<script setup lang="ts">
defineProps<{ modelValue: boolean; label?: string }>()
defineEmits<{ 'update:modelValue': [boolean] }>()
</script>

<template>
  <!-- A real switch: reachable with Tab, toggled with Space or Enter, announced as on/off. -->
  <button
    type="button"
    role="switch"
    class="toggle"
    :class="{ on: modelValue }"
    :aria-checked="modelValue"
    :aria-label="label"
    @click="$emit('update:modelValue', !modelValue)"
  >
    <span class="toggle-thumb" />
  </button>
</template>
