<script setup lang="ts">
const props = defineProps<{
  open: boolean
  nodeName: string
  connectCommand: string | null
  switchCommand: string | null
  headscaleUrl: string | null
  authKey: string | null
  exitNodeIp: string | null
}>()

const emit = defineEmits<{ close: [] }>()
const { t } = useT()

const copiedConnect = ref(false)
const copiedSwitch  = ref(false)

/*
| Inside the packaged apps this modal stops being a set of instructions and
| becomes a button: tailscale is on this machine and we can drive it. The
| copy-paste block stays reachable behind a link, because someone will hit a
| system where the privilege prompt cannot be shown and a terminal is the way
| out.
*/
const desktop = useDesktop()

type AppState = 'idle' | 'running' | 'done' | 'missing' | 'failed'
const appState = ref<AppState>('idle')
const appError = ref('')
const forceManual = ref(false)

const canRunHere = computed(() =>
  desktop.available && !forceManual.value && Boolean(props.exitNodeIp)
)

watch(() => props.open, (open) => {
  if (!open) return
  appState.value = 'idle'
  appError.value = ''
  forceManual.value = false
})

async function connectHere() {
  if (!props.exitNodeIp) return
  appState.value = 'running'
  appError.value = ''

  try {
    const status = await desktop.status()
    if (!status.installed) {
      appState.value = 'missing'
      return
    }

    // Already on the mesh: switching exit node needs no key, and re-running the
    // join would pointlessly burn one.
    if (status.running && status.ip && !props.authKey) {
      await desktop.setExitNode(props.exitNodeIp)
    } else if (props.authKey && props.headscaleUrl) {
      await desktop.join(props.headscaleUrl, props.authKey, props.exitNodeIp)
    } else if (status.running) {
      await desktop.setExitNode(props.exitNodeIp)
    } else {
      appState.value = 'failed'
      appError.value = t('conn_modal_no_headscale')
      return
    }

    appState.value = 'done'
  } catch (err) {
    appState.value = 'failed'
    appError.value = err instanceof Error ? err.message : String(err)
  }
}

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

            <template v-if="canRunHere">
              <div class="info-box">
                <UIcon name="i-lucide-monitor" style="width:14px;height:14px;flex-shrink:0;margin-top:1px" />
                <span>{{ t('conn_modal_app_notice') }}</span>
              </div>

              <div v-if="appState === 'done'" class="connect-app-done">
                <UIcon name="i-lucide-check" style="width:14px;height:14px;flex-shrink:0" />
                {{ t('conn_modal_app_done') }}
              </div>

              <div v-else-if="appState === 'missing'" class="connect-no-headscale">
                <UIcon name="i-lucide-info" style="width:14px;height:14px;flex-shrink:0" />
                {{ t('conn_modal_app_missing') }}
              </div>

              <template v-else>
                <button class="btn-primary" :disabled="appState === 'running'" @click="connectHere">
                  {{ appState === 'running' ? t('conn_modal_app_running') : t('conn_modal_app_btn') }}
                </button>
                <div v-if="appState === 'failed'" class="connect-app-error">{{ appError }}</div>
              </template>

              <button class="link-btn" @click="forceManual = true">{{ t('conn_modal_app_manual') }}</button>
            </template>

            <div v-else class="info-box">
              <UIcon name="i-lucide-monitor" style="width:14px;height:14px;flex-shrink:0;margin-top:1px" />
              <span>{{ t('conn_modal_web_notice') }}</span>
            </div>

            <div v-if="!canRunHere && connectCommand" class="connect-section">
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

            <div v-if="!canRunHere && switchCommand" class="connect-section">
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

            <div v-if="!canRunHere && !connectCommand && !switchCommand" class="connect-no-headscale">
              <UIcon name="i-lucide-info" style="width:14px;height:14px" />
              {{ t('conn_modal_no_headscale') }}
            </div>

            <div v-if="!canRunHere" class="platform-info">{{ t('conn_modal_note') }}</div>

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

.connect-app-done {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  background: color-mix(in srgb, var(--accent) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent) 35%, transparent);
  border-radius: var(--r);
  font-size: 12px;
  color: var(--accent);
}

.connect-app-error {
  font-size: 11px;
  color: var(--offline);
  line-height: 1.5;
  word-break: break-word;
}

.link-btn {
  align-self: flex-start;
  background: none;
  border: none;
  padding: 0;
  font-family: inherit;
  font-size: 11px;
  color: var(--muted);
  text-decoration: underline;
  cursor: pointer;
}
.link-btn:hover { color: var(--text); }
</style>
