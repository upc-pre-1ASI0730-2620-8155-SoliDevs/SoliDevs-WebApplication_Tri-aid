/**
 * Read-only snapshot of everything the patient portal shows. Built from the
 * `/portal/overview` response. The patient never sends an id: the backend
 * resolves everything from the token.
 */
export class PortalOverview {
    constructor({ patient, episode, classification, referral, queue, vitals }) {
        this.patient = patient ? new PortalPatient(patient) : null
        this.episode = episode ? new PortalEpisode(episode) : null
        this.classification = classification ? new PortalClassification(classification) : null
        this.referral = referral ? new PortalReferral(referral) : null
        this.queue = queue ? new QueuePosition(queue) : null
        this.vitals = vitals ? new PortalVitals(vitals) : null
    }

    /** True when the episode has a confirmed or suggested NT-158 level. */
    get hasPriority() { return this.classification !== null }

    /** True when the patient was already routed to a specialty. */
    get isReferred() { return this.referral !== null }

    /** True when the patient was already seen: the episode or the referral is closed. */
    get isAttended() {
        return this.episode?.state === 'Attended' || (!!this.referral && this.referral.state === 'attended')
    }

    /** True when the episode reached the top of the queue (priority I or II). */
    get isEmergency() { return this.hasPriority && this.classification.level <= 2 }
}

export class PortalPatient {
    constructor({ id, dni, fullName, birthDate, email }) {
        this.id = id
        this.dni = dni
        this.fullName = fullName
        this.birthDate = birthDate
        this.email = email
    }

    get firstName() { return (this.fullName || '').split(' ')[0] || '' }

    get initials() {
        return (this.fullName || '').split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase()
    }
}

export class PortalEpisode {
    constructor({ id, arrivalTime, state }) {
        this.id = id
        this.arrivalTime = arrivalTime
        this.state = state
    }
}

/** NT-158 levels with the patient-facing explanation of each one. */
export const TRIAGE_LEVELS = {
    1: { roman: 'I',   key: 'resuscitation', css: 'danger' },
    2: { roman: 'II',  key: 'emergency',     css: 'orange' },
    3: { roman: 'III', key: 'urgent',        css: 'warn' },
    4: { roman: 'IV',  key: 'lessUrgent',    css: 'success' },
    5: { roman: 'V',   key: 'noUrgency',     css: 'meta' }
}

export class PortalClassification {
    constructor({ episodeId, level, state, confirmedAt }) {
        this.episodeId = episodeId
        this.level = level
        this.state = state
        this.confirmedAt = confirmedAt
    }

    get isConfirmed() { return this.state === 'Confirmed' }

    /** Roman numeral of the level (I–V). */
    get roman() { return TRIAGE_LEVELS[this.level]?.roman ?? '—' }

    /** Severity color token name used by the chips. */
    get css() { return TRIAGE_LEVELS[this.level]?.css ?? 'muted' }

    /** i18n key of the level name (portal.level.urgent, ...). */
    get levelKey() { return TRIAGE_LEVELS[this.level]?.key ?? 'pending' }
}

export class PortalReferral {
    constructor({ id, specialty, room, referredAt, state }) {
        this.id = id
        this.specialty = specialty
        this.room = room
        this.referredAt = referredAt
        this.state = state
    }

    get isWaiting() { return this.state === 'waiting' }
}

/** Live queue position: counted on every poll, never stored. */
export class QueuePosition {
    constructor({ ahead, total, estimatedWaitMinutes }) {
        this.ahead = ahead
        this.total = total
        this.estimatedWaitMinutes = estimatedWaitMinutes
    }

    get behind() { return Math.max(this.total - this.ahead - 1, 0) }

    get isNow() { return this.ahead === 0 }
}

/** Vital signs captured by the staff, as stored on the episode. */
export class PortalVitals {
    constructor({ bloodPressure, oxygenSaturation, heartRate, temperature }) {
        this.bloodPressure = bloodPressure
        this.oxygenSaturation = oxygenSaturation
        this.heartRate = heartRate
        this.temperature = temperature
    }

    /** Rows ready to render: key, value, unit, time and icon. Only the captured ones. */
    get rows() {
        const row = (key, e, unit, icon) => e?.value ? { key, value: e.value, unit, time: e.time || '', icon } : null
        return [
            row('bloodPressure', this.bloodPressure, 'mmHg', 'pi-gauge'),
            row('oxygenSaturation', this.oxygenSaturation, '%', 'pi-tint'),
            row('heartRate', this.heartRate, 'lpm', 'pi-wave-pulse'),
            row('temperature', this.temperature, '°C', 'pi-sun')
        ].filter(Boolean)
    }
}
