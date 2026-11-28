import { BaseApi } from '../../shared/infrastructure/base-api.js'

const TOKEN_KEY = 'triaid.portal.token'

/**
 * Gateway of the Patient Portal bounded context. Speaks to the portal endpoints
 * of the TriAid Platform API and carries the patient token, which is stored
 * apart from the staff token so the two sessions never mix.
 */
export class PatientPortalApi extends BaseApi {
    hasToken() {
        return !!localStorage.getItem(TOKEN_KEY)
    }

    saveToken(token) {
        localStorage.setItem(TOKEN_KEY, token)
    }

    clearToken() {
        localStorage.removeItem(TOKEN_KEY)
    }

    get authHeaders() {
        const token = localStorage.getItem(TOKEN_KEY)
        return token ? { Authorization: `Bearer ${token}` } : {}
    }

    /** Signs a patient in. Identifier is the DNI or the e-mail given at admission. */
    signIn(identifier, password) {
        return this.http.post('/auth/patient/login', { identifier, password })
    }

    /** Everything the portal shows, scoped to the token's patient. */
    getOverview() {
        return this.http.get('/portal/overview', { headers: this.authHeaders })
    }

    /** Live queue position of the current referral. */
    getQueue() {
        return this.http.get('/portal/queue', { headers: this.authHeaders })
    }
}
