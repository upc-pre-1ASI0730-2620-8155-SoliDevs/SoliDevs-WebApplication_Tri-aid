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
        return this.http.get(`${this.#classificationsEndpoint.endpointPath}?episodeId=${episodeId}`)
    }

    createClassification(resource) {
        return this.#classificationsEndpoint.create(resource)
    }

    updateClassification(id, resource) {
        return this.#classificationsEndpoint.update(id, resource)
    }
}
