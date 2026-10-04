// Aggregate Root del Bounded Context: Triage Classification.
// Espeja la clase Classification del diagrama de clases del informe.
import { TriageLevel, levelByKey } from './triage-level.js'

export const ClassificationState = {
  PendingConfirmation: 'PendingConfirmation',
  Assigned: 'Assigned',
  Overridden: 'Overridden',
  Confirmed: 'Confirmed'
}

export class Classification {
  constructor({
    id = null,
    episodeId,
    level = null,
    suggestedLevel = null,
    state = ClassificationState.PendingConfirmation,
    overriddenBy = null,
    justification = null,
    suggestedAt = new Date().toISOString(),
    confirmedAt = null
  } = {}) {
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

  get isOverridden() {
    return this.state === ClassificationState.Overridden
  }

  get isConfirmed() {
    return this.state === ClassificationState.Confirmed
  }

  /** El sistema propone un nivel a partir del motor NT-158. */
  suggest(levelKey) {
    this.suggestedLevel = levelKey
    this.level = levelKey
    this.state = ClassificationState.PendingConfirmation
    this.suggestedAt = new Date().toISOString()
    return this
  }

  /** La enfermera aprueba la sugerencia del sistema (US20). */
  approve(userId = null) {
    if (!this.suggestedLevel) return { ok: false, error: 'classification.error.noSuggestion' }
    this.level = this.suggestedLevel
    this.state = ClassificationState.Assigned
    this.overriddenBy = null
    this.justification = null
    return { ok: true }
  }

  /** La enfermera modifica el nivel clínico (US21) y debe justificarlo (US22). */
  override(newLevelKey, justification, userId = null) {
    if (!levelByKey(newLevelKey)) return { ok: false, error: 'classification.error.invalidLevel' }
    if (!String(justification || '').trim()) return { ok: false, error: 'classification.error.justificationRequired' }
    this.level = newLevelKey
    this.state = ClassificationState.Overridden
    this.overriddenBy = userId
    this.justification = String(justification).trim()
    return { ok: true }
  }

  /** La enfermera se retracta y vuelve a la sugerencia original (US21, escenario 2). */
  resetToSuggestion(userId = null) {
    if (!this.suggestedLevel) return { ok: false, error: 'classification.error.noSuggestion' }
    this.level = this.suggestedLevel
    this.state = ClassificationState.Assigned
    this.overriddenBy = null
    this.justification = null
    return { ok: true }
  }

  /** Cierra la clasificación con estampa de tiempo inalterable (US24). */
  confirm(userId = null) {
    if (!this.level) return { ok: false, error: 'classification.error.noLevel' }
    this.state = ClassificationState.Confirmed
    this.confirmedAt = new Date().toISOString()
    return { ok: true }
  }

  static fromJSON(o) {
    return new Classification(o)
  }
}

export { TriageLevel }
