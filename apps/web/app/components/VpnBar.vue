, <script setup lang="ts">
import type { Node } from '~/stores/nodes'

const props = withDefaults(defineProps<{
  node:      Node
  upload?:   string
  download?: string
  showCut?:  boolean
  // The session exists but the exit node has not seen this machine yet.
  pending?:  boolean
}>(), {
  upload:   '0 B/s',
  download: '0 B/s',
  showCut:  true,
  pending:  false,
})

const emit = defineEmits<{ cut: [node: Node] }>()
const { t } = useT()
</script>

<template>
  <div class="vpn-bar" :class="{ 'vpn-bar--pending': pending }">
    <div class="vpn-dot" />
    <div class="vpn-info">
      <NuxtLink :to="`/nodes/${node.id}`" class="vpn-name">{{ node.name }}<template v-if="node.location"> — {{ node.location }}</template></NuxtLink>
      <div class="vpn-detail">{{ pending ? t('vpn_pending_detail') : `${node.ip} · tailscale` }}</div>
    </div>
    <div v-if="!pending" class="vpn-stats">
      <div class="vstat">
        <div class="vstat-val">{{ node.latency != null ? `${node.latency}ms` : t('common_dash') }}</div>
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
    <button v-if="showCut" class="btn-cut" @click="emit('cut', node)">{{ pending ? t('vpn_cancel') : t('vpn_disconnect') }}</button>
  </div>
</template>

<style scoped>
/* Waiting, not connected: the accent pulse is reserved for a live tunnel. */
.vpn-bar--pending { border-color: color-mix(in srgb, var(--pending) 35%, transparent); }
.vpn-bar--pending .vpn-dot { background: var(--pending); animation: none; opacity: .8; }
</style>
