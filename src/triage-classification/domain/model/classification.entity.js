/**
 * Aggregate Root of the Triage Classification bounded context.
 * Mirrors the Classification class from the report class diagram.
 */
import { TriageLevel, levelByKey } from '../../../shared/domain/shared-kernel/triage-level.js'

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

  /**
   * Stores the level computed by the NT-158 engine and moves the
   * classification to PendingConfirmation, refreshing the suggestion time.
   * @param {string} levelKey - TriageLevel key proposed by the engine.
   * @returns {Classification} this, for chaining.
   */
  suggest(levelKey) {
    this.suggestedLevel = levelKey
    this.level = levelKey
    this.state = ClassificationState.PendingConfirmation
    this.suggestedAt = new Date().toISOString()
    return this
  }

  /**
   * Makes the suggested level official. The state moves to Assigned and any
   * previous override is discarded. The classification can still be modified
   * or reset until it gets confirmed.
   * @param {string|null} userId - Staff member performing the action.
   * @returns {{ok: boolean, error?: string}} Result of the operation.
   */
  approve(userId = null) {
    if (!this.suggestedLevel) return { ok: false, error: 'classification.error.noSuggestion' }
    this.level = this.suggestedLevel
    this.state = ClassificationState.Assigned
    this.overriddenBy = null
    this.justification = null
    return { ok: true }
  }

  /**
   * Applies a different level chosen by the staff based on clinical judgement.
   * A written justification is mandatory: without it the change is rejected.
   * The state moves to Overridden and the justification is kept for audit.
   * @param {string} newLevelKey - TriageLevel key selected by the staff.
   * @param {string} justification - Clinical reason for the change.
   * @param {string|null} userId - Staff member performing the action.
   * @returns {{ok: boolean, error?: string}} Result; fails when the level is
   * invalid or the justification is empty.
   */
  override(newLevelKey, justification, userId = null) {
    if (!levelByKey(newLevelKey)) return { ok: false, error: 'classification.error.invalidLevel' }
    if (!String(justification || '').trim()) return { ok: false, error: 'classification.error.justificationRequired' }
    this.level = newLevelKey
    this.state = ClassificationState.Overridden
    this.overriddenBy = userId
    this.justification = String(justification).trim()
    return { ok: true }
  }

  /**
   * Discards the override and restores the level originally proposed by the
   * engine, moving the state back to Assigned and clearing the justification.
   * @param {string|null} userId - Staff member performing the action.
   * @returns {{ok: boolean, error?: string}} Result of the operation.
   */
  resetToSuggestion(userId = null) {
    if (!this.suggestedLevel) return { ok: false, error: 'classification.error.noSuggestion' }
    this.level = this.suggestedLevel
    this.state = ClassificationState.Assigned
    this.overriddenBy = null
    this.justification = null
    return { ok: true }
  }

  /**
   * Seals the classification: the state moves to Confirmed and the current
   * time is stamped as the immutable end of the triage assessment.
   * @param {string|null} userId - Staff member performing the action.
   * @returns {{ok: boolean, error?: string}} Result of the operation.
   */
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
