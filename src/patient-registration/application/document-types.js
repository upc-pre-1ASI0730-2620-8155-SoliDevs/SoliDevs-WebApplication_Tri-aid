import { t } from '../../shared/application/i18n.js'

// Textos (label, ayuda, error) viven en locales/*.json bajo doc.<key>.*
export const docTypes = [
  { key: 'dni', ph: '12345678', max: 8, numeric: true, pattern: /^\d{8}$/ },
  { key: 'ce', ph: '001234567', max: 12, numeric: false, pattern: /^[A-Z0-9]{9,12}$/ },
  { key: 'pasaporte-pe', ph: 'A1234567', max: 12, numeric: false, pattern: /^[A-Z0-9]{6,12}$/ },
  { key: 'pasaporte-ext', ph: 'X1234567', max: 20, numeric: false, pattern: /^[A-Z0-9]{5,20}$/ }
]

export const docTypeOf = key => docTypes.find(d => d.key === key) || docTypes[0]

export const docLabel = p => (p.sinDni ? t('doc.temp') : `${t('doc.' + docTypeOf(p.docType).key + '.label')} ${p.dni}`)