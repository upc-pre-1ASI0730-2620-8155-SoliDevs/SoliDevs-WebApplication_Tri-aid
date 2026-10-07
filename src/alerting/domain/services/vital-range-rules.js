/**
 * Clinical safe ranges of the vital signs evaluated by the alerting rules.
 * Ranges follow the reference values used by the triage norm of the
 * platform (systolic blood pressure, oxygen saturation, heart rate and
 * body temperature).
 */
export const SAFE_VITAL_RANGES = {
    pa: { min: 100, max: 140, label: 'mmHg' },
    spo2: { min: 94, max: 100, label: '%' },
    fc: { min: 60, max: 100, label: 'lpm' },
    temp: { min: 36, max: 38, label: '°C' }
}

/** Extracts the comparable numeric value of a stored vital sign reading. */
const numericValueOf = reading => {
    const n = parseFloat(String(reading).split('/')[0])
    return Number.isFinite(n) ? n : null
}

/**
 * Evaluates a set of confirmed vital sign readings against the clinical
 * safe ranges and returns the ones that fall outside.
 * @param {Object} vitals - Confirmed readings keyed by vital type
 *   ({ pa: { value }, spo2: { value }, fc: { value }, temp: { value } }).
 * @returns {Array<{metric: string, value: string}>} Readings outside their safe range.
 */
export function findOutOfRangeVitals(vitals = {}) {
    const out = []
    for (const [metric, rule] of Object.entries(SAFE_VITAL_RANGES)) {
        const reading = vitals[metric]
        if (!reading?.value) continue
        const n = numericValueOf(reading.value)
        if (n === null || n < rule.min || n > rule.max) {
            out.push({ metric, value: String(reading.value) })
        }
    }
    return out
}
