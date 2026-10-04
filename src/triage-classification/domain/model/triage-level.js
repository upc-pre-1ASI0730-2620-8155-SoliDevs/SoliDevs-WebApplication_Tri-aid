// Catálogo de niveles de prioridad del triaje según la Norma Técnica de Salud
// N.° 158-MINSA/DIGEPRES (2022). Espeja el enum TriageLevel del modelo de dominio
// documentado en el informe (Bounded Context: Triage Classification).
export const TriageLevel = {
  I_Resuscitation: 'I_Resuscitation',
  II_Emergency: 'II_Emergency',
  III_Urgent: 'III_Urgent',
  IV_LessUrgent: 'IV_LessUrgent',
  V_NonUrgent: 'V_NonUrgent'
}

// Orden clínico: I es el más crítico.
export const TRIAGE_LEVELS = [
  { code: 'I',   key: TriageLevel.I_Resuscitation, order: 1, tone: 'critical', color: '#b42318' },
  { code: 'II',  key: TriageLevel.II_Emergency,   order: 2, tone: 'emergency', color: '#d97706' },
  { code: 'III', key: TriageLevel.III_Urgent,     order: 3, tone: 'urgent',    color: '#ca8a04' },
  { code: 'IV',  key: TriageLevel.IV_LessUrgent,  order: 4, tone: 'less',      color: '#0f766e' },
  { code: 'V',   key: TriageLevel.V_NonUrgent,    order: 5, tone: 'non',       color: '#2563eb' }
]

export const levelByKey = key => TRIAGE_LEVELS.find(l => l.key === key) || null
export const levelByCode = code => TRIAGE_LEVELS.find(l => l.code === code) || null
// El nivel de mayor urgencia (menor order) entre varios niveles.
export const mostUrgent = levels => levels
  .filter(Boolean)
  .sort((a, b) => a.order - b.order)[0] || null
