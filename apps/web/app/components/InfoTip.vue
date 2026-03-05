<script setup lang="ts">
const props = defineProps<{ text: string; position?: 'top' | 'bottom' }>()

const triggerRef = ref<HTMLElement | null>(null)
const visible    = ref(false)
const style      = ref<Record<string, string>>({})

function show() {
  if (!triggerRef.value) return
  const rect = triggerRef.value.getBoundingClientRect()
  const above = (props.position ?? 'top') === 'top'
  style.value = {
    position:  'fixed',
    left:      `${rect.left + rect.width / 2}px`,
    transform: 'translateX(-50%)',
    ...(above
      ? { bottom: `${window.innerHeight - rect.top + 7}px` }
      : { top:    `${rect.bottom + 7}px` }),
  }
  visible.value = true
}

function hide() { visible.value = false }
</script>

<template>
  <span ref="triggerRef" class="infotip" @mouseenter="show" @mouseleave="hide">
    <UIcon name="i-lucide-info" style="width:11px;height:11px" />
  </span>
  <Teleport to="body">
    <span v-if="visible" class="infotip-bubble" :style="style">{{ text }}</span>
  </Teleport>
</template>
