/**
 * Resources traveling to/from the /triage-episodes endpoint.
 * Mirror the TriageEpisodeResource and OpenTriageEpisodeResource records
 * of the triaid-platform RESTful API.
 */
export class TriageEpisodeResource {
    constructor({ id, patientId, arrivalTime, state }) {
        this.id = id
        this.patientId = patientId
        this.arrivalTime = arrivalTime
        this.state = state
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
