/**
 * Resources traveling to/from the /patients endpoint.
 * Mirror the PatientResource, CreatePatientResource,
 * CreateTemporaryProfileResource and UpdateContactResource records of
 * the triaid-platform RESTful API.
 */
export class PatientResource {
    constructor({ id, dni, firstName, lastName, birthDate, sex, phone, address, isTemporary, temporaryCode }) {
        this.id = id
        this.dni = dni
        this.firstName = firstName
        this.lastName = lastName
        this.birthDate = birthDate
        this.sex = sex
        this.phone = phone
        this.address = address
        this.isTemporary = isTemporary
        this.temporaryCode = temporaryCode
    }
}

export class CreatePatientResource {
    constructor({ dni, firstName, lastName, birthDate, sex, phone, address }) {
        this.dni = dni
        this.firstName = firstName
        this.lastName = lastName
        this.birthDate = birthDate
        this.sex = sex
        this.phone = phone
        this.address = address
    }
}

export class CreateTemporaryProfileResource {
    constructor({ firstName, lastName, birthDate, sex }) {
        this.firstName = firstName
        this.lastName = lastName
        this.birthDate = birthDate
        this.sex = sex
    }
}

export class UpdateContactResource {
    constructor({ phone, address }) {
        this.phone = phone
        this.address = address
    }
}
