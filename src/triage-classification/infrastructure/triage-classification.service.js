// Servicio del Bounded Context Triage Classification.
// Espeja la interfaz IClassificationService del informe: SuggestPriority,
// ApproveSuggestion, ModifyLevel, ResetToSuggestion y Confirm. Hoy resuelve
// contra el store en memoria; TODO: apuntar al Web Service (ASP.NET Core).
import { Classification } from '../domain/model/classification.entity.js'
import { Nt158Engine, nt158Engine } from '../domain/services/nt158-engine.js'
import { findClassification, saveClassification } from '../application/triage-store.js'

const delay = (ms = 250) => new Promise(r => setTimeout(r, ms))

export class TriageClassificationService {
  constructor(engine = nt158Engine) {
    this.engine = engine
    this.seq = 0
  }

  /** Sugiere un nivel de prioridad a partir de los signos vitales (US19). */
  async suggestPriority(episode, vitals) {
    const result = this.engine.calculatePriority(vitals)
    if (!result.ok) return { ok: false, error: result.error, missing: result.missing }

    let classification = findClassification(episode.id)
    if (!classification) {
      classification = new Classification({ id: ++this.seq, episodeId: episode.id })
    }
    // Si ya estaba confirmada no se vuelve a sugerir.
    if (classification.isConfirmed) return { ok: true, data: classification, reasons: result.reasons }

    classification.suggest(result.levelKey)
    saveClassification(classification)
    return { ok: true, data: classification, reasons: result.reasons }
  }

  /** Aprueba la sugerencia del sistema (US20). */
  async approveSuggestion(episodeId, userId = null) {
    await delay(120)
    const c = findClassification(episodeId)
    if (!c) return { ok: false, error: 'classification.error.noSuggestion' }
    const r = c.approve(userId)
    if (r.ok) saveClassification(c)
    return { ...r, data: c }
  }

  /** Modifica el nivel clínico con justificación obligatoria (US21, US22). */
  async modifyLevel(episodeId, { level, justification }, userId = null) {
    await delay(120)
    const c = findClassification(episodeId)
    if (!c) return { ok: false, error: 'classification.error.noSuggestion' }
    const r = c.override(level, justification, userId)
    if (r.ok) saveClassification(c)
    return { ...r, data: c }
  }

  /** Restablece la sugerencia original (US21, escenario 2). */
  async resetToSuggestion(episodeId, userId = null) {
    await delay(120)
    const c = findClassification(episodeId)
    if (!c) return { ok: false, error: 'classification.error.noSuggestion' }
    const r = c.resetToSuggestion(userId)
    if (r.ok) saveClassification(c)
    return { ...r, data: c }
  }

  /** Confirma la clasificación y registra la hora de fin del triaje (US24). */
  async confirmClassification(episodeId, userId = null) {
    await delay(180)
    const c = findClassification(episodeId)
    if (!c) return { ok: false, error: 'classification.error.noSuggestion' }
    const r = c.confirm(userId)
    if (r.ok) saveClassification(c)
    return { ...r, data: c }
  }

  /** Parámetros de la norma técnica para la guía de triaje (US23). */
  async getGuide() {
    await delay(100)
    return { ok: true, data: this.engine.guide() }
  }
}

export { Nt158Engine }
