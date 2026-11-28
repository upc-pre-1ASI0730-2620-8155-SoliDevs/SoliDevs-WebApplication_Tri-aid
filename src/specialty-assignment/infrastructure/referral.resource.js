/**
 * Resource traveling to/from the /referrals endpoint.
 */
export class ReferralResource {
    constructor({ id, episodeId, specialty, room, queuePosition, state, changeReason, referredAt, symptom }) {
        this.id = id
        // ADR-010: the API takes the episode identifier as a string.
        this.episodeId = episodeId === undefined || episodeId === null ? episodeId : String(episodeId)
        this.specialty = specialty
        this.room = room
        this.queuePosition = queuePosition
        this.state = state
        this.changeReason = changeReason
        this.referredAt = referredAt
        this.symptom = symptom
    }
}
