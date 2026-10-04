/**
 * Resource traveling to/from the /triage-classifications endpoint.
 * Represents the flat payload of the fake backend (json-server).
 */
export class ClassificationResource {
    constructor({ id, episodeId, level, suggestedLevel, state, overriddenBy, justification, suggestedAt, confirmedAt }) {
        this.id = id
        this.episodeId = episodeId
        this.level = level
        this.suggestedLevel = suggestedLevel
        this.state = state
        this.overriddenBy = overriddenBy
        this.justification = justification
        this.suggestedAt = suggestedAt
        this.confirmedAt = confirmedAt
    }
}
