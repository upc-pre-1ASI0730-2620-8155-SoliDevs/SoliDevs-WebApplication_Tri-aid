// Aggregate Root del Bounded Context: Specialty Assignment.
// Espeja la clase Referral del diagrama de clases del informe.
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

  /** US32: reasignacion manual con motivo justificado. */
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

  /** Prioridad de atencion derivada de la clasificacion (I es primero). */
  get priorityOrder() {
    return levelByCode(this.level)?.order ?? 9
  }
}

