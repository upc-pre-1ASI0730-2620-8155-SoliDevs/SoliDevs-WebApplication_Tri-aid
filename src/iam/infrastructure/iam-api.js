import { BaseApi } from '../../shared/infrastructure/base-api.js'
import { BaseEndpoint } from '../../shared/infrastructure/base-endpoint.js'

const usersEndpointPath = import.meta.env.VITE_USERS_ENDPOINT_PATH
const sessionsEndpointPath = import.meta.env.VITE_SESSIONS_ENDPOINT_PATH

/**
 * Infrastructure gateway for the IAM bounded context.
 * Validates credentials and tracks sessions against the fake backend
 * (json-server) or the platform API in production.
 *
 * Backend swap note: when the C#/.NET API lands, point
 * VITE_TRIAGE_PLATFORM_API_URL to it and adjust the endpoint paths in
 * the .env files. Nothing in the presentation layer changes.
 */
export class IamApi extends BaseApi {
    #usersEndpoint
    #sessionsEndpoint

    constructor() {
        super()
        this.#usersEndpoint = new BaseEndpoint(this, usersEndpointPath)
        this.#sessionsEndpoint = new BaseEndpoint(this, sessionsEndpointPath)
    }

    getUsers() { return this.#usersEndpoint.getAll() }
    getUserById(id) { return this.#usersEndpoint.getById(id) }
    createUser(resource) { return this.#usersEndpoint.create(resource) }
    updateUser(id, resource) { return this.#usersEndpoint.update(id, resource) }
    getSessions() { return this.#sessionsEndpoint.getAll() }
    createSession(resource) { return this.#sessionsEndpoint.create(resource) }
    deleteSession(id) { return this.#sessionsEndpoint.delete(id) }
}
