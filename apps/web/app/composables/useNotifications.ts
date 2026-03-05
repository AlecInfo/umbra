export type NotifType = 'success' | 'warning' | 'error' | 'info'

export interface AppNotification {
  id:       string
  type:     NotifType
  message:  string
  duration: number
}

const notifications = ref<AppNotification[]>([])
let _seq = 0

function notify(message: string, type: NotifType = 'success', duration = 4000) {
  const id = String(++_seq)
  notifications.value.push({ id, type, message, duration })
  setTimeout(() => dismiss(id), duration)
}

function dismiss(id: string) {
  notifications.value = notifications.value.filter(n => n.id !== id)
}

export function useNotifications() {
  return { notifications, notify, dismiss }
}
