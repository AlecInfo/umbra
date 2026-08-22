<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import {
  getServerUrl, setServerUrl, getToken, login, logout,
  listNodes, requestConnect, requestDisconnect,
  type NodeSummary,
} from './api'

interface TailscaleStatus {
  installed: boolean
  running: boolean
  ip: string | null
  exit_node: string | null
  backend_state: string | null
}

type Screen = 'server' | 'login' | 'nodes'

const screen  = ref<Screen>('server')
const serverUrl = ref('')
const email = ref('')
const password = ref('')
const busy = ref(false)
const error = ref<string | null>(null)

const nodes = ref<NodeSummary[]>([])
const ts = ref<TailscaleStatus | null>(null)

// Which node the local machine is actually routing through, judged from
// tailscale itself rather than from what the dashboard believes.
const activeNode = computed(() =>
  ts.value?.exit_node
    ? nodes.value.find((n) => n.wireguardIp?.split('/')[0] === ts.value!.exit_node) ?? null
    : null
)

const connectable = computed(() =>
  nodes.value.filter(
    (n) => n.permission !== 'read' && n.status !== 'pending' && n.wireguardIp
  )
)

async function refreshStatus() {
  ts.value = await invoke<TailscaleStatus>('tailscale_status')
}

async function refreshNodes() {
  try {
    nodes.value = (await listNodes()).data
  } catch (e: any) {
    if (String(e.message).includes('Session')) screen.value = 'login'
    else error.value = e.message
  }
}

onMounted(async () => {
  await refreshStatus()
  try {
    const url = await getServerUrl()
    if (!url) return (screen.value = 'server')
    serverUrl.value = url
    screen.value = (await getToken()) ? 'nodes' : 'login'
    if (screen.value === 'nodes') await refreshNodes()
  } catch (e: any) {
    error.value = `Stockage local inaccessible : ${e?.message ?? e}`
  }
})

// tailscale state changes outside this window — someone may run the CLI, or a
// connection may drop — so the status is polled rather than assumed.
let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => { timer = setInterval(refreshStatus, 5000) })
onUnmounted(() => clearInterval(timer))

async function saveServer() {
  if (!serverUrl.value.trim() || busy.value) return
  busy.value = true
  error.value = null
  try {
    let url = serverUrl.value.trim()
    if (!/^https?:\/\//.test(url)) url = `http://${url}`
    if (!/\/api\/v1$/.test(url)) url = `${url.replace(/\/+$/, '')}/api/v1`
    await setServerUrl(url)
    serverUrl.value = url
    screen.value = 'login'
  } catch (e: any) {
    // A rejected store call used to leave the button doing nothing at all.
    error.value = `Impossible d'enregistrer : ${e?.message ?? e}`
  } finally {
    busy.value = false
  }
}

async function doLogin() {
  if (busy.value) return
  busy.value = true
  error.value = null
  try {
    await login(email.value.trim(), password.value)
    password.value = ''
    screen.value = 'nodes'
    await refreshNodes()
  } catch (e: any) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}

async function doLogout() {
  await logout()
  nodes.value = []
  screen.value = 'login'
}

async function connect(node: NodeSummary) {
  if (busy.value) return
  busy.value = true
  error.value = null
  try {
    const cmd = await requestConnect(node.id)
    if (!cmd.exitNodeIp) throw new Error("Ce noeud n'a pas encore d'adresse VPN")

    // Already on the mesh: switching exit node needs no key, and re-running
    // `up --reset` would tear down a working session for nothing.
    if (ts.value?.running) {
      await invoke('tailscale_set_exit_node', { exitNode: cmd.exitNodeIp })
    } else {
      const key = cmd.connectCommand?.match(/--authkey=(\S+)/)?.[1]
      if (!key) throw new Error("Le serveur n'a pas fourni de clé d'enrôlement")
      await invoke('tailscale_join', {
        loginServer: cmd.headscaleUrl,
        authKey: key,
        exitNode: cmd.exitNodeIp,
      })
    }
    await refreshStatus()
  } catch (e: any) {
    error.value = typeof e === 'string' ? e : e.message
  } finally {
    busy.value = false
  }
}

async function disconnect() {
  if (busy.value) return
  busy.value = true
  error.value = null
  try {
    await invoke('tailscale_clear_exit_node')
    await requestDisconnect()
    await refreshStatus()
  } catch (e: any) {
    error.value = typeof e === 'string' ? e : e.message
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <main class="app">
    <header class="head">
      <span class="brand">UMBRA<span class="dot">.</span></span>
      <button v-if="screen === 'nodes'" class="link" @click="doLogout">Déconnexion</button>
    </header>

    <!-- Tailscale is the data plane; without it this client can do nothing. -->
    <div v-if="ts && !ts.installed" class="banner warn">
      Tailscale n'est pas installé sur cette machine.
      <a href="https://tailscale.com/download" target="_blank">Installer</a>
    </div>

    <div v-if="error" class="banner err">{{ error }}</div>

    <section v-if="screen === 'server'" class="panel">
      <h1>Votre serveur</h1>
      <p class="sub">L'adresse de l'instance UMBRA que vous hébergez.</p>
      <input v-model="serverUrl" placeholder="https://umbra.exemple.com" @keyup.enter="saveServer" />
      <button class="primary" :disabled="busy" @click="saveServer">Continuer</button>
    </section>

    <section v-else-if="screen === 'login'" class="panel">
      <h1>Connexion</h1>
      <p class="sub">{{ serverUrl }}</p>
      <input v-model="email" type="email" placeholder="Adresse email" />
      <input v-model="password" type="password" placeholder="Mot de passe" @keyup.enter="doLogin" />
      <button class="primary" :disabled="busy" @click="doLogin">
        {{ busy ? 'Connexion…' : 'Se connecter' }}
      </button>
      <button class="link" @click="screen = 'server'">Changer de serveur</button>
    </section>

    <section v-else class="panel">
      <div v-if="activeNode" class="active">
        <div class="active-label">Connecté via</div>
        <div class="active-name">{{ activeNode.name }}</div>
        <div class="active-ip">{{ ts?.exit_node }}</div>
        <button class="danger" :disabled="busy" @click="disconnect">Déconnecter</button>
      </div>
      <div v-else class="active idle">
        <div class="active-label">Aucune connexion</div>
        <div class="active-sub">Choisissez un noeud de sortie.</div>
      </div>

      <div class="list">
        <button
          v-for="n in connectable"
          :key="n.id"
          class="node"
          :class="{ on: n.id === activeNode?.id }"
          :disabled="busy || n.status === 'offline'"
          @click="connect(n)"
        >
          <span class="dot-status" :class="n.status" />
          <span class="node-info">
            <span class="node-name">{{ n.name }}</span>
            <span class="node-meta">
              {{ [n.city, n.countryCode].filter(Boolean).join(', ') || n.wireguardIp }}
              <template v-if="n.org"> · {{ n.org.name }}</template>
            </span>
          </span>
        </button>

        <p v-if="!connectable.length" class="empty">Aucun noeud disponible.</p>
      </div>
    </section>
  </main>
</template>
