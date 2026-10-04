/**
 * Domain Service: Nt158Engine
 * Computes the suggested priority from the vital signs using the ranges of
 * Health Technical Standard No. 158-MINSA/DIGEPRES. Mirrors the Nt158Engine
 * class from the report class diagram (CalculatePriority and MissingMetrics
 * methods), adapted to the frontend.
 */
import { TRIAGE_LEVELS, levelByCode, mostUrgent } from '../model/triage-level.js'

// Mandatory metrics to classify (US19 scenario 2 requires stopping the
// suggestion and reporting which metric is missing).
export const REQUIRED_METRICS = ['spo2', 'fc', 'pa']

// Normative ranges per level. Each rule evaluates one value of the vital
// signs summary and, if matched, contributes that level as a candidate.
const RULES = [
  // Level I - Resuscitation
  { metric: 'spo2', level: 'I', test: v => v < 90 },
  { metric: 'fc', level: 'I', test: v => v < 40 || v > 150 },
  { metric: 'pas', level: 'I', test: v => v < 80 || v > 220 },
  { metric: 'temp', level: 'I', test: v => v < 35 || v > 41 },

  // Level II - Emergency
  { metric: 'spo2', level: 'II', test: v => v >= 90 && v <= 93 },
  { metric: 'fc', level: 'II', test: v => (v >= 40 && v <= 50) || (v >= 121 && v <= 150) },
  { metric: 'pas', level: 'II', test: v => (v >= 80 && v <= 89) || (v >= 181 && v <= 220) },
  { metric: 'temp', level: 'II', test: v => (v >= 35 && v < 36) || (v > 39 && v <= 41) },

  // Level III - Urgent
  { metric: 'spo2', level: 'III', test: v => v >= 94 && v <= 95 },
  { metric: 'fc', level: 'III', test: v => (v >= 51 && v <= 60) || (v >= 101 && v <= 120) },
  { metric: 'pas', level: 'III', test: v => (v >= 90 && v <= 99) || (v >= 141 && v <= 180) },
  { metric: 'temp', level: 'III', test: v => v > 38 && v <= 39 }
]

// Habitual ranges used for the out-of-range warning.
const HABITUAL = {
  spo2: v => v >= 94 && v <= 100,
  fc: v => v >= 60 && v <= 100,
  pas: v => v >= 100 && v <= 140,
  pad: v => v >= 60 && v <= 90,
  temp: v => v >= 36 && v <= 38
}

const num = value => {
  const n = parseFloat(String(value ?? '').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

// Normalizes the episode vital signs map
// ({ pa: {value:'148/92'}, spo2: {value:'89'}, ... }) a un resumen plano.
export function vitalsSummary(vitals = {}) {
  const val = k => num(vitals[k]?.value)
  const pa = String(vitals.pa?.value || '').split('/')
  return {
    spo2: val('spo2'),
    fc: val('fc'),
    temp: val('temp'),
    pas: num(pa[0]),
    pad: num(pa[1])
  }
}

export class Nt158Engine {
  /** Missing mandatory metrics (US19, scenario 2). */
  missingMetrics(vitals = {}) {
    const s = vitalsSummary(vitals)
    const labels = { spo2: 'SpO₂', fc: 'Frecuencia cardíaca', pa: 'Presión arterial' }
    return REQUIRED_METRICS
      .filter(m => (m === 'pa' ? s.pas === null : s[m] === null))
      .map(m => labels[m])
  }

  /** Valores fuera del rango habitual, para el aviso de la vista. */
  outOfRange(vitals = {}) {
    const s = vitalsSummary(vitals)
    const out = []
    for (const [metric, ok] of Object.entries(HABITUAL)) {
      const v = s[metric]
      if (v !== null && !ok(v)) out.push({ metric, value: v })
    }
    return out
  }

  /**
   * Calcula la prioridad sugerida (US19). Devuelve
   * { ok, level: <código>, levelKey, reasons: [...] } o { ok:false, error, missing }.
   */
  calculatePriority(vitals = {}) {
    const missing = this.missingMetrics(vitals)
    if (missing.length) return { ok: false, error: 'classification.error.missingVitals', missing }

    const s = vitalsSummary(vitals)
    const candidates = []
    const reasons = []
    for (const rule of RULES) {
      const v = s[rule.metric]
      if (v === null) continue
      if (rule.test(v)) {
        candidates.push(levelByCode(rule.level))
        reasons.push({ metric: rule.metric, level: rule.level, value: v })
      }
    }

    if (!candidates.length) {
      // No findings: the patient shows no severity criteria.
      const nonUrgent = levelByCode('V')
      return { ok: true, level: nonUrgent.code, levelKey: nonUrgent.key, reasons: [{ metric: 'general', level: 'V', value: null }] }
    }

    const level = mostUrgent(candidates)
    return { ok: true, level: level.code, levelKey: level.key, reasons }
  }

  /** Standard parameters for the triage guide (US23). */
  guide() {
    return TRIAGE_LEVELS.map(l => ({
      code: l.code,
      key: l.key,
      order: l.order,
      color: l.color
    }))
  }
}

export const nt158Engine = new Nt158Engine()
export default Nt158Engine
