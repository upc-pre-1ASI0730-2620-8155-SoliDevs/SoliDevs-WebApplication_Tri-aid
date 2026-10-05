/**
 * Service of the Triage Classification bounded context.
 * Mirrors IClassificationService from the report: SuggestPriority,
 * ApproveSuggestion, ModifyLevel, ResetToSuggestion and Confirm. The suggestion
 * is computed by the NT-158 engine in the frontend; persistence goes against
 * the fake backend (json-server).
 */
import { Classification } from '../domain/model/classification.entity.js'
import { Nt158Engine, nt158Engine } from '../domain/services/nt158-engine.js'
import { TriageApi } from './triage-api.js'
import { ClassificationAssembler } from './classification.assembler.js'

const delay = (ms = 200) => new Promise(r => setTimeout(r, ms))

export class TriageClassificationService {
    constructor(engine = nt158Engine) {
        this.engine = engine
        this.api = new TriageApi()
        this.seq = 0
    }

    #episodesKey = id => String(id)

    /** Finds the episode classification in json-server. */
    async findByEpisode(episodeId) {
        const response = await this.api.getClassificationByEpisode(episodeId)
        const list = response.data || []
        return ClassificationAssembler.toEntity(list[0] || null)
    }

    /** Persists (creates or updates) the classification. */
    async persist(classification) {
        const resource = ClassificationAssembler.toResource(classification)
        if (classification.id) {
            const response = await this.api.updateClassification(classification.id, resource)
            return ClassificationAssembler.toEntity(response.data)
        }
        const response = await this.api.createClassification(resource)
        return ClassificationAssembler.toEntity(response.data)
    }

    /** Suggests a priority level from the vital signs. */
    async suggestPriority(episode, vitals) {
        await delay()
        const result = this.engine.calculatePriority(vitals)
        if (!result.ok) return { ok: false, error: result.error, missing: result.missing }

        let classification = await this.findByEpisode(episode.id)
        if (classification?.isConfirmed) return { ok: true, data: classification, reasons: result.reasons }

        if (!classification) {
            classification = new Classification({ id: null, episodeId: episode.id })
            this.seq = Math.max(this.seq, 0)
        }
        classification.suggest(result.levelKey)
        classification.episodeId = episode.id
        classification = await this.persist(classification)
        return { ok: true, data: classification, reasons: result.reasons }
    }

    /** Approves the system suggestion. */
    async approveSuggestion(episodeId, userId = null) {
        await delay(120)
        const c = await this.findByEpisode(episodeId)
        if (!c) return { ok: false, error: 'classification.error.noSuggestion' }
        const r = c.approve(userId)
        if (!r.ok) return r
        return { ok: true, data: await this.persist(c) }
    }

    /** Modifies the clinical level with mandatory justification. */
    async modifyLevel(episodeId, { level, justification }, userId = null) {
        await delay(120)
        const c = await this.findByEpisode(episodeId)
        if (!c) return { ok: false, error: 'classification.error.noSuggestion' }
        const r = c.override(level, justification, userId)
        if (!r.ok) return r
        return { ok: true, data: await this.persist(c) }
    }

    /** Restores the original suggestion. */
    async resetToSuggestion(episodeId, userId = null) {
        await delay(120)
        const c = await this.findByEpisode(episodeId)
        if (!c) return { ok: false, error: 'classification.error.noSuggestion' }
        const r = c.resetToSuggestion(userId)
        if (!r.ok) return r
        return { ok: true, data: await this.persist(c) }
    }

    /** Confirms the classification and records the triage end time. */
    async confirmClassification(episodeId, userId = null) {
        await delay(180)
        const c = await this.findByEpisode(episodeId)
        if (!c) return { ok: false, error: 'classification.error.noSuggestion' }
        const r = c.confirm(userId)
        if (!r.ok) return r
        return { ok: true, data: await this.persist(c) }
    }

    /** Standard parameters for the triage guide. */
    async getGuide() {
        await delay(100)
        return { ok: true, data: this.engine.guide() }
    }
}

export { Nt158Engine }
