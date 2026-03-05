export type NotifType = 'success' | 'warning' | 'error' | 'info'

export interface Notification {
  id:       string
  type:     NotifType
  message:  string
  duration: number
}

const notifications = ref<Notification[]>([])

function notify(message: string, type: NotifType = 'success', duration = 4000) {
  const id = Date.now().toString()
  notifications.value.push({ id, type, message, duration })
  setTimeout(() => dismiss(id), duration)
}

function dismiss(id: string) {
  notifications.value = notifications.value.filter(n => n.id !== id)
}

export function useNotifications() {
  return { notifications, notify, dismiss }
}
