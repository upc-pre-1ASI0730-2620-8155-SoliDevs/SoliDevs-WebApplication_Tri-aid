/**
 * Incident entity of the Incidents bounded context. An incident is raised
 * when a vital sign falls outside its habitual range or when a patient is
 * classified under a high-priority level.
 */
export class Incident {
    constructor({
        id = null,
        patientName,
        priority,
        vitalSign,
        dni,
        episode,
        time,
        value,
        safeRange,
        severity,
        acknowledgedAt = null,
        escalatedAt = null,
        escalatedTo = null,
        createdAt = new Date().toISOString()
    } = {}) {
        this.id = id
        this.patientName = patientName
        this.priority = priority
        this.vitalSign = vitalSign
        this.dni = dni
        this.episode = episode
        this.time = time
        this.value = value
        this.safeRange = safeRange
        this.severity = severity
        this.acknowledgedAt = acknowledgedAt
        this.escalatedAt = escalatedAt
        this.escalatedTo = escalatedTo
        this.createdAt = createdAt
    }
}
