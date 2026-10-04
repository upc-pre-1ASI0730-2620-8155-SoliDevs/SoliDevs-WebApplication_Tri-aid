/**
 * Domain Service: clinical rules for specialty recommendation (US30)
 * and demographic restrictions (US32, scenario 2).
 */
import { levelByCode } from '../../../triage-classification/domain/model/triage-level.js'

// Main symptom keywords -> specialty.
const SYMPTOM_RULES = [
  { specialty: 'CirugiaGeneral',  words: ['abdomen', 'abdominal', 'apendice', 'apendicitis', 'hernia', 'dolor abdominal'] },
  { specialty: 'Traumatologia',   words: ['fractura', 'esguince', 'luxacion', 'trauma', 'caida', 'golpe', 'torcedura', 'fracturas'] },
  { specialty: 'Cardiologia',     words: ['toracico', 'pecho', 'corazon', 'cardiaco', 'palpitaciones', 'opresion'] },
  { specialty: 'Neurologia',      words: ['cefalea', 'migraña', 'migrana', 'convulsion', 'convulsiones', 'mareo', 'entumecimiento', 'neurolog'] },
  { specialty: 'Ginecologia',     words: ['embarazo', 'menstru', 'pelvico', 'vaginal', 'gestac'] },
  { specialty: 'Pediatria',       words: ['niño', 'niña', 'bebe', 'pediatric', 'lactante', 'infantil'] },
  { specialty: 'MedicinaInterna', words: ['fiebre', 'tos', 'gripe', 'dolor de garganta', 'vomito', 'diarrea', 'infeccion', 'debilidad', 'fatiga'] }
]

export class SpecialtyRules {
  /**
   * Suggests a specialty from the main symptom, the classified priority
   * and the patient age (US30). Returns
   * { ok, specialtyKey, rule } or { ok:false, error }.
   */
  suggest({ symptom = '', level = null, age = null }) {
    const text = String(symptom || '').toLowerCase()
    if (!text.trim()) return { ok: false, error: 'referral.error.symptomRequired' }

    for (const rule of SYMPTOM_RULES) {
      if (rule.words.some(w => text.includes(w))) return { ok: true, specialtyKey: rule.specialty, rule: 'symptom' }
    }

    // No symptom match: the priority drives the destination.
    const l = levelByCode(level)
    if (l && (l.code === 'I' || l.code === 'II')) return { ok: true, specialtyKey: 'CirugiaGeneral', rule: 'priority' }
    return { ok: true, specialtyKey: 'MedicinaInterna', rule: 'priority' }
  }

  /**
   * Demographic restriction (US32, scenario 2): e.g. do not refer an
   * elderly patient to Pediatrics.
   */
  violatesDemographics(specialty, age = null) {
    if (!specialty) return false
    if (specialty.maxAge != null && age != null && age > specialty.maxAge) return true
    if (specialty.minAge != null && age != null && age < specialty.minAge) return true
    return false
  }
}

export const specialtyRules = new SpecialtyRules()
export default SpecialtyRules
