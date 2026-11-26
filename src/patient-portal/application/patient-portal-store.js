import { reactive, markRaw } from 'vue'
import { PatientPortalService } from '../infrastructure/patient-portal.service.js'
import { PortalOverview } from '../domain/model/portal-overview.entity.js'

const TOKEN_KEY = 'triaid.portal.token'
const PATIENT_KEY = 'triaid.portal.patient'

/**
 * Reactive state of the Patient Portal bounded context. Completely separate from
 * `iamStore`: a patient session never opens the staff shell and vice versa.
 */
export const patientPortalStore = reactive({
    session: null,
    overview: null,
    queue: null,
    loading: false,
    restored: false,
    service: markRaw(new PatientPortalService()),

    get isSignedIn() { return this.session !== null && this.service.hasToken() },

    /** Restores the session from storage on app start. */
    restore() {
        if (this.restored) return
        this.restored = true
        const raw = localStorage.getItem(PATIENT_KEY)
        if (raw && this.service.hasToken()) {
            try { this.session = JSON.parse(raw) } catch { this.signOut() }
        }
    },

    /**
     * Signs a patient in with DNI or e-mail and the access code.
     * @param {string} identifier - DNI or e-mail.
     * @param {string} password - Access code.
     * @returns {Promise<{ok: boolean, error?: string}>}
     */
    async signIn(identifier, password) {
        const result = await this.service.signIn(identifier, password)
        if (!result.ok) return result
        this.service.saveToken(result.data.token)
        this.session = { patientId: result.data.patientId, fullName: result.data.fullName, identifier: result.data.identifier }
        localStorage.setItem(PATIENT_KEY, JSON.stringify(this.session))
        return { ok: true, data: result.data }
    },

    /** Discards the patient session. */
    signOut() {
        this.service.clearToken()
        localStorage.removeItem(PATIENT_KEY)
        this.session = null
        this.overview = null
        this.queue = null
    },

    /**
     * Loads the overview for the signed-in patient.
     * @returns {Promise<{ok: boolean}>}
     */
    async loadOverview() {
        this.loading = true
        try {
            const result = await this.service.getOverview()
            if (!result.ok) return result
            this.overview = new PortalOverview(result.data)
            this.queue = this.overview.queue
            return { ok: true }
        } finally {
            this.loading = false
        }
    },

    /**
     * Refreshes only the live queue position (polled while "my turn" is visible).
     * @returns {Promise<boolean>} True when the queue changed.
     */
    async refreshQueue() {
        const result = await this.service.getQueue()
        if (!result.ok) return false
        const prev = this.queue
        this.queue = new QueuePosition(result.data)
        return !prev || prev.ahead !== this.queue.ahead
    }
})

import { QueuePosition } from '../domain/model/portal-overview.entity.js'
