/**
 * Resource traveling to/from the /referrals endpoint.
 */
export class ReferralResource {
    constructor({ id, episodeId, specialty, room, queuePosition, state, changeReason, referredAt, symptom }) {
        this.id = id
        this.episodeId = episodeId
        this.specialty = specialty
        this.room = room
        this.queuePosition = queuePosition
        this.state = state
        this.changeReason = changeReason
        this.referredAt = referredAt
        this.symptom = symptom
    }
}
