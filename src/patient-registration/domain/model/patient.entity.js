/**
 * Patient aggregate root of the Patient Registration bounded context.
 * Mirrors the Patient class from the report class diagram (class_patient.puml).
 */
export const Sex = {
    Male: 'Male',
    Female: 'Female'
}

/**
 * Identity document type. Mirrors the DocType enum from the report class diagram.
 * @readonly
 */
export const DocType = {
    Dni: 'Dni',
    Ce: 'Ce',
    Pas: 'Pas'
}

export class Patient {
    constructor({
        id = null,
        dni = null,
        docType = DocType.Dni,
        firstName = '',
        lastName = '',
        birthDate = null,
        sex = null,
        phone = null,
        address = null,
        isTemporary = false,
        temporaryCode = null
    } = {}) {
        this.id = id
        this.dni = dni
        this.docType = docType
        this.firstName = firstName
        this.lastName = lastName
        this.birthDate = birthDate
        this.sex = sex
        this.phone = phone
        this.address = address
        this.isTemporary = isTemporary
        this.temporaryCode = temporaryCode
    }

    get fullName() {
        return `${this.lastName}, ${this.firstName}`
    }

    /**
     * Regularizes a temporary patient identity by assigning a real document.
     * Mirrors RegularizeIdentity(dni: string) from the class diagram.
     * @param {string} dni - Real national identity document number.
     */
    regularizeIdentity(dni) {
        this.dni = dni
        this.isTemporary = false
        this.temporaryCode = null
    }

    /**
     * Updates the patient contact data.
     * Mirrors UpdateContactData(phone, address) from the class diagram.
     * @param {string|null} phone - Contact phone number.
     * @param {string|null} address - Home address.
     */
    updateContactData(phone, address) {
        this.phone = phone
        this.address = address
    }
}
