/**
 * Specialty catalog (Specialty enum of the domain model),
 * mirrored against the /specialties collection of the fake backend.
 */
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
