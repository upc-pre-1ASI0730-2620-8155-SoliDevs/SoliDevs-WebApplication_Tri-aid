// Tipos de documento aceptados. "pattern" valida el formato del número.
export const docTypes = [
  { key: 'dni', label: 'DNI', hint: '8 dígitos', ph: '12345678', max: 8, numeric: true, pattern: /^\d{8}$/, msg: 'El DNI debe tener 8 dígitos' },
  { key: 'ce', label: 'C.E.', full: 'Carné de extranjería', hint: '9 a 12 caracteres', ph: '001234567', max: 12, numeric: false, pattern: /^[A-Z0-9]{9,12}$/, msg: 'El C.E. debe tener entre 9 y 12 caracteres' },
  { key: 'pasaporte-pe', label: 'Pasaporte PE', full: 'Pasaporte peruano', hint: '6 a 12 caracteres', ph: 'A1234567', max: 12, numeric: false, pattern: /^[A-Z0-9]{6,12}$/, msg: 'El pasaporte debe tener entre 6 y 12 caracteres' },
  { key: 'pasaporte-ext', label: 'Pasaporte Ext.', full: 'Pasaporte extranjero', hint: '5 a 20 caracteres', ph: 'X1234567', max: 20, numeric: false, pattern: /^[A-Z0-9]{5,20}$/, msg: 'El pasaporte debe tener entre 5 y 20 caracteres' }
]

export const docTypeOf = key => docTypes.find(t => t.key === key) || docTypes[0]

// Texto corto para mostrar el documento de un paciente: "DNI 12345678"
export const docLabel = p => (p.sinDni ? 'Sin documento · temporal' : `${docTypeOf(p.docType).label} ${p.dni}`)