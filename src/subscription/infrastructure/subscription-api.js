import { BaseApi } from '../../shared/infrastructure/base-api.js'
import { BaseEndpoint } from '../../shared/infrastructure/base-endpoint.js'

const plansEndpointPath = import.meta.env.VITE_PLANS_ENDPOINT_PATH
const subscriptionsEndpointPath = import.meta.env.VITE_SUBSCRIPTIONS_ENDPOINT_PATH

/**
 * Infrastructure gateway for the Subscription bounded context.
 * Reads plans and persists subscriptions against the fake backend
 * (json-server) or Firebase Realtime Database in production.
 */
export class SubscriptionApi extends BaseApi {
    #plansEndpoint
    #subscriptionsEndpoint

    constructor() {
        super()
        this.#plansEndpoint = new BaseEndpoint(this, plansEndpointPath)
        this.#subscriptionsEndpoint = new BaseEndpoint(this, subscriptionsEndpointPath)
    }

    getPlans() { return this.#plansEndpoint.getAll() }
    getSubscriptions() { return this.#subscriptionsEndpoint.getAll() }
    getSubscriptionById(id) { return this.#subscriptionsEndpoint.getById(id) }
    createSubscription(resource) { return this.#subscriptionsEndpoint.create(resource) }
    updateSubscription(id, resource) { return this.#subscriptionsEndpoint.update(id, resource) }
}
