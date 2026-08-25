<script setup lang="ts">
import { useNodesStore } from '~/stores/nodes'

/*
| The connect modal lives here as well as in the default layout. On the web it
| carried instructions to paste into a terminal, which is meaningless on a
| phone, so this layout never showed it. Inside the mobile app it is the whole
| interaction — tailscale runs on the device and we drive it — so the modal has
| to exist wherever a node can be picked.
*/
const store = useNodesStore()
</script>

<template>
  <UApp>
    <slot />

    <ConnectModal
      :open="store.connectCommands !== null"
      :node-name="store.connectCommands?.nodeName ?? ''"
      :connect-command="store.connectCommands?.connectCommand ?? null"
      :switch-command="store.connectCommands?.switchCommand ?? null"
      :headscale-url="store.connectCommands?.headscaleUrl ?? null"
      :auth-key="store.connectCommands?.authKey ?? null"
      :exit-node-ip="store.connectCommands?.exitNodeIp ?? null"
      @close="store.connectCommands = null"
    />
  </UApp>
</template>
