import { BaseApi } from '../../shared/infrastructure/base-api.js'
import { BaseEndpoint } from '../../shared/infrastructure/base-endpoint.js'

const incidentsEndpointPath = import.meta.env.VITE_INCIDENTS_ENDPOINT_PATH

/**
 * Infrastructure gateway for the Incidents bounded context.
 * Persists incidents (out-of-range vital signs and high-priority
 * classifications) against the platform API.
 */
export class IncidentsApi extends BaseApi {
    #incidentsEndpoint

    constructor() {
        super()
        this.#incidentsEndpoint = new BaseEndpoint(this, incidentsEndpointPath, { tenantScoped: true })
    }

    getIncidents() { return this.#incidentsEndpoint.getAll() }
    getIncidentById(id) { return this.#incidentsEndpoint.getById(id) }
    createIncident(resource) { return this.#incidentsEndpoint.create(resource) }
    updateIncident(id, resource) { return this.#incidentsEndpoint.update(id, resource) }
}
