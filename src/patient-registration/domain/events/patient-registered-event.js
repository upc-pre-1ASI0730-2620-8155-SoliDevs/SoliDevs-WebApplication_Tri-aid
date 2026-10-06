/**
 * Domain event raised when a new patient is registered.
 * Mirrors PatientRegisteredEvent from the report class diagram.
 */
export class PatientRegisteredEvent {
    constructor({ patientId, occurredAt = new Date().toISOString() } = {}) {
        this.patientId = patientId
        this.occurredAt = occurredAt
    }
}
