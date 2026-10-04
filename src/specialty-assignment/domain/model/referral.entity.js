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

  /** US32: manual reassignment with a justified reason. */
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

  /** Attention priority derived from the classification (I goes first). */
  get priorityOrder() {
    return levelByCode(this.level)?.order ?? 9
  }
}

