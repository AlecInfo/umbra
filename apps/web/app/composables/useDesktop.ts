/*
| Bridge to the native side, when there is one.
|
| The same Nuxt application is the website, the desktop app and the mobile app —
| Tauri only wraps it in a webview. So every call here has to be safe to reach
| from a plain browser, where the bridge simply does not exist: `available` is
| false and the UI falls back to the copy-paste commands the server already
| returns.
|
| The bridge is read off the window rather than imported from @tauri-apps/api,
| so the web build carries no Tauri code at all. Tauri injects it when
| `withGlobalTauri` is on.
*/

export interface TailscaleStatus {
  installed: boolean
  running: boolean
  ip: string | null
  /** IP of the exit node currently in use, if any. */
  exit_node: string | null
  backend_state: string | null
}

type Invoke = <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>

interface TauriWindow {
  /** Always present in Tauri 2, whatever `withGlobalTauri` is set to. */
  __TAURI_INTERNALS__?: { invoke?: Invoke }
  /** Only when `withGlobalTauri` is on. */
  __TAURI__?: { core?: { invoke: Invoke } }
}

/*
| Looked up on every call rather than cached: the webview evaluates the bundle
| before it injects these, so a value read at module load would be null forever.
*/
function bridge(): Invoke | null {
  if (!import.meta.client) return null
  const w = window as unknown as TauriWindow
  return w.__TAURI_INTERNALS__?.invoke ?? w.__TAURI__?.core?.invoke ?? null
}

/** True inside a Tauri webview — desktop or mobile — false in a browser. */
export function isDesktopApp(): boolean {
  return bridge() !== null
}

export function useDesktop() {
  function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
    const call = bridge()
    if (!call) return Promise.reject(new Error('not running inside the app'))
    return call<T>(cmd, args)
  }

  return {
    available: isDesktopApp(),

    /** Reads local state. Needs no privileges, so it is safe to poll. */
    status: () => invoke<TailscaleStatus>('tailscale_status'),

    /** First connection: joins the mesh and selects the exit node in one step. */
    join: (loginServer: string, authKey: string, exitNode: string) =>
      invoke<string>('tailscale_join', { loginServer, authKey, exitNode }),

    /** Already on the mesh: switching exit node needs no key. */
    setExitNode: (exitNode: string) =>
      invoke<string>('tailscale_set_exit_node', { exitNode }),

    /** Stops routing through an exit node without leaving the mesh. */
    clearExitNode: () => invoke<string>('tailscale_clear_exit_node'),
  }
}
