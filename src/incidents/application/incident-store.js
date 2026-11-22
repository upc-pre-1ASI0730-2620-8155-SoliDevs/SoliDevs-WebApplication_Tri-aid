import { reactive, computed } from 'vue'

// Real incidents come from the Incidents bounded context (persisted and
// generated at runtime). Internal bell shape:
// { id, level: 'critical' | 'warning' | 'info', title, detail, time, read, episodeId }
export const incidentStore = reactive({ items: [] })

export const unreadCount = computed(() => incidentStore.items.filter(i => !i.read).length)

/**
 * Maps an Incident entity (patientName, vitalSign, severity, value...) to the
 * bell-notification shape used across the shared notification bell.
 * @param {Object} i - Incident entity or raw persisted incident.
 * @returns {Object} Bell item with level, title, detail, time and read flag.
 */
export function toBellItem(i) {
    const severity = i.severity || i.level || 'info'
    const level = severity === 'escalated' ? 'critical' : severity
    const time = i.time || (i.createdAt ? new Date(i.createdAt).toTimeString().slice(0, 5) : '')
    return {
        id: i.id,
        level,
        title: i.title || (i.vitalSign ? `${i.vitalSign}: ${i.value ?? ''}` : 'Incidencia'),
        detail: i.detail || (i.patientName ? `${i.patientName}${i.safeRange ? ' · ' + i.safeRange : ''}` : ''),
        time,
        read: i.read ?? (severity === 'resolved' || severity === 'escalated'),
        episodeId: i.episodeId || i.episode || null
    }
}

/**
 * Pushes one or more incidents into the bell store, mapped to the bell shape.
 * @param {Array<Object>} incidents - Incident entities or raw incidents.
 */
export function pushIncidents(incidents) {
    for (const i of incidents) incidentStore.items.push(toBellItem(i))
}
