import { BaseApi } from '../../shared/infrastructure/base-api.js'
import { BaseEndpoint } from '../../shared/infrastructure/base-endpoint.js'

const classificationsEndpointPath = import.meta.env.VITE_CLASSIFICATIONS_ENDPOINT_PATH

/**
 * Infrastructure gateway for the Triage Classification bounded context.
 * Mirrors IClassificationRepository from the report, backed by json-server.
 */
export class TriageApi extends BaseApi {
    #classificationsEndpoint

    constructor() {
        super()
        this.#classificationsEndpoint = new BaseEndpoint(this, classificationsEndpointPath)
    }

    getClassifications() {
        return this.#classificationsEndpoint.getAll()
    }

    getClassificationByEpisode(episodeId) {
        const params = this.isRtdb
            ? { orderBy: '"episodeId"', equalTo: episodeId }
            : { episodeId }
        return this.http.get(`${this.#classificationsEndpoint.endpointPath}${this.#classificationsEndpoint.suffix}`, { params }).then(r => {
            if (Array.isArray(r.data)) return r
            r.data = Object.entries(r.data || {}).filter(([, v]) => v !== null).map(([k, v]) => ({ id: v.id !== undefined ? v.id : k, ...v }))
            return r
        })
    }

    createClassification(resource) {
        return this.#classificationsEndpoint.create(resource)
    }

    updateClassification(id, resource) {
        return this.#classificationsEndpoint.update(id, resource)
    }
}
