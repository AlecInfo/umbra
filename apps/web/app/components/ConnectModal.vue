<script setup lang="ts">
const props = defineProps<{
  open: boolean
  nodeName: string
  connectCommand: string | null
  switchCommand: string | null
}>()

const emit = defineEmits<{ close: [] }>()
const { t } = useT()

const copiedConnect = ref(false)
const copiedSwitch  = ref(false)

function writeToClipboard(text: string) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text)
  } else {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
  }
}

function copyConnect() {
  if (!props.connectCommand) return
  writeToClipboard(props.connectCommand)
  copiedConnect.value = true
  setTimeout(() => (copiedConnect.value = false), 2000)
}

function copySwitch() {
  if (!props.switchCommand) return
  writeToClipboard(props.switchCommand)
  copiedSwitch.value = true
  setTimeout(() => (copiedSwitch.value = false), 2000)
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="open" class="modal-overlay" @click.self="emit('close')">
        <div class="modal connect-modal">

          <div class="modal-header">
            <div>
              <div class="modal-title">{{ t('conn_modal_title') }} <span class="connect-name">{{ nodeName }}</span></div>
              <div class="modal-sub">{{ t('conn_modal_sub') }}</div>
            </div>
            <button class="close-btn" @click="emit('close')">
              <UIcon name="i-lucide-x" style="width:12px;height:12px" />
            </button>
          </div>

          <div class="modal-body">

            <div class="info-box">
              <UIcon name="i-lucide-monitor" style="width:14px;height:14px;flex-shrink:0;margin-top:1px" />
              <span>{{ t('conn_modal_web_notice') }}</span>
            </div>

            <div v-if="connectCommand" class="connect-section">
              <label class="form-label">
                <span class="form-label-text">
                  <UIcon name="i-lucide-terminal" style="width:10px;height:10px;margin-right:4px" />
                  {{ t('conn_modal_new') }}
                </span>
                <span>{{ t('conn_modal_new_hint') }}</span>
              </label>
              <div class="cmd-block" style="margin-top:6px">
                <button class="cmd-copy" @click="copyConnect">
                  <template v-if="copiedConnect"><UIcon name="i-lucide-check" style="width:10px;height:10px" /> {{ t('conn_modal_copied') }}</template>
                  <template v-else>{{ t('conn_modal_copy') }}</template>
                </button>
                <div class="cmd-scroll"><pre class="cmd-pre">{{ connectCommand }}</pre></div>
              </div>
            </div>

            <div v-if="switchCommand" class="connect-section">
              <label class="form-label">
                <span class="form-label-text">
                  <UIcon name="i-lucide-repeat" style="width:10px;height:10px;margin-right:4px" />
                  {{ t('conn_modal_switch') }}
                </span>
                <span>{{ t('conn_modal_switch_hint') }}</span>
              </label>
              <div class="cmd-block" style="margin-top:6px">
                <button class="cmd-copy" @click="copySwitch">
                  <template v-if="copiedSwitch"><UIcon name="i-lucide-check" style="width:10px;height:10px" /> {{ t('conn_modal_copied') }}</template>
                  <template v-else>{{ t('conn_modal_copy') }}</template>
                </button>
                <div class="cmd-scroll"><pre class="cmd-pre">{{ switchCommand }}</pre></div>
              </div>
            </div>

            <div v-if="!connectCommand && !switchCommand" class="connect-no-headscale">
              <UIcon name="i-lucide-info" style="width:14px;height:14px" />
              {{ t('conn_modal_no_headscale') }}
            </div>

            <div class="platform-info">{{ t('conn_modal_note') }}</div>

          </div>

          <div class="modal-footer">
            <button class="btn-ghost-sm" @click="emit('close')">{{ t('common_close') }}</button>
          </div>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.connect-modal {
  width: 560px;
  max-width: calc(100vw - 32px);
}

.connect-name {
  color: var(--accent);
}

.connect-section {
  display: flex;
  flex-direction: column;
}

.connect-no-headscale {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: var(--r);
  font-size: 12px;
  color: var(--muted);
}
</style>
