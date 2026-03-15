<script setup lang="ts">
const { lang, t } = useLandingT()
const toast = useToast()

async function copyCmd() {
  try {
    await navigator.clipboard.writeText('curl -fsSL https://get.umbravpn.io | sh')
    toast.add({
      title: lang.value === 'fr' ? 'Commande copiée !' : 'Command copied!',
      icon: 'i-lucide-check',
      color: 'success',
      duration: 2000
    })
  } catch {
    toast.add({
      title: lang.value === 'fr' ? 'Impossible de copier' : 'Failed to copy',
      icon: 'i-lucide-x',
      color: 'error',
      duration: 2000
    })
  }
}

// ── Terminal animation ───────────────────────────────────────────
const termSection = ref<HTMLElement>()
const termHtml = ref('')
const termDone = ref(false)

interface Seg { text: string, cls: string, speed: number }
const TERM: Seg[] = [
  { text: '$ umbra connect --node ch-geneva-01\n', cls: '', speed: 52 },
  { text: '\n', cls: '', speed: 110 },
  { text: '  Resolving node...', cls: 't-dim', speed: 26 },
  { text: '          ✓\n', cls: 't-ok', speed: 10 },
  { text: '  WireGuard handshake...', cls: 't-dim', speed: 26 },
  { text: '     ✓\n', cls: 't-ok', speed: 10 },
  { text: '  Authenticating...', cls: 't-dim', speed: 26 },
  { text: '          ✓\n', cls: 't-ok', speed: 10 },
  { text: '\n', cls: '', speed: 75 },
  { text: '  Connected to ch-geneva-01\n', cls: 't-bright', speed: 20 },
  { text: '  ──────────────────────────────\n', cls: 't-dim', speed: 6 },
  { text: '  IP        ', cls: 't-dim', speed: 16 }, { text: '10.0.0.2\n', cls: 't-ok', speed: 26 },
  { text: '  Latency   ', cls: 't-dim', speed: 16 }, { text: '4ms\n', cls: 't-ok', speed: 26 },
  { text: '  Protocol  ', cls: 't-dim', speed: 16 }, { text: 'WireGuard\n', cls: 't-ok', speed: 26 },
  { text: '  Endpoint  ', cls: 't-dim', speed: 16 }, { text: '[YOUR SERVER]:51820\n', cls: '', speed: 26 },
  { text: '\n  Your traffic is now routed through\n  infrastructure you control.\n\n', cls: 't-bright', speed: 14 },
  { text: '$ ', cls: '', speed: 45 }
]

function startTerminal() {
  if (termDone.value) return
  let html = '', curCls = '', buf = ''
  let si = 0, ci = 0

  function flush() {
    if (!buf) return
    html += curCls ? `<span class="${curCls}">${buf}</span>` : buf
    buf = ''
  }

  function append(char: string, cls: string) {
    const e = char === '<' ? '&lt;' : char === '>' ? '&gt;' : char === '&' ? '&amp;' : char
    if (char === '\n') { flush(); html += '<br>'; curCls = ''; termHtml.value = html; return }
    if (cls === curCls) { buf += e } else { flush(); curCls = cls; buf = e }
    termHtml.value = html + (curCls ? `<span class="${curCls}">${buf}</span>` : buf)
  }

  function step() {
    const seg = TERM[si]
    if (!seg) { flush(); termHtml.value = html + (curCls ? `<span class="${curCls}">${buf}</span>` : buf); termDone.value = true; return }
    const char = seg.text[ci]
    if (char === undefined) { si++; ci = 0; step(); return }
    append(char, seg.cls); ci++
    stepTimeout = setTimeout(step, seg.speed + Math.random() * (seg.speed * 0.25))
  }

  stepTimeout = setTimeout(step, 400)
}

let stepTimeout: ReturnType<typeof setTimeout>
let termObs: IntersectionObserver | null = null

function setupTermObs() {
  termObs = new IntersectionObserver((entries) => {
    if (entries[0]?.isIntersecting) { startTerminal(); termObs?.disconnect() }
  }, { threshold: 0.3 })
  if (termSection.value) termObs.observe(termSection.value)
}

onMounted(() => {
  nextTick(setupTermObs)
})

onUnmounted(() => {
  clearTimeout(stepTimeout)
  termObs?.disconnect()
})
</script>

<template>
  <section
    id="terminal"
    class="l-section"
  >
    <div class="wrap">
      <div class="l-term-grid">
        <div class="l-term-text reveal">
          <div class="l-sh-eyebrow">
            {{ t('term_eyebrow') }}
          </div>
          <h2 class="l-term-text-title">
            {{ t('term_title') }}
          </h2>
          <p class="l-term-text-desc">
            {{ t('term_sub') }}
          </p>
          <div class="l-term-platforms">
            <span class="l-term-plat"><UIcon
              name="i-lucide-terminal"
              style="width:11px;height:11px"
            /> Linux</span>
            <span class="l-term-plat"><UIcon
              name="i-lucide-monitor"
              style="width:11px;height:11px"
            /> macOS</span>
            <span class="l-term-plat"><UIcon
              name="i-lucide-server"
              style="width:11px;height:11px"
            /> {{ lang === 'fr' ? 'N\'importe quel VPS' : 'Any VPS' }}</span>
          </div>
        </div>
        <div
          ref="termSection"
          class="l-term-window reveal d1"
        >
          <div class="l-term-titlebar">
            <div class="l-term-dots">
              <span class="l-term-dot" /><span class="l-term-dot" /><span class="l-term-dot" />
            </div>
            <div class="l-term-tab-title">
              umbra — zsh — 80×24
            </div>
            <div class="l-term-copy-wrap">
              <UButton
                variant="copy"
                @click="copyCmd"
              >
                {{ lang === 'fr' ? 'copier la commande' : 'copy install cmd' }}
              </UButton>
            </div>
          </div>
          <div
            class="l-term-body"
            v-html="termHtml + (termDone ? '' : '<span class=\'t-cursor\'></span>')"
          />
        </div>
      </div>
    </div>
  </section>
</template>
