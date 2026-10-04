// Domain Service: reglas clinicas de recomendacion de especialidad (US30)
// y restricciones demographicas (US32, escenario 2).
import { levelByCode } from '../../../triage-classification/domain/model/triage-level.js'

// Palabras clave del sintoma principal -> especialidad.
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
   * Sugiere una especialidad a partir del sintoma principal, la prioridad
   * clasificada y la edad del paciente (US30). Devuelve
   * { ok, specialtyKey, rule } o { ok:false, error }.
   */
  suggest({ symptom = '', level = null, age = null }) {
    const text = String(symptom || '').toLowerCase()
    if (!text.trim()) return { ok: false, error: 'referral.error.symptomRequired' }

    for (const rule of SYMPTOM_RULES) {
      if (rule.words.some(w => text.includes(w))) return { ok: true, specialtyKey: rule.specialty, rule: 'symptom' }
    }

    // Sin coincidencia de sintoma: la prioridad orienta el destino.
    const l = levelByCode(level)
    if (l && (l.code === 'I' || l.code === 'II')) return { ok: true, specialtyKey: 'CirugiaGeneral', rule: 'priority' }
    return { ok: true, specialtyKey: 'MedicinaInterna', rule: 'priority' }
  }

  /**
   * Restriccion demografica (US32, escenario 2): p.ej. no derivar a
   * Pediatria a un paciente adulto mayor.
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
