<template>
  <!-- ─── HERO ─────────────────────────────────────────────── -->
  <section class="l-hero" ref="heroRef">
    <canvas ref="canvasRef" class="l-hero-canvas" aria-hidden="true" />
    <div class="l-hero-glow" aria-hidden="true" />

    <div class="l-hero-content">
      <a class="l-badge" href="#waitlist">
        <span class="l-badge-dot" />
        Bêta privée · Rejoindre la liste d'attente
        <span class="l-badge-arrow">→</span>
      </a>

      <h1 class="l-h1">
        Votre réseau mesh.<br>
        <span class="l-grad">Vos règles.</span>
      </h1>

      <p class="l-hero-sub">
        Connectez tous vos appareils en un réseau privé chiffré.<br>
        Auto-hébergé. Open source. Sans compromis.
      </p>

      <form class="l-form" @submit.prevent="submitHero">
        <input
          v-model="heroEmail"
          type="email"
          placeholder="votre@email.com"
          class="l-email-input"
          :disabled="heroSuccess"
          autocomplete="email"
        />
        <button type="submit" class="l-btn" :class="{ 'l-btn--success': heroSuccess }">
          <span v-if="!heroSuccess">Rejoindre la bêta</span>
          <span v-else>✓ À bientôt !</span>
        </button>
      </form>
      <p class="l-form-note">Gratuit · Pas de spam · Bêta Q2 2026</p>
    </div>

    <div class="l-scroll-cue" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" width="18" height="18" class="l-scroll-arrow">
        <path d="M12 5v14M5 12l7 7 7-7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>
  </section>

  <!-- ─── TRUST BAR ─────────────────────────────────────────── -->
  <div class="l-trust">
    <span class="l-trust-label">Construit sur</span>
    <span class="l-trust-item">WireGuard</span>
    <span class="l-trust-sep">·</span>
    <span class="l-trust-item">Headscale</span>
    <span class="l-trust-sep">·</span>
    <span class="l-trust-item">Open Source</span>
    <span class="l-trust-sep">·</span>
    <span class="l-trust-item">Go + Nuxt</span>
  </div>

  <!-- ─── FEATURES ──────────────────────────────────────────── -->
  <section id="features" class="l-section">
    <div class="l-section-head reveal">
      <span class="l-tag">Fonctionnalités</span>
      <h2 class="l-h2">Tout ce qu'il faut.<br>Rien de superflu.</h2>
      <p class="l-section-sub">UMBRA vous donne le contrôle total de votre infrastructure réseau privée.</p>
    </div>

    <div class="l-features-grid">
      <div
        v-for="(feat, i) in features"
        :key="i"
        class="l-feat-card reveal"
        :style="{ '--delay': i * 70 + 'ms' }"
      >
        <div class="l-feat-icon" :style="{ background: feat.bg, color: feat.color }">
          <UIcon :name="feat.icon" style="width:20px;height:20px" />
        </div>
        <div class="l-feat-title">{{ feat.title }}</div>
        <div class="l-feat-desc">{{ feat.desc }}</div>
      </div>
    </div>
  </section>

  <!-- ─── TERMINAL DEMO ─────────────────────────────────────── -->
  <section class="l-demo">
    <div class="l-demo-inner">
      <div class="l-demo-text reveal">
        <span class="l-tag">Installation</span>
        <h2 class="l-h2">Opérationnel en<br>30 secondes.</h2>
        <p class="l-demo-p">
          Une seule commande. L'agent s'installe, configure WireGuard,
          et enregistre votre nœud automatiquement sur votre serveur Headscale.
        </p>
        <div class="l-demo-bullets">
          <div class="l-bullet"><span class="l-bullet-dot" />Zéro configuration WireGuard manuelle</div>
          <div class="l-bullet"><span class="l-bullet-dot" />Fonctionne derrière NAT et CGNAT</div>
          <div class="l-bullet"><span class="l-bullet-dot" />Compatible Linux, macOS, Raspberry Pi, NAS</div>
          <div class="l-bullet"><span class="l-bullet-dot" />Mise à jour automatique de l'agent</div>
        </div>
      </div>

      <div class="l-terminal reveal" ref="termRef">
        <div class="l-terminal-bar">
          <div class="l-term-dots">
            <span style="background:#ff5f56" />
            <span style="background:#ffbd2e" />
            <span style="background:#27c93f" />
          </div>
          <span class="l-term-title">umbra@raspi-home ~ zsh</span>
          <div style="width:48px" /><!-- spacer -->
        </div>
        <div class="l-terminal-body">
          <div
            v-for="line in termLines"
            :key="line.id"
            :class="['l-tline', 'l-tline--' + (line.cls || 'plain')]"
          >{{ line.displayed }}<span v-if="line.typing" class="l-cursor">▋</span></div>
          <span v-if="termLines.length === 0" class="l-cursor">▋</span>
        </div>
      </div>
    </div>
  </section>

  <!-- ─── HOW IT WORKS ─────────────────────────────────────── -->
  <section id="comment" class="l-section">
    <div class="l-section-head reveal">
      <span class="l-tag">Comment</span>
      <h2 class="l-h2">Trois étapes.<br>Et votre réseau est en ligne.</h2>
    </div>

    <div class="l-steps">
      <div
        v-for="(step, i) in steps"
        :key="i"
        class="l-step reveal"
        :style="{ '--delay': i * 120 + 'ms' }"
      >
        <div class="l-step-num">0{{ i + 1 }}</div>
        <div class="l-step-icon">
          <UIcon :name="step.icon" style="width:22px;height:22px" />
        </div>
        <div class="l-step-title">{{ step.title }}</div>
        <div class="l-step-desc">{{ step.desc }}</div>
      </div>
    </div>
  </section>

  <!-- ─── PRICING ──────────────────────────────────────────── -->
  <section id="tarifs" class="l-section">
    <div class="l-section-head reveal">
      <span class="l-tag">Tarifs</span>
      <h2 class="l-h2">Simple et transparent.</h2>
      <p class="l-section-sub">Commencez gratuitement. Passez au niveau supérieur quand vous en avez besoin.</p>
    </div>

    <div class="l-pricing-grid">
      <div
        v-for="plan in plans"
        :key="plan.name"
        :class="['l-plan', 'reveal', { 'l-plan--featured': plan.featured }]"
      >
        <div v-if="plan.featured" class="l-plan-badge">Recommandé</div>
        <div class="l-plan-header">
          <div class="l-plan-name">{{ plan.name }}</div>
          <div class="l-plan-price">
            <span class="l-plan-amount">{{ plan.price }}</span>
            <span class="l-plan-period" v-if="plan.period">{{ plan.period }}</span>
          </div>
          <div class="l-plan-desc">{{ plan.desc }}</div>
        </div>
        <div class="l-plan-features">
          <div v-for="f in plan.features" :key="f" class="l-plan-feat">
            <span class="l-plan-check">✓</span>{{ f }}
          </div>
        </div>
        <a href="#waitlist" class="l-plan-btn" :class="{ 'l-plan-btn--primary': plan.featured }">
          {{ plan.featured ? 'Rejoindre la bêta' : 'Démarrer' }}
        </a>
      </div>
    </div>

    <div class="l-business-bar reveal">
      <div class="l-biz-left">
        <span class="l-biz-title">Business</span>
        <span class="l-biz-sep">·</span>
        <span class="l-biz-desc">Nœuds illimités · Utilisateurs illimités · SSO · Audit logs · SLA 99,9%</span>
      </div>
      <a href="mailto:contact@umbravpn.io" class="l-biz-cta">Nous contacter →</a>
    </div>
  </section>

  <!-- ─── WAITLIST ──────────────────────────────────────────── -->
  <section id="waitlist" class="l-waitlist">
    <div class="l-waitlist-glow" aria-hidden="true" />
    <div class="l-waitlist-glow l-waitlist-glow--2" aria-hidden="true" />

    <div class="l-waitlist-content reveal">
      <span class="l-tag">Bêta privée</span>
      <h2 class="l-h2">Soyez parmi les premiers.</h2>
      <p class="l-waitlist-sub">
        UMBRA est en développement actif. Entrez votre email et on vous prévient
        dès que la bêta privée ouvre ses portes.
      </p>

      <form class="l-form" @submit.prevent="submitCta">
        <input
          v-model="ctaEmail"
          type="email"
          placeholder="votre@email.com"
          class="l-email-input"
          :disabled="ctaSuccess"
          autocomplete="email"
        />
        <button type="submit" class="l-btn" :class="{ 'l-btn--success': ctaSuccess }">
          <span v-if="!ctaSuccess">S'inscrire gratuitement</span>
          <span v-else>✓ Inscription enregistrée</span>
        </button>
      </form>

      <p class="l-form-note">Vos données restent privées. Désinscription en un clic.</p>
    </div>
  </section>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'landing' })

// ─── Email forms ──────────────────────────────────────────────
const heroEmail = ref('')
const ctaEmail  = ref('')
const heroSuccess = ref(false)
const ctaSuccess  = ref(false)

function submitHero() {
  if (!heroEmail.value) return
  heroSuccess.value = true
}
function submitCta() {
  if (!ctaEmail.value) return
  ctaSuccess.value = true
}

// ─── Features ────────────────────────────────────────────────
const features = [
  {
    icon: 'i-lucide-shield-check',
    title: 'Chiffrement WireGuard',
    desc: 'Le protocole VPN le plus rapide et le plus sûr. ChaCha20, Poly1305, Curve25519.',
    color: '#4fffb0', bg: 'rgba(79,255,176,.09)',
  },
  {
    icon: 'i-lucide-home',
    title: '100% auto-hébergé',
    desc: 'Vos données ne quittent jamais votre infrastructure. Zéro dépendance cloud tierce.',
    color: '#7b6ef6', bg: 'rgba(123,110,246,.09)',
  },
  {
    icon: 'i-lucide-network',
    title: 'Réseau mesh P2P',
    desc: 'Connexion directe entre chaque paire de nœuds. Latence minimale, sans proxy central.',
    color: '#4fa8ff', bg: 'rgba(79,168,255,.09)',
  },
  {
    icon: 'i-lucide-cpu',
    title: 'Multi-plateforme',
    desc: 'Linux, macOS, Raspberry Pi, NAS Synology, serveurs VPS — tout ce qui tourne.',
    color: '#ffb74f', bg: 'rgba(255,183,79,.09)',
  },
  {
    icon: 'i-lucide-layout-dashboard',
    title: 'Dashboard élégant',
    desc: 'Interface web moderne. Gérez nœuds, connexions, alertes et clés API en un coup d\'œil.',
    color: '#4fffb0', bg: 'rgba(79,255,176,.09)',
  },
  {
    icon: 'i-lucide-github',
    title: 'Open source',
    desc: 'Code auditable, contributions bienvenues. Forkez, auditez, adaptez à vos besoins.',
    color: '#7b6ef6', bg: 'rgba(123,110,246,.09)',
  },
]

// ─── Steps ────────────────────────────────────────────────────
const steps = [
  {
    icon: 'i-lucide-server',
    title: 'Déployez',
    desc: 'Installez Headscale sur votre propre serveur ou utilisez notre relais cloud mutualisé.',
  },
  {
    icon: 'i-lucide-terminal',
    title: 'Connectez',
    desc: 'Lancez le script d\'installation sur chaque machine. L\'agent configure tout automatiquement.',
  },
  {
    icon: 'i-lucide-globe',
    title: 'Naviguez',
    desc: 'Accédez à tous vos appareils depuis n\'importe où, comme s\'ils étaient sur le même LAN.',
  },
]

// ─── Pricing ─────────────────────────────────────────────────
const plans = [
  {
    name: 'Free',
    price: 'Gratuit',
    period: '',
    desc: 'Pour commencer et découvrir UMBRA.',
    featured: false,
    features: ['5 nœuds', '1 utilisateur', 'Historique 24h', 'Dashboard web', 'Support communauté'],
  },
  {
    name: 'Pro',
    price: '8,90€',
    period: '/mois',
    desc: 'Pour les auto-hébergeurs sérieux.',
    featured: true,
    features: ['25 nœuds', '10 utilisateurs', 'Historique 90j', 'Alertes avancées', 'Clés API', 'Support prioritaire'],
  },
  {
    name: 'Lifetime',
    price: '149€',
    period: ' une fois',
    desc: 'Les fonctionnalités Pro à vie.',
    featured: false,
    features: ['25 nœuds', '10 utilisateurs', 'Historique 90j', 'Mises à jour à vie', 'Pas d\'abonnement'],
  },
]

// ─── Canvas network animation ─────────────────────────────────
const canvasRef = ref<HTMLCanvasElement>()
const heroRef   = ref<HTMLElement>()
let animId = 0

function initCanvas() {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')!
  let W = 0, H = 0

  function resize() {
    W = canvas.width  = canvas.offsetWidth
    H = canvas.height = canvas.offsetHeight
  }
  resize()
  window.addEventListener('resize', resize, { passive: true })

  interface Pt { x: number; y: number; vx: number; vy: number; r: number; color: string }
  const COLS = ['#4fffb0', '#4fffb0', '#7b6ef6', '#4fa8ff']
  const pts: Pt[] = Array.from({ length: 65 }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    vx: (Math.random() - 0.5) * 0.28,
    vy: (Math.random() - 0.5) * 0.28,
    r: Math.random() * 1.4 + 0.4,
    color: COLS[Math.floor(Math.random() * COLS.length)],
  }))

  const MAX_D = 170

  function tick() {
    ctx.clearRect(0, 0, W, H)

    pts.forEach(p => {
      p.x += p.vx; p.y += p.vy
      if (p.x < 0)  p.x += W
      if (p.x > W)  p.x -= W
      if (p.y < 0)  p.y += H
      if (p.y > H)  p.y -= H
    })

    // connections
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const dx = pts[i].x - pts[j].x
        const dy = pts[i].y - pts[j].y
        const d  = Math.sqrt(dx * dx + dy * dy)
        if (d < MAX_D) {
          const a = (1 - d / MAX_D) * 0.13
          ctx.beginPath()
          ctx.moveTo(pts[i].x, pts[i].y)
          ctx.lineTo(pts[j].x, pts[j].y)
          ctx.strokeStyle = `rgba(79,255,176,${a})`
          ctx.lineWidth = 0.5
          ctx.stroke()
        }
      }
    }

    // nodes with glow
    pts.forEach(p => {
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 5)
      g.addColorStop(0, p.color + '45')
      g.addColorStop(1, p.color + '00')
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.r * 5, 0, Math.PI * 2)
      ctx.fillStyle = g
      ctx.fill()

      ctx.beginPath()
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
      ctx.fillStyle = p.color + 'bb'
      ctx.fill()
    })

    animId = requestAnimationFrame(tick)
  }
  tick()
}

// ─── Mouse spotlight ─────────────────────────────────────────
function setupSpotlight() {
  const el = heroRef.value
  if (!el) return
  el.addEventListener('mousemove', (e: MouseEvent) => {
    const r = el.getBoundingClientRect()
    el.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%')
    el.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100) + '%')
  })
}

// ─── Terminal typing ─────────────────────────────────────────
interface TLine { id: number; text: string; cls: string; displayed: string; typing: boolean }
const termLines = ref<TLine[]>([])
const termRef   = ref<HTMLElement>()
let termStarted = false

const TERM_SRC: Array<{ text: string; cls: string; abs?: number }> = [
  { text: '$ curl -sSL https://get.umbravpn.io | bash', cls: 'cmd' },
  { text: '  Téléchargement UMBRA v0.3.0...', cls: 'info', abs: 1500 },
  { text: '  [✓] WireGuard détecté (1.0.20210914)', cls: 'ok', abs: 2000 },
  { text: '  [✓] Interface umbra0 → 100.64.0.1', cls: 'ok', abs: 2450 },
  { text: '  [✓] Service démarré et actif', cls: 'ok', abs: 2900 },
  { text: '  [✓] Nœud enregistré: raspi-home', cls: 'ok', abs: 3350 },
  { text: '', cls: 'plain', abs: 3900 },
  { text: '$ umbra status', cls: 'cmd', abs: 4300 },
  { text: '  ● raspi-home   online   100.64.0.1   3 peers', cls: 'ok', abs: 5150 },
]

function startTerminal() {
  if (termStarted) return
  termStarted = true

  let typeDelay = 600

  TERM_SRC.forEach((src, id) => {
    const delay = src.abs ?? typeDelay

    setTimeout(() => {
      if (src.cls === 'cmd') {
        const line: TLine = { id, text: src.text, cls: src.cls, displayed: '', typing: true }
        termLines.value.push(line)
        let ci = 0
        const iv = setInterval(() => {
          if (ci < src.text.length) { line.displayed += src.text[ci++] }
          else { line.typing = false; clearInterval(iv) }
        }, 22)
      } else {
        termLines.value.push({ id, text: src.text, cls: src.cls, displayed: src.text, typing: false })
      }
    }, delay)

    if (!src.abs) typeDelay += src.text.length * 22 + 380
  })
}

// ─── Scroll reveal ────────────────────────────────────────────
function setupReveal() {
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible')
        obs.unobserve(e.target)
      }
    })
  }, { threshold: 0.08 })
  document.querySelectorAll('.reveal').forEach(el => obs.observe(el))
}

// ─── Terminal intersection trigger ────────────────────────────
const { stop: stopTermObs } = useIntersectionObserver(termRef, ([{ isIntersecting }]) => {
  if (isIntersecting) { startTerminal(); stopTermObs() }
})

onMounted(() => {
  initCanvas()
  setupSpotlight()
  setupReveal()
})
onUnmounted(() => {
  cancelAnimationFrame(animId)
})
</script>

<style scoped>
/* ─── HERO ───────────────────────────────────────────────────── */
.l-hero {
  position: relative;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 120px 28px 100px;
  --mx: 50%; --my: 50%;
}

.l-hero-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0.45;
  pointer-events: none;
}

/* Ambient glow */
.l-hero-glow {
  position: absolute;
  top: 45%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 900px;
  height: 560px;
  background: radial-gradient(ellipse at center,
    rgba(79,255,176,.055) 0%,
    rgba(123,110,246,.04) 35%,
    transparent 70%
  );
  filter: blur(40px);
  pointer-events: none;
}

/* Mouse spotlight */
.l-hero::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(800px circle at var(--mx) var(--my), rgba(79,255,176,.035), transparent 55%);
  pointer-events: none;
  z-index: 1;
}

/* Bottom fade into page */
.l-hero::before {
  content: '';
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: 200px;
  background: linear-gradient(transparent, var(--bg));
  pointer-events: none;
  z-index: 2;
}

.l-hero-content {
  position: relative;
  z-index: 3;
  text-align: center;
  max-width: 700px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* Badge */
.l-badge {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  font-size: 11px;
  color: var(--muted);
  border: 1px solid var(--border2);
  border-radius: 100px;
  padding: 6px 16px;
  text-decoration: none;
  transition: border-color .2s, color .2s;
  margin-bottom: 36px;
  background: rgba(255,255,255,.02);
  letter-spacing: .02em;
}
.l-badge:hover { border-color: rgba(79,255,176,.35); color: var(--text); }
.l-badge-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--accent);
  flex-shrink: 0;
  animation: badge-pulse 2.2s ease-in-out infinite;
}
@keyframes badge-pulse {
  0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(79,255,176,.5); }
  50%       { opacity: .6; box-shadow: 0 0 0 5px rgba(79,255,176,0); }
}
.l-badge-arrow { opacity: .5; }

/* Headline */
.l-h1 {
  font-family: var(--font-disp);
  font-size: clamp(50px, 6.5vw, 84px);
  font-weight: 800;
  line-height: 1.04;
  letter-spacing: -.025em;
  color: var(--text);
  margin-bottom: 28px;
}
.l-grad {
  background: linear-gradient(130deg, var(--accent) 0%, var(--accent2) 55%, var(--pending) 100%);
  background-size: 200% 200%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: grad-shift 5s ease-in-out infinite;
}
@keyframes grad-shift {
  0%,100% { background-position: 0% 50% }
  50%     { background-position: 100% 50% }
}

/* Sub */
.l-hero-sub {
  font-size: 15px;
  color: var(--muted);
  line-height: 1.85;
  margin-bottom: 44px;
  max-width: 520px;
}

/* Form */
.l-form {
  display: flex;
  gap: 8px;
  max-width: 470px;
  width: 100%;
  background: rgba(255,255,255,.03);
  border: 1px solid var(--border2);
  border-radius: 11px;
  padding: 5px;
  margin-bottom: 16px;
  transition: border-color .2s;
}
.l-form:focus-within { border-color: rgba(79,255,176,.4); }
.l-email-input {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  color: var(--text);
  font-family: var(--font-mono);
  font-size: 12px;
  padding: 9px 12px;
  min-width: 0;
}
.l-email-input::placeholder { color: var(--muted); }
.l-btn {
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 600;
  background: var(--accent);
  color: #0a0a0b;
  border: none;
  border-radius: 8px;
  padding: 9px 20px;
  cursor: pointer;
  transition: opacity .18s, transform .18s;
  white-space: nowrap;
  flex-shrink: 0;
}
.l-btn:hover { opacity: .82; transform: translateY(-1px); }
.l-btn--success {
  background: rgba(79,255,176,.12);
  color: var(--accent);
  cursor: default;
  transform: none !important;
  opacity: 1 !important;
}
.l-form-note {
  font-size: 10px;
  color: var(--muted);
  letter-spacing: .04em;
}

/* Scroll cue */
.l-scroll-cue {
  position: absolute;
  bottom: 36px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 3;
  color: var(--muted);
  opacity: .5;
  animation: bob 2.4s ease-in-out infinite;
}
@keyframes bob {
  0%,100% { transform: translateX(-50%) translateY(0); }
  50%     { transform: translateX(-50%) translateY(7px); }
}

/* ─── TRUST BAR ──────────────────────────────────────────────── */
.l-trust {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 14px;
  padding: 18px 28px;
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  margin-bottom: 80px;
}
.l-trust-label {
  font-size: 10px;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: .14em;
  margin-right: 8px;
}
.l-trust-item {
  font-size: 12px;
  color: var(--muted);
}
.l-trust-sep { color: var(--border2); }

/* ─── SHARED SECTION STYLES ──────────────────────────────────── */
.l-section {
  max-width: 1100px;
  margin: 0 auto;
  padding: 80px 28px;
}
.l-section-head {
  text-align: center;
  margin-bottom: 60px;
}
.l-tag {
  display: inline-block;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: .14em;
  color: var(--accent);
  border: 1px solid rgba(79,255,176,.25);
  border-radius: 100px;
  padding: 4px 13px;
  margin-bottom: 22px;
}
.l-h2 {
  font-family: var(--font-disp);
  font-size: clamp(32px, 4vw, 54px);
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -.02em;
  color: var(--text);
  margin-bottom: 16px;
}
.l-section-sub {
  font-size: 14px;
  color: var(--muted);
  line-height: 1.85;
  max-width: 460px;
  margin: 0 auto;
}

/* ─── FEATURES ───────────────────────────────────────────────── */
.l-features-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}
.l-feat-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 28px 24px;
  transition: border-color .25s, transform .25s, box-shadow .25s;
  position: relative;
  overflow: hidden;
  cursor: default;
}
.l-feat-card::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 14px;
  border: 1px solid rgba(79,255,176,.22);
  opacity: 0;
  transition: opacity .25s;
  pointer-events: none;
}
.l-feat-card:hover {
  border-color: transparent;
  transform: translateY(-4px);
  box-shadow: 0 20px 50px rgba(0,0,0,.35);
}
.l-feat-card:hover::after { opacity: 1; }
.l-feat-icon {
  width: 42px; height: 42px;
  border-radius: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 18px;
}
.l-feat-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 9px;
}
.l-feat-desc {
  font-size: 12px;
  color: var(--muted);
  line-height: 1.75;
}

/* ─── TERMINAL DEMO ──────────────────────────────────────────── */
.l-demo {
  background: var(--surface);
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  padding: 90px 0;
}
.l-demo-inner {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 28px;
  display: grid;
  grid-template-columns: 1fr 1.1fr;
  gap: 72px;
  align-items: center;
}
.l-demo-text .l-tag { margin-bottom: 20px; }
.l-demo-p {
  font-size: 14px;
  color: var(--muted);
  line-height: 1.85;
  margin-bottom: 32px;
  max-width: 380px;
}
.l-demo-bullets { display: flex; flex-direction: column; gap: 13px; }
.l-bullet {
  display: flex;
  align-items: center;
  gap: 11px;
  font-size: 12px;
  color: var(--muted);
}
.l-bullet-dot {
  width: 5px; height: 5px;
  border-radius: 50%;
  background: var(--accent);
  flex-shrink: 0;
}

/* Terminal window */
.l-terminal {
  border-radius: 14px;
  border: 1px solid var(--border2);
  overflow: hidden;
  box-shadow: 0 32px 80px rgba(0,0,0,.5), 0 0 0 1px rgba(255,255,255,.04);
}
.l-terminal-bar {
  background: #1a1a20;
  border-bottom: 1px solid var(--border);
  padding: 13px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
}
.l-term-dots {
  display: flex;
  gap: 6px;
}
.l-term-dots span {
  width: 11px; height: 11px;
  border-radius: 50%;
  display: block;
}
.l-term-title {
  font-size: 10px;
  color: var(--muted);
  letter-spacing: .04em;
  flex: 1;
  text-align: center;
}
.l-terminal-body {
  padding: 22px 22px 28px;
  min-height: 230px;
  background: #08080b;
  font-family: var(--font-mono);
  font-size: 12px;
}
.l-tline { line-height: 1.75; white-space: pre; }
.l-tline--cmd  { color: #e8e8f0; }
.l-tline--ok   { color: var(--accent); }
.l-tline--info { color: var(--muted); }
.l-tline--plain { height: .9em; display: block; }
.l-cursor {
  color: var(--accent);
  animation: cursor-blink .75s step-end infinite;
}
@keyframes cursor-blink {
  0%,100% { opacity: 1; }
  50%     { opacity: 0; }
}

/* ─── HOW IT WORKS ───────────────────────────────────────────── */
.l-steps {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0;
  position: relative;
}
/* Connecting gradient line */
.l-steps::before {
  content: '';
  position: absolute;
  top: 78px;
  left: 22%;
  right: 22%;
  height: 1px;
  background: linear-gradient(to right,
    transparent 0%,
    var(--border2) 10%,
    rgba(79,255,176,.5) 50%,
    var(--border2) 90%,
    transparent 100%
  );
}
.l-step { padding: 0 36px; text-align: center; }
.l-step-num {
  font-family: var(--font-disp);
  font-size: 11px;
  font-weight: 700;
  color: var(--accent);
  letter-spacing: .14em;
  margin-bottom: 18px;
}
.l-step-icon {
  width: 58px; height: 58px;
  border-radius: 16px;
  border: 1px solid var(--border2);
  background: var(--surface);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 22px;
  color: var(--text);
  position: relative;
  z-index: 1;
}
.l-step-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 11px;
}
.l-step-desc {
  font-size: 12px;
  color: var(--muted);
  line-height: 1.8;
}

/* ─── PRICING ────────────────────────────────────────────────── */
.l-pricing-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
  margin-bottom: 14px;
}
.l-plan {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 28px 24px;
  display: flex;
  flex-direction: column;
  position: relative;
  transition: border-color .2s;
}
.l-plan--featured {
  border-color: rgba(79,255,176,.35);
  background: rgba(79,255,176,.025);
}
.l-plan-badge {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .06em;
  color: #0a0a0b;
  background: var(--accent);
  border-radius: 100px;
  padding: 3px 13px;
  white-space: nowrap;
}
.l-plan-header {
  margin-bottom: 24px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--border);
}
.l-plan-name {
  font-size: 10px;
  font-weight: 700;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: .12em;
  margin-bottom: 14px;
}
.l-plan-price {
  display: flex;
  align-items: baseline;
  gap: 5px;
  margin-bottom: 11px;
}
.l-plan-amount {
  font-family: var(--font-disp);
  font-size: 34px;
  font-weight: 800;
  color: var(--text);
  letter-spacing: -.02em;
  line-height: 1;
}
.l-plan-period { font-size: 12px; color: var(--muted); }
.l-plan-desc { font-size: 12px; color: var(--muted); line-height: 1.6; }
.l-plan-features {
  display: flex;
  flex-direction: column;
  gap: 11px;
  flex: 1;
  margin-bottom: 24px;
}
.l-plan-feat {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  color: var(--muted);
}
.l-plan-check { color: var(--accent); font-size: 11px; flex-shrink: 0; }
.l-plan-btn {
  display: block;
  text-align: center;
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 500;
  padding: 10px;
  border-radius: 9px;
  text-decoration: none;
  border: 1px solid var(--border2);
  color: var(--muted);
  transition: border-color .2s, color .2s;
}
.l-plan-btn:hover { border-color: var(--text); color: var(--text); }
.l-plan-btn--primary {
  background: var(--accent);
  color: #0a0a0b;
  border-color: var(--accent);
  font-weight: 600;
}
.l-plan-btn--primary:hover { opacity: .83; color: #0a0a0b; }

/* Business banner */
.l-business-bar {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 24px 28px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.l-biz-left {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}
.l-biz-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  flex-shrink: 0;
}
.l-biz-sep { color: var(--border2); flex-shrink: 0; }
.l-biz-desc { font-size: 12px; color: var(--muted); }
.l-biz-cta {
  font-size: 12px;
  color: var(--accent);
  text-decoration: none;
  transition: opacity .15s;
  flex-shrink: 0;
}
.l-biz-cta:hover { opacity: .65; }

/* ─── WAITLIST ───────────────────────────────────────────────── */
.l-waitlist {
  position: relative;
  text-align: center;
  padding: 110px 28px 100px;
  overflow: hidden;
}
.l-waitlist-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 700px;
  height: 380px;
  background: radial-gradient(ellipse at center,
    rgba(79,255,176,.07) 0%,
    rgba(123,110,246,.05) 40%,
    transparent 70%
  );
  filter: blur(55px);
  pointer-events: none;
}
.l-waitlist-glow--2 {
  width: 400px;
  height: 400px;
  opacity: .6;
  filter: blur(80px);
}
.l-waitlist-content {
  position: relative;
  z-index: 1;
  max-width: 560px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.l-waitlist-sub {
  font-size: 14px;
  color: var(--muted);
  line-height: 1.85;
  margin-top: 16px;
  margin-bottom: 40px;
  max-width: 440px;
}

/* ─── REVEAL ANIMATION ───────────────────────────────────────── */
.reveal {
  opacity: 0;
  transform: translateY(28px);
  transition:
    opacity .65s cubic-bezier(.22,1,.36,1) var(--delay, 0ms),
    transform .65s cubic-bezier(.22,1,.36,1) var(--delay, 0ms);
}
.reveal.visible { opacity: 1; transform: translateY(0); }

/* ─── RESPONSIVE ─────────────────────────────────────────────── */
@media (max-width: 960px) {
  .l-features-grid { grid-template-columns: repeat(2, 1fr); }
  .l-pricing-grid  { grid-template-columns: repeat(2, 1fr); }
  .l-demo-inner    { grid-template-columns: 1fr; gap: 44px; }
  .l-steps         { grid-template-columns: 1fr; gap: 36px; }
  .l-steps::before { display: none; }
  .l-step          { padding: 0 16px; }
  .l-step-icon     { margin-left: 0; }
}
@media (max-width: 600px) {
  .l-features-grid { grid-template-columns: 1fr; }
  .l-pricing-grid  { grid-template-columns: 1fr; }
  .l-form          { flex-direction: column; }
  .l-h1            { font-size: 42px; }
  .l-biz-left      { flex-direction: column; align-items: flex-start; gap: 6px; }
  .l-business-bar  { flex-direction: column; align-items: flex-start; }
  .l-footer-inner  { flex-direction: column; gap: 36px; }
  .l-footer-cols   { flex-wrap: wrap; gap: 32px; }
}
</style>