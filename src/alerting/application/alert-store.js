import { reactive, computed } from 'vue'

// Las alertas reales vienen del Alerting bounded context (persistidas y
// generadas en runtime). Forma interna de la campanita:
// { id, level: 'critical' | 'warning' | 'info', title, detail, time, read, episodeId }
export const alertStore = reactive({ items: [] })

export const unreadCount = computed(() => alertStore.items.filter(a => !a.read).length)

/**
 * Maps an Alert entity (patientName, vitalSign, severity, value...) to the
 * bell-notification shape used across the shared notification bell.
 * @param {Object} a - Alert entity or raw persisted alert.
 * @returns {Object} Bell item with level, title, detail, time and read flag.
 */
export function toBellItem(a) {
    const severity = a.severity || a.level || 'info'
    const level = severity === 'escalated' ? 'critical' : severity
    const time = a.time || (a.createdAt ? new Date(a.createdAt).toTimeString().slice(0, 5) : '')
    return {
        id: a.id,
        level,
        title: a.title || (a.vitalSign ? `${a.vitalSign}: ${a.value ?? ''}` : 'Alerta'),
        detail: a.detail || (a.patientName ? `${a.patientName}${a.safeRange ? ' · ' + a.safeRange : ''}` : ''),
        time,
        read: a.read ?? (severity === 'resolved' || severity === 'escalated'),
        episodeId: a.episodeId || a.episode || null
    }
}

/**
 * Pushes one or more alerts into the bell store, mapped to the bell shape.
 * @param {Array<Object>} alerts - Alert entities or raw alerts.
 */
export function pushAlerts(alerts) {
    for (const a of alerts) alertStore.items.push(toBellItem(a))
}
