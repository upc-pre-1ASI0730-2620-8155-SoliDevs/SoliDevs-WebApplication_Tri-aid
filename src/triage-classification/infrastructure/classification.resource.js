/**
 * Resource que viaja hacia/desde el endpoint /triage-classifications.
 * Representa el payload plano del backend falso (json-server).
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
