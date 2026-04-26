export type NotifType = 'success' | 'warning' | 'error' | 'info'

export interface AppNotification {
  id:           string
  type:         NotifType
  title:        string
  description?: string
  duration:     number
}

export interface NotifyOptions {
  title:        string
  description?: string
  type?:        NotifType
  duration?:    number
}

const notifications = ref<AppNotification[]>([])
let _seq = 0

function notify(
  arg1: string | NotifyOptions,
  type: NotifType = 'success',
  duration = 4000,
) {
  const id = String(++_seq)
  const item: AppNotification = typeof arg1 === 'string'
    ? { id, type, title: arg1, duration }
    : {
        id,
        type:        arg1.type ?? 'success',
        title:       arg1.title,
        description: arg1.description,
        duration:    arg1.duration ?? 4000,
      }
  notifications.value.push(item)
  setTimeout(() => dismiss(id), item.duration)
}

function dismiss(id: string) {
  notifications.value = notifications.value.filter(n => n.id !== id)
}

export function useNotifications() {
  return { notifications, notify, dismiss }
}
