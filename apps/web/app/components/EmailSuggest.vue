<script setup lang="ts">
/*
| An email field that suggests from a known list.
|
| Replaces <datalist>: the native dropdown is drawn by the browser, so it
| ignores the app's theme entirely and its size and placement cannot be
| controlled. This one is ordinary markup, styled like the rest.
*/
export interface SuggestOption {
  id: string
  email: string
  name: string | null
}

const props = withDefaults(
  defineProps<{
    modelValue: string
    options: SuggestOption[]
    placeholder?: string
    max?: number
  }>(),
  { placeholder: '', max: 6 }
)

const emit = defineEmits<{ 'update:modelValue': [string]; submit: [] }>()

const open = ref(false)
const highlighted = ref(-1)

const matches = computed(() => {
  const q = props.modelValue.trim().toLowerCase()
  const pool = props.options.filter((o) => o.email.toLowerCase() !== q)
  if (!q) return pool.slice(0, props.max)
  return pool
    .filter((o) => o.email.toLowerCase().includes(q) || (o.name ?? '').toLowerCase().includes(q))
    .slice(0, props.max)
})

watch(matches, () => { highlighted.value = -1 })

function choose(option: SuggestOption) {
  emit('update:modelValue', option.email)
  open.value = false
  highlighted.value = -1
}

function onEnter() {
  if (open.value && highlighted.value >= 0 && matches.value[highlighted.value]) {
    choose(matches.value[highlighted.value]!)
    return
  }
  emit('submit')
}

function move(delta: number) {
  if (!open.value || matches.value.length === 0) return
  const next = highlighted.value + delta
  highlighted.value = next < 0 ? matches.value.length - 1 : next % matches.value.length
}

// A click on a suggestion fires after blur, so closing is deferred.
function onBlur() {
  setTimeout(() => { open.value = false }, 150)
}
</script>

<template>
  <div class="suggest-wrap">
    <input
      :value="modelValue"
      class="form-input"
      type="email"
      :placeholder="placeholder"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value); open = true"
      @focus="open = true"
      @blur="onBlur"
      @keydown.down.prevent="move(1)"
      @keydown.up.prevent="move(-1)"
      @keydown.esc="open = false"
      @keyup.enter="onEnter"
    />

    <div v-if="open && matches.length" class="suggest-list">
      <button
        v-for="(o, i) in matches"
        :key="o.id"
        type="button"
        class="suggest-item"
        :class="{ active: i === highlighted }"
        @mousedown.prevent="choose(o)"
        @mouseenter="highlighted = i"
      >
        <span class="suggest-name">{{ o.name || o.email }}</span>
        <span v-if="o.name" class="suggest-email">{{ o.email }}</span>
      </button>
    </div>
  </div>
</template>
