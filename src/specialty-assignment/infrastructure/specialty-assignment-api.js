import { BaseApi } from '../../shared/infrastructure/base-api.js'
import { BaseEndpoint } from '../../shared/infrastructure/base-endpoint.js'

const referralsEndpointPath = import.meta.env.VITE_REFERRALS_ENDPOINT_PATH
const specialtiesEndpointPath = import.meta.env.VITE_SPECIALTIES_ENDPOINT_PATH
const vouchersEndpointPath = import.meta.env.VITE_VOUCHERS_ENDPOINT_PATH
const symptomsEndpointPath = import.meta.env.VITE_SYMPTOMS_ENDPOINT_PATH

/**
 * Infrastructure gateway for the Specialty Assignment bounded context.
 * Mirrors IReferralRepository from the report, backed by json-server.
 */
export class SpecialtyAssignmentApi extends BaseApi {
    #referralsEndpoint
    #specialtiesEndpoint
    #vouchersEndpoint
    #symptomsEndpoint

    constructor() {
        super()
        this.#referralsEndpoint = new BaseEndpoint(this, referralsEndpointPath, { tenantScoped: true })
        this.#specialtiesEndpoint = new BaseEndpoint(this, specialtiesEndpointPath)
        this.#vouchersEndpoint = new BaseEndpoint(this, vouchersEndpointPath, { tenantScoped: true })
        this.#symptomsEndpoint = new BaseEndpoint(this, symptomsEndpointPath)
    }

    getReferrals() {
        return this.#referralsEndpoint.getAll()
    }

    getReferralsByEpisode(episodeId) {
        if (this.isRtdb) {
            const params = { orderBy: '"episodeId"', equalTo: episodeId }
            return this.http.get(`${this.#referralsEndpoint.endpointPath}${this.#referralsEndpoint.suffix}`, { params }).then(r => {
                if (!Array.isArray(r.data)) {
                    r.data = Object.entries(r.data || {}).filter(([, v]) => v !== null).map(([k, v]) => ({ id: v.id !== undefined ? v.id : k, ...v }))
                }
                return r
            })
        }
        // The API exposes a dedicated filtered endpoint: a bare list query would
        // return every referral and leak another patient's record (ADR-010).
        // The endpoint lives under the context root, not under /referrals.
        const base = this.#referralsEndpoint.endpointPath.replace(/\/referrals$/, '')
        return this.http.get(`${base}/episode/${episodeId}/referral`, { params: {} })
            .then(r => ({ ...r, data: r.data ? [r.data] : [] }))
            .catch(err => {
                // 404 is the API contract for "this episode has no referral yet".
                if (err?.response?.status === 404) return { data: [] }
                throw err
            })
    }

    createReferral(resource) {
        return this.#referralsEndpoint.create(resource)
    }

    /**
     * Refers an episode through the API dedicated command endpoint. The API
     * does not expose POST /referrals: creation goes through
     * POST /specialty-assignment/episode/{id}/refer with the catalog id.
     */
    referEpisode(episodeId, specialtyId, symptom) {
        const base = this.#referralsEndpoint.endpointPath.replace(/\/referrals$/, '')
        return this.http.post(`${base}/episode/${episodeId}/refer`, { specialtyId, symptom })
    }

    updateReferral(id, resource) {
        return this.#referralsEndpoint.update(id, resource)
    }

    getSpecialties() {
        return this.#specialtiesEndpoint.getAll()
    }

    getSymptoms() {
        return this.#symptomsEndpoint.getAll()
    }

    /** Resolves a scanned voucher or episode code into its patient. */
    verifyVoucher(code) { return this.http.get(`${this.#vouchersEndpoint.endpointPath}/verify/${encodeURIComponent(code)}`) }

    getVouchers() {
        return this.#vouchersEndpoint.getAll()
    }

    createVoucher(resource) {
        return this.#vouchersEndpoint.create(resource)
    }

    updateVoucher(id, resource) {
        return this.#vouchersEndpoint.update(id, resource)
    }
}
