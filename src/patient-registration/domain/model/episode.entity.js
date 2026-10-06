/**
 * Episode aggregate root: one emergency visit of a patient.
 * Mirrors the Episode class from the report class diagram (class_patient.puml).
 */
export class Episode {
    constructor({
        id = null,
        patientId = null,
        arrival = new Date().toISOString(),
        confirmed = false,
        vitalsConfirmedAt = null,
        referred = false
    } = {}) {
        this.id = id
        this.patientId = patientId
        this.arrival = arrival
        this.confirmed = confirmed
        this.vitalsConfirmedAt = vitalsConfirmedAt
        this.referred = referred
    }

    /**
     * Marks the vital signs as confirmed by the staff.
     * Mirrors ConfirmVitals() from the class diagram.
     */
    confirmVitals() {
        this.confirmed = true
        this.vitalsConfirmedAt = new Date().toISOString()
    }

    /**
     * Marks the episode as referred to a specialty.
     * Mirrors MarkReferred() from the class diagram.
     */
    markReferred() {
        this.referred = true
    }
}
