<script setup lang="ts">
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
          <UIcon :name="icons[n.type]" class="notif-icon" style="width:14px;height:14px;flex-shrink:0;margin-top:1px" />
          <div class="notif-body">
            <div class="notif-title">{{ n.title }}</div>
            <div v-if="n.description" class="notif-desc">{{ n.description }}</div>
          </div>
          <button class="notif-close" @click="dismiss(n.id)">
            <UIcon name="i-lucide-x" style="width:10px;height:10px" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>
