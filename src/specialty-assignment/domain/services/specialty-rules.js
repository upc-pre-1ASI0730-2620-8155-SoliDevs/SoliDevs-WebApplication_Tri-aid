/**
 * Domain Service: clinical rules for specialty recommendation
 * and demographic restrictions.
 */
import { levelByCode } from '../../../shared/domain/shared-kernel/triage-level.js'

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
   * Resolves the suggested specialty. The symptom text is matched against
   * a keyword table; the first matching rule wins. When nothing matches,
   * the classified priority drives the destination: levels I-II go to
   * General Surgery (surgical urgency) and the rest to Internal Medicine.
   * @param {Object} input - Suggestion input.
   * @param {string} input.symptom - Free-text main symptom.
   * @param {string} [input.level] - Classified triage level code (I..V).
   * @param {number} [input.age] - Patient age in years.
   * @returns {{ok: boolean, specialtyKey?: string, rule?: string, error?: string}}
   *   ok - false only when the symptom text is empty.
   *   specialtyKey - suggested Specialty key.
   *   rule - which strategy produced the suggestion ('symptom' | 'priority').
   */
  suggest({ symptom = '', level = null, age = null }) {
    const text = String(symptom || '').toLowerCase()
    if (!text.trim()) return { ok: false, error: 'referral.error.symptomRequired' }

    for (const rule of SYMPTOM_RULES) {
      if (rule.words.some(w => text.includes(w))) return { ok: true, specialtyKey: rule.specialty, rule: 'symptom' }
    }

    const l = levelByCode(level)
    if (l && (l.code === 'I' || l.code === 'II')) return { ok: true, specialtyKey: 'CirugiaGeneral', rule: 'priority' }
    return { ok: true, specialtyKey: 'MedicinaInterna', rule: 'priority' }
  }

  /**
   * Checks whether a specialty rejects the patient's demographic profile.
   * Used before referring: Pediatrics only admits patients up to its
   * maxAge, age-gated specialties require at least minAge.
   * @param {Object|null} specialty - Catalog specialty (maxAge/minAge fields).
   * @param {number|null} age - Patient age in years.
   * @returns {boolean} true when the patient does not fit the specialty.
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
