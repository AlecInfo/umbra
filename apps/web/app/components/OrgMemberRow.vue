<script setup lang="ts">
import type { OrgMember, OrgRole } from '~/types/settings'

const { t } = useT()

const props = defineProps<{
  member:     OrgMember
  isMe?:      boolean
  canManage?: boolean
  roles:      { value: OrgRole; label: string }[]
}>()

defineEmits<{
  'update:role': [OrgRole]
  remove:        []
}>()

const roleLabel = computed(
  () => props.roles.find((r) => r.value === props.member.role)?.label ?? props.member.role
)

// Only offer what the API would actually accept. It refuses editing an owner's
// role, and refuses a non-admin editing anyone — offering the control anyway
// just produced an error the user could do nothing about.
const canEditRole = computed(
  () =>
    props.canManage &&
    !props.isMe &&
    props.member.role !== 'owner' &&
    props.member.status !== 'pending'
)
const canRemove = computed(
  () => props.canManage && props.member.role !== 'owner' && !props.isMe
)
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

    <!-- Fixed width: badges, selects and chips are all different sizes, and
         without a column they drift left and right from row to row. -->
    <div class="member-role">
      <div v-if="member.status === 'pending'" class="pending-chip">
        <UIcon name="i-lucide-hourglass" style="width:10px;height:10px" /> {{ t('org_pending') }}
      </div>
      <span v-else-if="member.role === 'owner'" class="owner-badge">owner</span>
      <select
        v-else-if="canEditRole"
        class="role-select"
        :value="member.role"
        @change="$emit('update:role', ($event.target as HTMLSelectElement).value as OrgRole)"
      >
        <option v-for="r in roles" :key="r.value" :value="r.value">{{ r.label }}</option>
      </select>
      <span v-else class="role-static">{{ roleLabel }}</span>
    </div>

    <button v-if="canRemove" class="remove-btn" @click="$emit('remove')">
      <UIcon name="i-lucide-x" style="width:10px;height:10px" />
    </button>
    <div v-else class="remove-placeholder" />
  </div>
</template>
