<script setup lang="ts">
import { useNotifications } from '~/composables/useNotifications'

const { notifications, dismiss } = useNotifications()

const icons: Record<string, string> = {
  success: 'i-lucide-circle-check',
  warning: 'i-lucide-triangle-alert',
  error:   'i-lucide-circle-x',
  info:    'i-lucide-info',
}
</script>

<template>
  <Teleport to="body">
    <div class="notif-stack">
      <TransitionGroup name="notif">
        <div
          v-for="n in notifications"
          :key="n.id"
          class="notif"
          :class="`notif-${n.type}`"
        >
          <UIcon :name="icons[n.type]" class="notif-icon" style="width:13px;height:13px;flex-shrink:0" />
          <span class="notif-msg">{{ n.message }}</span>
          <button class="notif-close" @click="dismiss(n.id)">
            <UIcon name="i-lucide-x" style="width:10px;height:10px" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>
