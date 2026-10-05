/**
 * Domain event raised when the staff confirms the vital signs of an
 * episode. Downstream bounded contexts (Triage Classification, Alerting)
 * react to this event.
 */
export class VitalsConfirmedEvent {
    constructor({ episodeId, confirmedAt, vitals }) {
        this.name = 'vitals-confirmed'
        this.episodeId = episodeId
        this.confirmedAt = confirmedAt
        this.vitals = vitals
    }
}
