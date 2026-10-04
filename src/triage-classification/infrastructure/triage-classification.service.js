// Servicio del Bounded Context Triage Classification.
// Espeja IClassificationService del informe: SuggestPriority, ApproveSuggestion,
// ModifyLevel, ResetToSuggestion y Confirm. La sugerencia la calcula el motor
// NT-158 en el frontend; la persistencia va contra el backend falso (json-server).
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

    /** Busca la clasificacion del episodio en json-server. */
    async findByEpisode(episodeId) {
        const response = await this.api.getClassificationByEpisode(episodeId)
        const list = response.data || []
        return ClassificationAssembler.toEntity(list[0] || null)
    }

    /** Guarda (crea o actualiza) la clasificacion. */
    async persist(classification) {
        const resource = ClassificationAssembler.toResource(classification)
        if (classification.id) {
            const response = await this.api.updateClassification(classification.id, resource)
            return ClassificationAssembler.toEntity(response.data)
        }
        const response = await this.api.createClassification(resource)
        return ClassificationAssembler.toEntity(response.data)
    }

    /** Sugiere un nivel de prioridad a partir de los signos vitales (US19). */
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

    /** Aprueba la sugerencia del sistema (US20). */
    async approveSuggestion(episodeId, userId = null) {
        await delay(120)
        const c = await this.findByEpisode(episodeId)
        if (!c) return { ok: false, error: 'classification.error.noSuggestion' }
        const r = c.approve(userId)
        if (!r.ok) return r
        return { ok: true, data: await this.persist(c) }
    }

    /** Modifica el nivel clinico con justificacion obligatoria (US21, US22). */
    async modifyLevel(episodeId, { level, justification }, userId = null) {
        await delay(120)
        const c = await this.findByEpisode(episodeId)
        if (!c) return { ok: false, error: 'classification.error.noSuggestion' }
        const r = c.override(level, justification, userId)
        if (!r.ok) return r
        return { ok: true, data: await this.persist(c) }
    }

    /** Restablece la sugerencia original (US21, escenario 2). */
    async resetToSuggestion(episodeId, userId = null) {
        await delay(120)
        const c = await this.findByEpisode(episodeId)
        if (!c) return { ok: false, error: 'classification.error.noSuggestion' }
        const r = c.resetToSuggestion(userId)
        if (!r.ok) return r
        return { ok: true, data: await this.persist(c) }
    }

    /** Confirma la clasificacion y registra la hora de fin del triaje (US24). */
    async confirmClassification(episodeId, userId = null) {
        await delay(180)
        const c = await this.findByEpisode(episodeId)
        if (!c) return { ok: false, error: 'classification.error.noSuggestion' }
        const r = c.confirm(userId)
        if (!r.ok) return r
        return { ok: true, data: await this.persist(c) }
    }

    /** Parametros de la norma tecnica para la guia de triaje (US23). */
    async getGuide() {
        await delay(100)
        return { ok: true, data: this.engine.guide() }
    }
}

export { Nt158Engine }
