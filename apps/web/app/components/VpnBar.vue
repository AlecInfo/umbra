, <script setup lang="ts">
import type { Node } from '~/stores/nodes'

const props = withDefaults(defineProps<{
  node:      Node
  upload?:   string
  download?: string
  showCut?:  boolean
}>(), {
  upload:   '0 B/s',
  download: '0 B/s',
  showCut:  true,
})

const emit = defineEmits<{ cut: [node: Node] }>()
const { t } = useT()
</script>

<template>
  <div class="vpn-bar">
    <div class="vpn-dot" />
    <div class="vpn-info">
      <NuxtLink :to="`/nodes/${node.id}`" class="vpn-name">{{ node.name }} — {{ node.location }}</NuxtLink>
      <div class="vpn-detail">{{ node.ip }} · WireGuard · umbra0</div>
    </div>
    <div class="vpn-stats">
      <div class="vstat">
        <div class="vstat-val">{{ node.latency }}ms</div>
        <div class="vstat-lbl">{{ t('vpn_latency') }}</div>
      </div>
      <div class="vstat">
        <div class="vstat-val">↑ {{ upload }}</div>
        <div class="vstat-lbl">{{ t('vpn_upload') }}</div>
      </div>
      <div class="vstat">
        <div class="vstat-val">↓ {{ download }}</div>
        <div class="vstat-lbl">{{ t('vpn_download') }}</div>
      </div>
    </div>
    <button v-if="showCut" class="btn-cut" @click="emit('cut', node)">{{ t('vpn_disconnect') }}</button>
  </div>
</template>
