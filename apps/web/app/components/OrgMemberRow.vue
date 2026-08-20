<script setup lang="ts">
import type { OrgMember, OrgRole } from '~/types/settings'

const { t } = useT()

defineProps<{
  member: OrgMember
  isMe?:  boolean
  roles:  { value: OrgRole; label: string }[]
}>()

defineEmits<{
  'update:role': [OrgRole]
  remove:        []
}>()
</script>

<template>
  <div class="org-member-row">
    <div class="member-avatar" :style="`background: ${member.color}`">{{ member.avatar }}</div>

    <div class="member-info">
      <div class="member-name">
        {{ member.name }}
        <span v-if="isMe" class="you-badge">{{ t('org_you') }}</span>
      </div>
      <div class="member-email">{{ member.email }}</div>
    </div>

    <div v-if="member.status === 'pending'" class="pending-chip"><UIcon name="i-lucide-hourglass" style="width:10px;height:10px" /> {{ t('org_pending') }}</div>
    <select
      v-else-if="member.role !== 'owner'"
      class="role-select"
      :value="member.role"
      @change="$emit('update:role', ($event.target as HTMLSelectElement).value as OrgRole)"
    >
      <option v-for="r in roles" :key="r.value" :value="r.value">{{ r.label }}</option>
    </select>
    <span v-else class="owner-badge">owner</span>

    <button v-if="!isMe && member.role !== 'owner'" class="remove-btn" @click="$emit('remove')"><UIcon name="i-lucide-x" style="width:10px;height:10px" /></button>
    <div v-else class="remove-placeholder" />
  </div>
</template>
