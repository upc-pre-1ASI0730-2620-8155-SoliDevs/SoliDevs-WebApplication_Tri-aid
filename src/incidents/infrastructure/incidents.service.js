import { Incident } from '../domain/model/incident.entity.js'
import { IncidentsApi } from './incidents-api.js'

const delay = (ms = 200) => new Promise(r => setTimeout(r, ms))

/**
 * Service of the Incidents bounded context. Loads incidents from the
 * platform API, generates real incidents from out-of-range vital signs
 * and from high-priority classifications, and persists acknowledgements,
 * escalations and the chronological audit trail.
 */
export class IncidentsService {
    constructor() {
        this.api = new IncidentsApi()
        this.seq = 0
    }

    /** Loads every persisted incident, oldest first (chronological order). */
    async getActiveIncidents() {
        await delay(120)
        const response = await this.api.getIncidents()
        // Every incident comes back: the board offers "hide resolved" so the
        // staff can review what was already acted upon during the shift.
        const list = (response.data || [])
            .map(i => new Incident(i))
            .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)))
        return { data: list }
    }

    /**
     * Creates one incident per vital sign outside its habitual range, plus one
     * critical incident when the patient was classified under priority I or II.
     * @param {Object} input
     * @param {Object} input.episode - Episode ({ id, arrival }).
     * @param {Object} input.patient - Patient record ({ dni, names, surnames }).
     * @param {Array} input.outOfRange - Values outside the habitual range.
     * @param {string} [input.levelCode] - Classified level code (I..V).
     * @returns {Promise<{ok: true, data: Incident[]}>} The incidents created.
     */
    async generateForEpisode({ episode, patient, outOfRange = [], levelCode = null }) {
        const created = []
        const patientName = `${patient.surnames}, ${patient.names}`
        const safeRanges = { spo2: '94-100 %', fc: '60-100 lpm', pa: '100-140 mmHg', temp: '36-38 °C' }
        const labels = { spo2: 'SpO2', fc: 'Frecuencia cardíaca', pa: 'Presión arterial', pas: 'Presión arterial', pad: 'Presión arterial', temp: 'Temperatura' }
        const time = new Date().toTimeString().slice(0, 5)

        for (const o of outOfRange) {
            const severity = o.metric === 'spo2' ? 'critical' : 'warning'
            created.push(new Incident({
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

        if (levelCode === 'I' || levelCode === 'II') {
            created.push(new Incident({
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
            const r = await this.api.createIncident({ ...a })
            saved.push(new Incident(r.data))
        }
        return { ok: true, data: saved }
    }

    /** Marks an incident as resolved, stamping the acknowledgement time. */
    async acknowledgeIncident(id, userId = null) {
        await delay(120)
        const response = await this.api.getIncidentById(id)
        const a = new Incident(response.data)
        a.severity = 'resolved'
        a.acknowledgedAt = new Date().toISOString()
        const updated = await this.api.updateIncident(id, { ...a })
        return { ok: true, data: new Incident(updated.data) }
    }

    /**
     * Resolves every incident of an episode (e.g. when the referral is
     * completed and the patient leaves the triage flow).
     * @param {string} episodeId - Episode whose incidents are resolved.
     * @returns {Promise<{ok: true, data: Incident[]}>} The incidents updated.
     */
    async resolveByEpisode(episodeId) {
        const response = await this.api.getIncidents()
        const mine = (response.data || []).filter(a => String(a.episode) === String(episodeId))
        const updated = []
        for (const raw of mine) {
            if (raw.severity === 'resolved' || raw.severity === 'escalated') { updated.push(new Incident(raw)); continue }
            const a = new Incident(raw)
            a.severity = 'resolved'
            a.acknowledgedAt = new Date().toISOString()
            const saved = await this.api.updateIncident(a.id, { ...a })
            updated.push(new Incident(saved.data))
        }
        return { ok: true, data: updated }
    }

    /** Escalates an incident to a higher-care destination, persisted for audit. */
    async escalateIncident(id, { userId = null, to = 'Trauma Shock' } = {}) {
        await delay(120)
        const response = await this.api.getIncidentById(id)
        const a = new Incident(response.data)
        a.severity = 'escalated'
        a.escalatedAt = new Date().toISOString()
        a.escalatedTo = to
        const updated = await this.api.updateIncident(id, { ...a })
        return { ok: true, data: new Incident(updated.data) }
    }

    /**
     * Chronological audit of incidents within a date range (inclusive).
     * @param {string} [fromDate] - 'YYYY-MM-DD' lower bound.
     * @param {string} [toDate] - 'YYYY-MM-DD' upper bound.
     * @returns {Promise<{ok: true, data: Incident[]}>}
     */
    async getAudit(fromDate, toDate) {
        const response = await this.api.getIncidents()
        let list = (response.data || []).map(i => new Incident(i))
        if (fromDate) list = list.filter(a => String(a.createdAt).slice(0, 10) >= fromDate)
        if (toDate) list = list.filter(a => String(a.createdAt).slice(0, 10) <= toDate)
        list.sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)))
        return { ok: true, data: list }
    }
}
