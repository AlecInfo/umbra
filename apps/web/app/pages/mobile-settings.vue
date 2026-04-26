<script setup lang="ts">
definePageMeta({ layout: 'mobile' })

const { t } = useT()
const colorMode = useColorMode()
const isDark = computed(() => colorMode.value === 'dark')

// Toggle states (mock)
const killSwitch    = ref(true)
const autoConnect   = ref(false)
const notifications = ref(true)
const splitTunnel   = ref(false)

// DNS options
const dnsOptions = computed(() => [
  { value: 'auto',       label: t('mset_dns_auto')          },
  { value: 'cloudflare', label: 'Cloudflare (1.1.1.1)'      },
  { value: 'google',     label: 'Google (8.8.8.8)'          },
  { value: 'custom',     label: t('mset_dns_custom')        },
])
const selectedDns  = ref('auto')
const selectedDnsLabel = computed(() => dnsOptions.value.find(o => o.value === selectedDns.value)?.label ?? '')
const showDnsPicker = ref(false)

// Protocol options
const protocolOptions = computed(() => [
  { value: 'wg',     label: 'WireGuard'         },
  { value: 'wg-tcp', label: 'WireGuard over TCP' },
])
const selectedProtocol = ref('wg')
const selectedProtocolLabel = computed(() => protocolOptions.value.find(o => o.value === selectedProtocol.value)?.label ?? '')
const showProtoPicker  = ref(false)

// Subscription sheet
const showSubSheet = ref(false)

// API keys sheet
const showApiSheet = ref(false)
const mockApiKeys = [
  { name: 'Script backup',  masked: 'umbra_sk_a4f2...f4a7c', status: 'active'  },
  { name: 'CI/CD pipeline', masked: 'umbra_sk_b7d3...e6f8',  status: 'active'  },
  { name: 'Test local',     masked: 'umbra_sk_c1e5...b2d4',  status: 'revoked' },
]

// Connection logs sheet
const showLogsSheet = ref(false)
const mockLogs = [
  { type: 'connect',    node: 'raspi-home',     timeKey: 'mset_log_today_1742', detailKey: 'mset_log_d1' },
  { type: 'disconnect', node: 'raspi-home',     timeKey: 'mset_log_today_1610', detailKey: 'mset_log_d2' },
  { type: 'connect',    node: 'vps-fra-01',     timeKey: 'mset_log_today_1405', detailKey: 'mset_log_d3' },
  { type: 'warning',    node: 'nano-annecy',    timeKey: 'mset_log_hier_2318',  detailKey: 'mset_log_d4' },
  { type: 'disconnect', node: 'vps-fra-01',     timeKey: 'mset_log_hier_2130',  detailKey: 'mset_log_d5' },
  { type: 'connect',    node: 'vps-nyc-01',     timeKey: 'mset_log_hier_1855',  detailKey: 'mset_log_d6' },
  { type: 'disconnect', node: 'vps-nyc-01',     timeKey: 'mset_log_hier_1700',  detailKey: 'mset_log_d7' },
  { type: 'connect',    node: 'raspi-lausanne', timeKey: 'mset_log_feb28_0912', detailKey: 'mset_log_d8' },
]

function logIcon(type: string) {
  if (type === 'connect')    return 'i-lucide-log-in'
  if (type === 'disconnect') return 'i-lucide-log-out'
  return 'i-lucide-triangle-alert'
}
function logColor(type: string) {
  if (type === 'connect')    return 'var(--accent)'
  if (type === 'disconnect') return 'var(--muted)'
  return 'var(--warning)'
}

// Disconnect confirmation sheet
const showSignOutSheet = ref(false)
function signOut() {
  showSignOutSheet.value = false
  navigateTo('/login')
}
</script>

<template>
  <div class="ms-shell">

    <!-- ── Header ── -->
    <header class="ms-header">
      <button class="m-icon-btn" @click="navigateTo('/mobile')" :aria-label="t('common_back')">
        <UIcon name="i-lucide-chevron-left" style="width:16px;height:16px" />
      </button>
      <span class="ms-title">{{ t('mset_title') }}</span>
      <div style="width:34px" />
    </header>

    <!-- ── Scrollable content ── -->
    <div class="ms-content">

      <!-- ── COMPTE ── -->
      <div class="ms-section">
        <div class="ms-section-label">{{ t('mset_section_account') }}</div>

        <div class="ms-card">
          <!-- Profile row -->
          <div class="ms-row ms-profile-row">
            <div class="ms-avatar">A</div>
            <div class="ms-profile-info">
              <div class="ms-profile-name">alecptt</div>
              <div class="ms-profile-email">alec@umbravpn.io</div>
            </div>
            <div class="ms-plan-badge">Free</div>
          </div>

          <div class="ms-divider" />

          <button class="ms-row ms-row-tap" @click="showSubSheet = true">
            <span class="ms-row-label">{{ t('mset_manage_sub') }}</span>
            <UIcon name="i-lucide-chevron-right" class="ms-chevron" style="width:12px;height:12px" />
          </button>
        </div>
      </div>

      <!-- ── CONNEXION ── -->
      <div class="ms-section">
        <div class="ms-section-label">{{ t('mset_section_conn') }}</div>

        <div class="ms-card">
          <button class="ms-row ms-row-tap" @click="showProtoPicker = true">
            <span class="ms-row-label">{{ t('mset_protocol') }}</span>
            <span class="ms-row-value">{{ selectedProtocolLabel }}</span>
            <UIcon name="i-lucide-chevron-right" class="ms-chevron" style="width:12px;height:12px" />
          </button>

          <div class="ms-divider" />

          <button class="ms-row ms-row-tap" @click="showDnsPicker = true">
            <span class="ms-row-label">{{ t('mset_dns') }}</span>
            <span class="ms-row-value">{{ selectedDnsLabel }}</span>
            <UIcon name="i-lucide-chevron-right" class="ms-chevron" style="width:12px;height:12px" />
          </button>

          <div class="ms-divider" />

          <div class="ms-row">
            <div class="ms-row-label-wrap">
              <span class="ms-row-label">{{ t('mset_kill_switch') }}</span>
              <span class="ms-row-hint">{{ t('mset_kill_switch_hint') }}</span>
            </div>
            <button class="ms-toggle" :class="{ on: killSwitch }" @click="killSwitch = !killSwitch">
              <span class="ms-toggle-thumb" />
            </button>
          </div>

          <div class="ms-divider" />

          <div class="ms-row">
            <div class="ms-row-label-wrap">
              <span class="ms-row-label">{{ t('mset_auto_connect') }}</span>
              <span class="ms-row-hint">{{ t('mset_auto_connect_hint') }}</span>
            </div>
            <button class="ms-toggle" :class="{ on: autoConnect }" @click="autoConnect = !autoConnect">
              <span class="ms-toggle-thumb" />
            </button>
          </div>

          <div class="ms-divider" />

          <div class="ms-row">
            <div class="ms-row-label-wrap">
              <span class="ms-row-label">{{ t('mset_split_tunnel') }}</span>
              <span class="ms-row-hint">{{ t('mset_split_tunnel_hint') }}</span>
            </div>
            <button class="ms-toggle" :class="{ on: splitTunnel }" @click="splitTunnel = !splitTunnel">
              <span class="ms-toggle-thumb" />
            </button>
          </div>
        </div>
      </div>

      <!-- ── INTERFACE ── -->
      <div class="ms-section">
        <div class="ms-section-label">{{ t('mset_section_ui') }}</div>

        <div class="ms-card">
          <div class="ms-row">
            <span class="ms-row-label">{{ t('mset_theme') }}</span>
            <div class="ms-segment">
              <button class="ms-seg-btn" :class="{ active: !isDark }" @click="colorMode.preference = 'light'">{{ t('mset_theme_light') }}</button>
              <button class="ms-seg-btn" :class="{ active: isDark }"  @click="colorMode.preference = 'dark'">{{ t('mset_theme_dark') }}</button>
            </div>
          </div>

          <div class="ms-divider" />

          <div class="ms-row">
            <div class="ms-row-label-wrap">
              <span class="ms-row-label">{{ t('mset_notifications') }}</span>
              <span class="ms-row-hint">{{ t('mset_notifications_hint') }}</span>
            </div>
            <button class="ms-toggle" :class="{ on: notifications }" @click="notifications = !notifications">
              <span class="ms-toggle-thumb" />
            </button>
          </div>
        </div>
      </div>

      <!-- ── SÉCURITÉ ── -->
      <div class="ms-section">
        <div class="ms-section-label">{{ t('mset_section_security') }}</div>

        <div class="ms-card">
          <button class="ms-row ms-row-tap" @click="showApiSheet = true">
            <span class="ms-row-label">{{ t('mset_api_keys') }}</span>
            <UIcon name="i-lucide-chevron-right" class="ms-chevron" style="width:12px;height:12px" />
          </button>

          <div class="ms-divider" />

          <button class="ms-row ms-row-tap" @click="showLogsSheet = true">
            <span class="ms-row-label">{{ t('mset_conn_logs') }}</span>
            <UIcon name="i-lucide-chevron-right" class="ms-chevron" style="width:12px;height:12px" />
          </button>
        </div>
      </div>

      <!-- ── À PROPOS ── -->
      <div class="ms-section">
        <div class="ms-section-label">{{ t('mset_section_about') }}</div>

        <div class="ms-card">
          <button class="ms-row ms-row-tap" @click="navigateTo('https://umbravpn.io/docs', { external: true, open: { target: '_blank' } })">
            <span class="ms-row-label">{{ t('mset_docs') }}</span>
            <UIcon name="i-lucide-arrow-up-right" class="ms-chevron" style="width:12px;height:12px" />
          </button>

          <div class="ms-divider" />

          <div class="ms-row">
            <span class="ms-row-label">{{ t('mset_version') }}</span>
            <span class="ms-row-value mono">0.2.0-beta</span>
          </div>
        </div>
      </div>

      <!-- ── DÉCONNEXION ── -->
      <div class="ms-section">
        <div class="ms-card">
          <button class="ms-row ms-row-tap ms-row-danger" @click="showSignOutSheet = true">
            <span class="ms-row-label">{{ t('mset_signout_row') }}</span>
          </button>
        </div>
      </div>

      <div class="ms-bottom-spacer" />
    </div>

    <!-- ── Protocol picker sheet ── -->
    <Transition name="sheet">
      <div v-if="showProtoPicker" class="ms-overlay" @click.self="showProtoPicker = false">
        <div class="ms-picker-sheet">
          <div class="ms-sheet-handle" />
          <div class="ms-picker-header">{{ t('mset_protocol') }}</div>
          <div class="ms-picker-list">
            <button
                v-for="opt in protocolOptions"
                :key="opt.value"
                class="ms-picker-row"
                :class="{ selected: selectedProtocol === opt.value }"
                @click="selectedProtocol = opt.value; showProtoPicker = false"
            >
              {{ opt.label }}
              <UIcon v-if="selectedProtocol === opt.value" name="i-lucide-check" style="width:14px;height:14px;color:var(--accent);margin-left:auto" />
            </button>
          </div>
          <div class="ms-sheet-safe" />
        </div>
      </div>
    </Transition>

    <!-- ── DNS picker sheet ── -->
    <Transition name="sheet">
      <div v-if="showDnsPicker" class="ms-overlay" @click.self="showDnsPicker = false">
        <div class="ms-picker-sheet">
          <div class="ms-sheet-handle" />
          <div class="ms-picker-header">{{ t('mset_dns_header') }}</div>
          <div class="ms-picker-list">
            <button
                v-for="opt in dnsOptions"
                :key="opt.value"
                class="ms-picker-row"
                :class="{ selected: selectedDns === opt.value }"
                @click="selectedDns = opt.value; showDnsPicker = false"
            >
              {{ opt.label }}
              <UIcon v-if="selectedDns === opt.value" name="i-lucide-check" style="width:14px;height:14px;color:var(--accent);margin-left:auto" />
            </button>
          </div>
          <div class="ms-sheet-safe" />
        </div>
      </div>
    </Transition>

    <!-- ── Subscription sheet ── -->
    <Transition name="sheet">
      <div v-if="showSubSheet" class="ms-overlay" @click.self="showSubSheet = false">
        <div class="ms-picker-sheet">
          <div class="ms-sheet-handle" />
          <div class="ms-picker-header">{{ t('mset_sub_header') }}</div>

          <div class="ms-sub-body">
            <!-- Plan card -->
            <div class="ms-sub-plan">
              <div class="ms-sub-plan-left">
                <div class="ms-sub-plan-name">Free</div>
                <div class="ms-sub-plan-price">{{ t('mset_sub_current') }}</div>
              </div>
              <div class="ms-plan-badge" style="font-size:10px;padding:4px 10px">{{ t('mset_sub_active') }}</div>
            </div>

            <!-- Usage rows -->
            <div class="ms-sub-usage">
              <div class="ms-sub-usage-row">
                <span class="ms-sub-usage-lbl">{{ t('mset_sub_nodes') }}</span>
                <span class="ms-sub-usage-val">2 / 5</span>
              </div>
              <div class="ms-sub-usage-bar"><div class="ms-sub-usage-fill" style="width: 40%" /></div>

              <div class="ms-sub-usage-row" style="margin-top:10px">
                <span class="ms-sub-usage-lbl">{{ t('mset_api_keys') }}</span>
                <span class="ms-sub-usage-val">1 / 2</span>
              </div>
              <div class="ms-sub-usage-bar"><div class="ms-sub-usage-fill" style="width: 50%" /></div>
            </div>

            <!-- Plans comparatifs -->
            <div class="ms-sub-plans">
              <div class="ms-sub-plan-opt">
                <div class="ms-sub-plan-opt-name">Pro</div>
                <div class="ms-sub-plan-opt-price">8,90 €/mois</div>
                <div class="ms-sub-plan-opt-feat">{{ t('mset_sub_pro_feat') }}</div>
              </div>
              <div class="ms-sub-plan-opt lifetime">
                <div class="ms-sub-plan-opt-name">Lifetime</div>
                <div class="ms-sub-plan-opt-price">149 € unique</div>
                <div class="ms-sub-plan-opt-feat">{{ t('mset_sub_lifetime_feat') }}</div>
              </div>
              <div class="ms-sub-plan-opt business">
                <div class="ms-sub-plan-opt-name">Business</div>
                <div class="ms-sub-plan-opt-price">{{ t('mset_sub_business_price') }}</div>
                <div class="ms-sub-plan-opt-feat">{{ t('mset_sub_business_feat') }}</div>
              </div>
            </div>

            <button class="ms-sheet-btn" @click="showSubSheet = false">{{ t('mset_sub_see_plans') }}</button>
          </div>

          <div class="ms-sheet-safe" />
        </div>
      </div>
    </Transition>

    <!-- ── API keys sheet ── -->
    <Transition name="sheet">
      <div v-if="showApiSheet" class="ms-overlay" @click.self="showApiSheet = false">
        <div class="ms-picker-sheet">
          <div class="ms-sheet-handle" />
          <div class="ms-picker-header">{{ t('mset_api_keys') }}</div>

          <div class="ms-api-body">
            <div v-for="k in mockApiKeys" :key="k.name" class="ms-api-row">
              <div class="ms-api-icon" :class="{ revoked: k.status === 'revoked' }">
                <UIcon name="i-lucide-key" style="width:12px;height:12px" />
              </div>
              <div class="ms-api-info">
                <div class="ms-api-name">{{ k.name }}</div>
                <div class="ms-api-token">{{ k.masked }}</div>
              </div>
              <span class="ms-api-status" :class="k.status">{{ k.status === 'active' ? t('mset_api_active') : t('mset_api_revoked') }}</span>
            </div>

            <div class="ms-api-note">
              <UIcon name="i-lucide-info" style="width:12px;height:12px;flex-shrink:0;color:var(--muted)" />
              {{ t('mset_api_web_only') }}
            </div>
          </div>

          <div class="ms-sheet-safe" />
        </div>
      </div>
    </Transition>

    <!-- ── Connection logs sheet ── -->
    <Transition name="sheet">
      <div v-if="showLogsSheet" class="ms-overlay" @click.self="showLogsSheet = false">
        <div class="ms-picker-sheet ms-logs-sheet">
          <div class="ms-sheet-handle" />
          <div class="ms-picker-header">{{ t('mset_conn_logs') }}</div>

          <div class="ms-logs-list">
            <div v-for="(log, i) in mockLogs" :key="i" class="ms-log-row">
              <div class="ms-log-icon" :style="`background: color-mix(in srgb, ${logColor(log.type)} 12%, transparent); color: ${logColor(log.type)}`">
                <UIcon :name="logIcon(log.type)" style="width:12px;height:12px" />
              </div>
              <div class="ms-log-info">
                <div class="ms-log-node">{{ log.node }}</div>
                <div class="ms-log-detail">{{ t(log.detailKey) }}</div>
              </div>
              <div class="ms-log-time">{{ t(log.timeKey) }}</div>
            </div>
          </div>

          <div class="ms-sheet-safe" />
        </div>
      </div>
    </Transition>

    <!-- ── Sign out confirmation sheet ── -->
    <Transition name="sheet">
      <div v-if="showSignOutSheet" class="ms-overlay" @click.self="showSignOutSheet = false">
        <div class="ms-picker-sheet">
          <div class="ms-sheet-handle" />
          <div class="ms-picker-header">{{ t('mset_signout_header') }}</div>

          <div class="ms-signout-body">
            <div class="ms-signout-icon">
              <UIcon name="i-lucide-log-out" style="width:22px;height:22px" />
            </div>
            <div class="ms-signout-title">{{ t('mset_signout_title') }}</div>
            <div class="ms-signout-sub">{{ t('mset_signout_sub') }}</div>

            <button class="ms-sheet-btn ms-sheet-btn-danger" @click="signOut">{{ t('mset_signout_btn') }}</button>
            <button class="ms-sheet-btn ms-sheet-btn-ghost" @click="showSignOutSheet = false">{{ t('common_cancel') }}</button>
          </div>

          <div class="ms-sheet-safe" />
        </div>
      </div>
    </Transition>

  </div>
</template>

<style scoped>
/* ══════════════════════════════════════════
   SHELL
══════════════════════════════════════════ */
.ms-shell {
  min-height: 100dvh;
  background: var(--bg);
  font-family: var(--font-mono);
  display: flex;
  flex-direction: column;
  position: relative;
}

/* ══════════════════════════════════════════
   HEADER
══════════════════════════════════════════ */
.ms-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px 0;
  padding-top: calc(16px + env(safe-area-inset-top));
  flex-shrink: 0;
}

.m-icon-btn {
  width: 34px;
  height: 34px;
  background: var(--surface);
  border: 1px solid var(--border2);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--muted);
  cursor: pointer;
  transition: all .15s;
}
.m-icon-btn:active { background: var(--surface2); color: var(--text); }

.ms-title {
  font-family: var(--font-disp);
  font-size: 15px;
  font-weight: 700;
  color: var(--text);
  letter-spacing: .02em;
}

/* ══════════════════════════════════════════
   CONTENT
══════════════════════════════════════════ */
.ms-content {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding: 20px 16px 0;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* ── Section ── */
.ms-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ms-section-label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: .12em;
  color: var(--muted);
  text-transform: uppercase;
  padding: 0 4px;
  margin-bottom: 6px;
}

/* ── Card ── */
.ms-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
}

/* ── Row ── */
.ms-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  width: 100%;
  background: transparent;
  border: none;
  cursor: default;
  text-align: left;
}
.ms-row-tap { cursor: pointer; transition: background .12s; }
.ms-row-tap:active { background: var(--surface2); }
.ms-row-danger .ms-row-label { color: var(--offline) !important; }


.ms-row-label {
  font-size: 13px;
  color: var(--text);
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ms-row-label-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}
.ms-row-hint {
  font-size: 10px;
  color: var(--muted);
  line-height: 1.3;
}

.ms-row-value {
  font-size: 12px;
  color: var(--muted);
  white-space: nowrap;
  flex-shrink: 0;
}
.ms-row-value.mono { font-family: var(--font-mono); }

.ms-chevron {
  color: var(--border2);
  flex-shrink: 0;
}

.ms-divider {
  height: 1px;
  background: var(--border);
  margin: 0 14px;
}

/* ── Profile row ── */
.ms-profile-row { padding: 14px; cursor: default; }
.ms-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--accent2), var(--accent));
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-disp);
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
}
.ms-profile-info { flex: 1; display: flex; flex-direction: column; gap: 1px; }
.ms-profile-name { font-size: 13px; font-weight: 600; color: var(--text); }
.ms-profile-email { font-size: 11px; color: var(--muted); }
.ms-plan-badge {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: .08em;
  padding: 3px 8px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--accent) 12%, transparent);
  color: var(--accent);
  border: 1px solid color-mix(in srgb, var(--accent) 25%, transparent);
  flex-shrink: 0;
}

/* ── Toggle ── */
.ms-toggle {
  width: 40px;
  height: 24px;
  border-radius: 12px;
  background: var(--border2);
  border: none;
  cursor: pointer;
  position: relative;
  flex-shrink: 0;
  transition: background .25s;
}
.ms-toggle.on { background: var(--accent); }
.ms-toggle-thumb {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  transition: transform .25s cubic-bezier(.22,1,.36,1);
  box-shadow: 0 1px 3px rgba(0,0,0,.25);
}
.ms-toggle.on .ms-toggle-thumb { transform: translateX(16px); }

/* ── Segmented control ── */
.ms-segment {
  display: flex;
  background: var(--bg);
  border: 1px solid var(--border2);
  border-radius: 7px;
  overflow: hidden;
  flex-shrink: 0;
}
.ms-seg-btn {
  padding: 5px 10px;
  font-family: var(--font-mono);
  font-size: 11px;
  border: none;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  transition: all .15s;
}
.ms-seg-btn.active {
  background: var(--surface);
  color: var(--text);
  box-shadow: inset 0 0 0 1px var(--border2);
}

/* ── Bottom spacer ── */
.ms-bottom-spacer {
  height: calc(env(safe-area-inset-bottom, 16px) + 20px);
  min-height: 36px;
  flex-shrink: 0;
}

/* ══════════════════════════════════════════
   PICKER SHEET
══════════════════════════════════════════ */
.ms-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.6);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  z-index: 200;
  display: flex;
  align-items: flex-end;
}

.ms-picker-sheet {
  width: 100%;
  background: var(--surface);
  border-radius: 20px 20px 0 0;
  border-top: 1px solid var(--border2);
  display: flex;
  flex-direction: column;
}

.ms-sheet-handle {
  width: 36px;
  height: 4px;
  border-radius: 2px;
  background: var(--border2);
  margin: 12px auto 0;
  flex-shrink: 0;
}

.ms-picker-header {
  font-family: var(--font-disp);
  font-size: 13px;
  font-weight: 600;
  color: var(--muted);
  letter-spacing: .06em;
  text-transform: uppercase;
  padding: 14px 18px 8px;
  border-bottom: 1px solid var(--border);
}

.ms-picker-list { padding: 6px 0; }

.ms-picker-row {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 14px 18px;
  background: transparent;
  border: none;
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--text);
  cursor: pointer;
  transition: background .12s;
  text-align: left;
  gap: 8px;
}
.ms-picker-row:active { background: var(--surface2); }
.ms-picker-row.selected { color: var(--accent); }

.ms-sheet-safe {
  height: env(safe-area-inset-bottom, 16px);
  min-height: 12px;
}

/* ── Sheet transition ── */
.sheet-enter-active { transition: opacity .25s ease; }
.sheet-leave-active { transition: opacity .2s ease; }
.sheet-enter-active .ms-picker-sheet,
.sheet-leave-active .ms-picker-sheet { transition: transform .3s cubic-bezier(.22,1,.36,1); }
.sheet-enter-from { opacity: 0; }
.sheet-leave-to   { opacity: 0; }
.sheet-enter-from .ms-picker-sheet { transform: translateY(100%); }
.sheet-leave-to   .ms-picker-sheet { transform: translateY(100%); }

/* ── Sheet generic button ── */
.ms-sheet-btn {
  display: block;
  width: calc(100% - 36px);
  margin: 6px 18px 0;
  padding: 13px;
  border-radius: 10px;
  border: none;
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  text-align: center;
  background: var(--surface2);
  color: var(--text);
  border: 1px solid var(--border2);
  transition: opacity .15s;
}
.ms-sheet-btn:active { opacity: .7; }
.ms-sheet-btn-danger { background: color-mix(in srgb, var(--offline) 14%, transparent); color: var(--offline); border-color: color-mix(in srgb, var(--offline) 25%, transparent); }
.ms-sheet-btn-ghost  { background: transparent; color: var(--muted); border-color: transparent; margin-top: 4px; }

/* ══════════════════════════════════════════
   SUBSCRIPTION SHEET
══════════════════════════════════════════ */
.ms-sub-body { padding: 14px 18px 0; display: flex; flex-direction: column; gap: 12px; }

.ms-sub-plan {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--surface2);
  border: 1px solid var(--border2);
  border-radius: 10px;
  padding: 12px 14px;
}
.ms-sub-plan-name  { font-family: var(--font-disp); font-size: 15px; font-weight: 700; color: var(--text); }
.ms-sub-plan-price { font-size: 11px; color: var(--muted); margin-top: 2px; }

.ms-sub-usage {}
.ms-sub-usage-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
.ms-sub-usage-lbl { font-size: 12px; color: var(--muted); }
.ms-sub-usage-val { font-size: 12px; color: var(--text); }
.ms-sub-usage-bar { height: 4px; background: var(--border2); border-radius: 2px; overflow: hidden; }
.ms-sub-usage-fill { height: 100%; background: var(--accent); border-radius: 2px; }

.ms-sub-plans { display: flex; flex-direction: column; gap: 8px; }
.ms-sub-plan-opt {
  background: var(--surface2); border: 1px solid var(--border2); border-radius: 8px; padding: 10px 12px;
  display: flex; align-items: center; gap: 8px; cursor: pointer; transition: border-color .15s;
}
.ms-sub-plan-opt:active { border-color: var(--accent); }
.ms-sub-plan-opt.lifetime { border-color: color-mix(in srgb, #ffb74f 25%, transparent); }
.ms-sub-plan-opt.lifetime:active { border-color: #ffb74f; }
.ms-sub-plan-opt.business { border-color: color-mix(in srgb, var(--accent2) 25%, transparent); }
.ms-sub-plan-opt.business:active { border-color: var(--accent2); }
.ms-sub-plan-opt-name { font-family: var(--font-disp); font-size: 12px; font-weight: 700; color: var(--text); flex-shrink: 0; width: 56px; }
.ms-sub-plan-opt-price { font-size: 11px; font-weight: 700; color: var(--accent); flex-shrink: 0; width: 80px; }
.ms-sub-plan-opt.lifetime .ms-sub-plan-opt-price { color: #ffb74f; }
.ms-sub-plan-opt.business .ms-sub-plan-opt-price { color: var(--accent2); }
.ms-sub-plan-opt-feat { font-size: 10px; color: var(--muted); flex: 1; line-height: 1.3; }

/* ══════════════════════════════════════════
   API KEYS SHEET
══════════════════════════════════════════ */
.ms-api-body { padding: 8px 0 0; }

.ms-api-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 18px;
}
.ms-api-icon {
  width: 28px;
  height: 28px;
  border-radius: 7px;
  background: color-mix(in srgb, var(--accent) 12%, transparent);
  color: var(--accent);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.ms-api-icon.revoked { background: color-mix(in srgb, var(--muted) 10%, transparent); color: var(--muted); }
.ms-api-info { flex: 1; min-width: 0; }
.ms-api-name  { font-size: 12px; color: var(--text); font-weight: 600; }
.ms-api-token { font-size: 10px; color: var(--muted); font-family: var(--font-mono); margin-top: 1px; }
.ms-api-status { font-size: 10px; font-weight: 700; letter-spacing: .04em; padding: 2px 7px; border-radius: 6px; flex-shrink: 0; }
.ms-api-status.active  { background: color-mix(in srgb, var(--accent) 12%, transparent); color: var(--accent); }
.ms-api-status.revoked { background: color-mix(in srgb, var(--muted) 10%, transparent); color: var(--muted); }

.ms-api-note {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 10px 18px 14px;
  font-size: 11px;
  color: var(--muted);
  line-height: 1.5;
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 10px 12px;
}

/* ══════════════════════════════════════════
   LOGS SHEET
══════════════════════════════════════════ */
.ms-logs-sheet { max-height: 80dvh; }
.ms-logs-list { overflow-y: auto; -webkit-overflow-scrolling: touch; padding: 6px 0; }

.ms-log-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 18px;
}
.ms-log-icon {
  width: 28px;
  height: 28px;
  border-radius: 7px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 1px;
}
.ms-log-info { flex: 1; min-width: 0; }
.ms-log-node   { font-size: 12px; color: var(--text); font-weight: 600; }
.ms-log-detail { font-size: 10px; color: var(--muted); margin-top: 1px; }
.ms-log-time   { font-size: 10px; color: var(--muted); white-space: nowrap; flex-shrink: 0; padding-top: 2px; }

/* ══════════════════════════════════════════
   SIGN OUT SHEET
══════════════════════════════════════════ */
.ms-signout-body {
  padding: 20px 18px 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.ms-signout-icon {
  width: 52px;
  height: 52px;
  border-radius: 16px;
  background: color-mix(in srgb, var(--offline) 12%, transparent);
  color: var(--offline);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 4px;
}
.ms-signout-title { font-family: var(--font-disp); font-size: 16px; font-weight: 700; color: var(--text); }
.ms-signout-sub   { font-size: 12px; color: var(--muted); text-align: center; line-height: 1.5; margin-bottom: 4px; }
</style>