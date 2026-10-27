/**
 * User of the IAM bounded context.
 * Represents an account of the Tri-Aid platform with its role and the
 * institution it belongs to (the subscription owner).
 */
export class User {
    constructor({
        id = null,
        username = '',
        password = '',
        names = '',
        surnames = '',
        email = '',
        role = '',
        unit = '',
        shift = '',
        institution = ''
    } = {}) {
        this.id = id
        this.username = username
        this.password = password
        this.names = names
        this.surnames = surnames
        this.email = email
        this.role = role
        this.unit = unit
        this.shift = shift
        this.institution = institution
    }

    /** Full name for display (e.g. sidebar footer). */
    get fullName() {
        return `${this.names} ${this.surnames}`.trim()
    }

    /** Initials for the avatar (e.g. "CM"). */
    get initials() {
        return `${this.names.charAt(0)}${this.surnames.charAt(0)}`.toUpperCase()
    }

    /** Safe projection without credentials, for persistence and session. */
    toSession() {
        const { id, username, names, surnames, role, unit, shift, institution } = this
        return { id, username, names, surnames, role, unit, shift, institution }
    }
}
