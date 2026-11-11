/**
 * Resources traveling to/from the /triage-episodes endpoint.
 * Mirror the TriageEpisodeResource and OpenTriageEpisodeResource records
 * of the triaid-platform RESTful API.
 */
export class TriageEpisodeResource {
    constructor({ id, patientId, arrivalTime, state, vitals }) {
        this.id = id
        this.patientId = patientId
        this.arrivalTime = arrivalTime
        this.state = state
        this.vitals = vitals
    }
}

export class OpenTriageEpisodeResource {
    constructor({ patientId }) {
        this.patientId = patientId
    }
}

/**
 * Episode states of the API (EEpisodeState).
 * @readonly
 */
export const EpisodeState = {
    Waiting: 'Waiting',
    InTriage: 'InTriage',
    Attended: 'Attended',
    Referred: 'Referred'
}
