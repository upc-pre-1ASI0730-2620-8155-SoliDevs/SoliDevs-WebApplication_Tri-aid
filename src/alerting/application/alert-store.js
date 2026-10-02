import { reactive, computed } from 'vue'

// Las alertas reales vendrán de la sección Alertas (y luego del backend).
// Mientras no esté conectada, la lista está vacía: aquí NO se inventan alertas.
// Forma esperada: { id, level: 'critical' | 'warning' | 'info', title, detail, time, read, episodeId }
export const alertStore = reactive({ items: [] })

export const unreadCount = computed(() => alertStore.items.filter(a => !a.read).length)