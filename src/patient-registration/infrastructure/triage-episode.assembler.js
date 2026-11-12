/**
 * Translates the /triage-episodes resource of the RESTful API into the
 * episode record kept in the Patient Registration store.
 */
import { EpisodeState, OpenTriageEpisodeResource, TriageEpisodeResource } from './triage-episode.resource.js'

// The API returns ArrivalTime as UTC without an offset; mark it as UTC so
// the browser shows the local time.
const asUtc = value => (value && !/Z$|[+-]\d{2}:\d{2}$/.test(value) ? `${value}Z` : value)

// The API stores the confirmed readings as a JSON payload.
const parseVitals = raw => {
    try { return raw ? JSON.parse(raw) : {} } catch { return {} }
}

export class TriageEpisodeAssembler {
    static toStoreModel(data, patient) {
        const resource = new TriageEpisodeResource(data)
        return {
            id: String(resource.id),
            patientId: resource.patientId,
            key: String(resource.patientId),
            patient,
            arrival: new Date(asUtc(resource.arrivalTime)).toISOString(),
            state: resource.state,
            vitals: parseVitals(resource.vitals),
            confirmed: resource.state !== EpisodeState.Waiting,
            referred: resource.state === EpisodeState.Referred
        }
    }

    static toOpenResource(patientId) {
        return new OpenTriageEpisodeResource({ patientId })
    }
}
