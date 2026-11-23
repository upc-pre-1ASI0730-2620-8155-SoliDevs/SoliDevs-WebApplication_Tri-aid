import { PatientPortalApi } from './patient-portal-api.js'

const MESSAGES = {
    'Iam.InvalidCredentials': 'invalidCredentials',
    'Iam.PortalNotEnabled': 'portalNotEnabled'
}

/**
 * Application service of the Patient Portal. Translates API outcomes into
 * `{ ok, error }` results with i18n keys, the same contract the staff services use.
 */
export class PatientPortalService {
    constructor() {
        this.api = new PatientPortalApi()
    }

    hasToken() { return this.api.hasToken() }
    saveToken(token) { this.api.saveToken(token) }
    clearToken() { this.api.clearToken() }

    /**
     * Signs a patient in.
     * @param {string} identifier - DNI or e-mail.
     * @param {string} password - Access code.
     * @returns {Promise<{ok: boolean, data?: object, error?: string}>}
     */
    async signIn(identifier, password) {
        try {
            const r = await this.api.signIn(identifier, password)
            return { ok: true, data: r.data }
        } catch (e) {
            const status = e?.response?.status
            if (status === 403) return { ok: false, error: 'portalNotEnabled' }
            if (status === 401) return { ok: false, error: MESSAGES[e?.response?.data?.error] || 'invalidCredentials' }
            return { ok: false, error: 'network' }
        }
    }

    /**
     * Loads the overview. A 401 means the token expired: the session is dropped.
     * @returns {Promise<{ok: boolean, data?: object, error?: string}>}
     */
    async getOverview() {
        try {
            const r = await this.api.getOverview()
            return { ok: true, data: r.data }
        } catch (e) {
            return this.fromError(e)
        }
    }

    /** @returns {Promise<{ok: boolean, data?: object, error?: string}>} */
    async getQueue() {
        try {
            const r = await this.api.getQueue()
            return { ok: true, data: r.data }
        } catch (e) {
            return this.fromError(e)
        }
    }

    fromError(e) {
        const status = e?.response?.status
        if (status === 401) return { ok: false, error: 'sessionExpired' }
        if (status === 404) return { ok: false, error: 'notFound' }
        return { ok: false, error: 'network' }
    }
}
