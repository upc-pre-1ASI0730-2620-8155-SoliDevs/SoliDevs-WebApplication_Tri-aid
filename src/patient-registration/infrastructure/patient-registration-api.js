import { BaseApi } from '../../shared/infrastructure/base-api.js'
import { BaseEndpoint } from '../../shared/infrastructure/base-endpoint.js'

const patientsPath = import.meta.env.VITE_PATIENTS_ENDPOINT_PATH
const episodesPath = import.meta.env.VITE_EPISODES_ENDPOINT_PATH
const devicesPath = import.meta.env.VITE_DEVICES_ENDPOINT_PATH

/**
 * Infrastructure gateway for the Patient Registration bounded context.
 * Persists patients, episodes and devices against the fake backend.
 */
export class PatientRegistrationApi extends BaseApi {
    #patientsEndpoint
    #episodesEndpoint
    #devicesEndpoint

    constructor() {
        super()
        this.#patientsEndpoint = new BaseEndpoint(this, patientsPath, { tenantScoped: true })
        this.#episodesEndpoint = new BaseEndpoint(this, episodesPath, { tenantScoped: true })
        this.#devicesEndpoint = new BaseEndpoint(this, devicesPath, { tenantScoped: true })
    }

    getPatients() { return this.#patientsEndpoint.getAll() }
    createPatient(resource) { return this.#patientsEndpoint.create(resource) }
    updatePatient(id, resource) { return this.#patientsEndpoint.update(id, resource) }
    createTemporaryProfile(resource) { return this.http.post(`${patientsPath}/temporary`, resource) }
    updatePatientContact(id, resource) { return this.http.put(`${patientsPath}/${id}/contact`, resource) }

    getEpisodes() { return this.#episodesEndpoint.getAll() }
    createEpisode(resource) { return this.#episodesEndpoint.create(resource) }
    updateEpisode(id, resource) { return this.#episodesEndpoint.update(id, resource) }
    openEpisode(resource) { return this.#episodesEndpoint.create(resource) }
    startTriage(id) { return this.http.put(`${episodesPath}/${id}/start-triage`) }
    markReferred(id) { return this.http.put(`${episodesPath}/${id}/referred`) }

    getDevices() { return this.#devicesEndpoint.getAll() }
    createDevice(resource) { return this.#devicesEndpoint.create(resource) }
    deleteDevice(id) { return this.#devicesEndpoint.delete(id) }
    updateDevice(id, resource) { return this.#devicesEndpoint.update(id, resource) }
}
