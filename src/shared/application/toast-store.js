import { reactive } from 'vue'

// Notificaciones globales. Uso: notify({ type: 'success', title: 'Titulo', detail: 'Detalle' })
// type: 'success' | 'error' | 'warning' | 'info'
export const toasts = reactive([])
let seq = 0

export function notify({ type = 'success', title, detail = '', duration = 3800 }) {
  const id = ++seq
  toasts.push({ id, type, title, detail, duration })
  if (toasts.length > 4) toasts.splice(0, toasts.length - 4)
  return id
}

export function dismiss(id) {
  const i = toasts.findIndex(t => t.id === id)
  if (i >= 0) toasts.splice(i, 1)
}