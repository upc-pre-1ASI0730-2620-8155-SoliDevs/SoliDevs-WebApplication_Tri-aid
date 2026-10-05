import { BaseApi } from '../../shared/infrastructure/base-api.js'
import { BaseEndpoint } from '../../shared/infrastructure/base-endpoint.js'

const alertsEndpointPath = import.meta.env.VITE_ALERTS_ENDPOINT_PATH

/**
 * Infrastructure gateway for the Alerting bounded context.
 * Persists alerts against the fake backend (json-server).
 */
export class AlertingApi extends BaseApi {
    #alertsEndpoint

    constructor() {
        super()
        this.#alertsEndpoint = new BaseEndpoint(this, alertsEndpointPath)
    }

    getAlerts() { return this.#alertsEndpoint.getAll() }
    getAlertById(id) { return this.#alertsEndpoint.getById(id) }
    createAlert(resource) { return this.#alertsEndpoint.create(resource) }
    updateAlert(id, resource) { return this.#alertsEndpoint.update(id, resource) }
}
