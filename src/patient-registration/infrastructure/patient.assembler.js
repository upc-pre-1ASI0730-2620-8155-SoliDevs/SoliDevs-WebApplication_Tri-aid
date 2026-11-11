/**
 * Translates between the /patients resources of the RESTful API and the
 * patient record kept in the Patient Registration store (names,
 * surnames, birth and sex as 'M' / 'F', as used by the views).
 */
import { CreatePatientResource, CreateTemporaryProfileResource, PatientResource, UpdateContactResource } from './patient.resource.js'

const SEX_TO_API = { M: 'Male', F: 'Female' }
const SEX_FROM_API = { Male: 'M', Female: 'F' }

export class PatientAssembler {
    static toStoreModel(data) {
        const resource = new PatientResource(data)
        return {
            id: resource.id,
            docType: 'dni',
            dni: resource.dni || '',
            sinDni: resource.isTemporary,
            temporaryCode: resource.temporaryCode,
            names: resource.firstName,
            surnames: resource.lastName,
            birth: resource.birthDate,
            sex: SEX_FROM_API[resource.sex] || resource.sex,
            phone: resource.phone || '',
            address: resource.address || ''
        }
    }

    static toCreateResource(form) {
        return new CreatePatientResource({
            dni: form.dni,
            firstName: form.names,
            lastName: form.surnames,
            birthDate: form.birth,
            sex: SEX_TO_API[form.sex],
            phone: form.phone || null,
            address: form.address || null
        })
    }

    static toTemporaryProfileResource(form) {
        return new CreateTemporaryProfileResource({
            firstName: form.names,
            lastName: form.surnames,
            birthDate: form.birth,
            sex: SEX_TO_API[form.sex]
        })
    }

    static toUpdateContactResource(form) {
        return new UpdateContactResource({
            phone: form.phone || null,
            address: form.address || null
        })
    }
}
