/**
 * Aggregate Root of the Specialty Assignment bounded context.
 * Mirrors the Referral class from the report class diagram.
 */
import { levelByCode } from '../../../triage-classification/domain/model/triage-level.js'

export const ReferralState = {
  Referred: 'Referred',
  Reassigned: 'Reassigned',
  InAttention: 'InAttention',
  Attended: 'Attended'
}

export class Referral {
  constructor({
    id = null,
    episodeId,
    specialty,
    room = '',
    queuePosition = 0,
    state = ReferralState.Referred,
    changeReason = null,
    referredAt = new Date().toISOString(),
    symptom = ''
  } = {}) {
    this.id = id
    this.episodeId = episodeId
    this.specialty = specialty
    this.room = room
    this.queuePosition = queuePosition
    this.state = state
    this.changeReason = changeReason
    this.referredAt = referredAt
    this.symptom = symptom
  }

  /**
   * Reassigns the patient to a different specialty. A written reason is
   * mandatory, otherwise the change is rejected. The state moves to
   * Reassigned and the reason is kept for audit.
   * @param {string} newSpecialty - Specialty key selected by the staff.
   * @param {string} reason - Clinical reason for the reassignment.
   * @returns {{ok: boolean, error?: string}} Result; fails when the
   * specialty is invalid or the reason is empty.
   */
  changeSpecialty(newSpecialty, reason) {
    if (!newSpecialty) return { ok: false, error: 'referral.error.invalidSpecialty' }
    if (!String(reason || '').trim()) return { ok: false, error: 'referral.error.reasonRequired' }
    this.specialty = newSpecialty
    this.changeReason = String(reason).trim()
    this.state = ReferralState.Reassigned
    return { ok: true }
  }

  updateQueuePosition(position) {
    this.queuePosition = position
  }

  /**
   * Attention priority derived from the triage classification
   * (level I is attended first).
   * @returns {number} Sort order of the classified level.
   */
  get priorityOrder() {
    return levelByCode(this.level)?.order ?? 9
  }
}

