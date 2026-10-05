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
        this.#referralsEndpoint = new BaseEndpoint(this, referralsEndpointPath)
        this.#specialtiesEndpoint = new BaseEndpoint(this, specialtiesEndpointPath)
        this.#vouchersEndpoint = new BaseEndpoint(this, vouchersEndpointPath)
        this.#symptomsEndpoint = new BaseEndpoint(this, symptomsEndpointPath)
    }

    getReferrals() {
        return this.#referralsEndpoint.getAll()
    }

    getReferralsByEpisode(episodeId) {
        return this.http.get(`${this.#referralsEndpoint.endpointPath}?episodeId=${episodeId}`)
    }

    createReferral(resource) {
        return this.#referralsEndpoint.create(resource)
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
