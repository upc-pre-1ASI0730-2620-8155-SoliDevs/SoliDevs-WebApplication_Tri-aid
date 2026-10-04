// Catalogo de especialidades (enum Specialty del modelo de dominio),
// espejado contra la coleccion /specialties del backend falso.
export const Specialty = {
  MedicinaInterna: 'MedicinaInterna',
  CirugiaGeneral: 'CirugiaGeneral',
  Traumatologia: 'Traumatologia',
  Ginecologia: 'Ginecologia',
  Cardiologia: 'Cardiologia',
  Pediatria: 'Pediatria',
  Neurologia: 'Neurologia'
}

export const specialtyByKey = key => key || null
