import { Alert } from '../domain/model/alert.entity.js'
import { AlertingApi } from './alerting-api.js'

const delay = (ms = 200) => new Promise(r => setTimeout(r, ms))

/**
 * Service of the Alerting bounded context. Loads alerts from the fake
 * backend, generates real alerts from out-of-range vital signs and from
 * high-priority classifications, and persists acknowledgements,
 * escalations and the chronological audit trail.
 */
export class AlertingService {
    constructor() {
        this.api = new AlertingApi()
        this.seq = 0
    }

    /** Loads every persisted alert, oldest first (chronological order). */
    async getActiveAlerts() {
        await delay(120)
        const response = await this.api.getAlerts()
        const list = (response.data || [])
            .map(a => new Alert(a))
            .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)))
        return { data: list }
    }

    /**
     * Creates one alert per vital sign outside its habitual range, plus one
     * critical alert when the patient was classified under priority I or II.
     * @param {Object} input
     * @param {Object} input.episode - Episode ({ id, arrival }).
     * @param {Object} input.patient - Patient record ({ dni, names, surnames }).
     * @param {Array} input.outOfRange - Values outside the habitual range.
     * @param {string} [input.levelCode] - Classified level code (I..V).
     * @returns {Promise<{ok: true, data: Alert[]}>} The alerts created.
     */
    async generateForEpisode({ episode, patient, outOfRange = [], levelCode = null }) {
        const created = []
        const patientName = `${patient.surnames}, ${patient.names}`
        const safeRanges = { spo2: '94-100 %', fc: '60-100 lpm', pa: '100-140 mmHg', temp: '36-38 °C' }
        const labels = { spo2: 'SpO2', fc: 'Frecuencia cardíaca', pa: 'Presión arterial', pas: 'Presión arterial', pad: 'Presión arterial', temp: 'Temperatura' }
        const time = new Date().toTimeString().slice(0, 5)

        for (const o of outOfRange) {
            // SpO2 baja se trata como critica; el resto como advertencia.
            const severity = o.metric === 'spo2' ? 'critical' : 'warning'
            created.push(new Alert({
                id: null,
                patientName,
                priority: levelCode || 'III',
                vitalSign: labels[o.metric] || o.metric,
                dni: patient.dni,
                episode: episode.id,
                time,
                value: `${o.value} ${({ spo2: '%', fc: 'lpm', pa: 'mmHg', pas: 'mmHg', pad: 'mmHg', temp: '°C' })[o.metric] || ''}`,
                safeRange: safeRanges[o.metric] || '',
                severity,
                createdAt: new Date().toISOString()
            }))
        }

        // Paciente clasificado I/II: alerta critica de atencion inmediata.
        if (levelCode === 'I' || levelCode === 'II') {
            created.push(new Alert({
                id: null,
                patientName,
                priority: levelCode,
                vitalSign: 'Clasificación de triaje',
                dni: patient.dni,
                episode: episode.id,
                time,
                value: `Prioridad ${levelCode} confirmada`,
                safeRange: 'Atención inmediata',
                severity: 'critical',
                createdAt: new Date().toISOString()
            }))
        }

        const saved = []
        for (const a of created) {
            const r = await this.api.createAlert({ ...a })
            saved.push(new Alert(r.data))
        }
        return { ok: true, data: saved }
    }

    /** Marks an alert as resolved, stamping the acknowledgement time. */
    async acknowledgeAlert(id, userId = null) {
        await delay(120)
        const response = await this.api.getAlertById(id)
        const a = new Alert(response.data)
        a.severity = 'resolved'
        a.acknowledgedAt = new Date().toISOString()
        const updated = await this.api.updateAlert(id, { ...a })
        return { ok: true, data: new Alert(updated.data) }
    }

    /**
     * Resolves every alert of an episode (e.g. when the referral is
     * completed and the patient leaves the triage flow).
     * @param {string} episodeId - Episode whose alerts are resolved.
     * @returns {Promise<{ok: true, data: Alert[]}>} The alerts updated.
     */
    async resolveByEpisode(episodeId) {
        const response = await this.api.getAlerts()
        const mine = (response.data || []).filter(a => String(a.episode) === String(episodeId))
        const updated = []
        for (const raw of mine) {
            if (raw.severity === 'resolved' || raw.severity === 'escalated') { updated.push(new Alert(raw)); continue }
            const a = new Alert(raw)
            a.severity = 'resolved'
            a.acknowledgedAt = new Date().toISOString()
            const saved = await this.api.updateAlert(a.id, { ...a })
            updated.push(new Alert(saved.data))
        }
        return { ok: true, data: updated }
    }

    /** Escalates an alert to a higher-care destination, persisted for audit. */
    async escalateAlert(id, { userId = null, to = 'Trauma Shock' } = {}) {
        await delay(120)
        const response = await this.api.getAlertById(id)
        const a = new Alert(response.data)
        a.severity = 'escalated'
        a.escalatedAt = new Date().toISOString()
        a.escalatedTo = to
        const updated = await this.api.updateAlert(id, { ...a })
        return { ok: true, data: new Alert(updated.data) }
    }

    /**
     * Chronological audit of alerts within a date range (inclusive).
     * @param {string} [fromDate] - 'YYYY-MM-DD' lower bound.
     * @param {string} [toDate] - 'YYYY-MM-DD' upper bound.
     * @returns {Promise<{ok: true, data: Alert[]}>}
     */
    async getAudit(fromDate, toDate) {
        const response = await this.api.getAlerts()
        let list = (response.data || []).map(a => new Alert(a))
        if (fromDate) list = list.filter(a => String(a.createdAt).slice(0, 10) >= fromDate)
        if (toDate) list = list.filter(a => String(a.createdAt).slice(0, 10) <= toDate)
        list.sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)))
        return { ok: true, data: list }
    }
}
