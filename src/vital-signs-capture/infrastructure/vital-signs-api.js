import { BaseApi } from '../../shared/infrastructure/base-api.js'
import { BaseEndpoint } from '../../shared/infrastructure/base-endpoint.js'

const episodesPath = import.meta.env.VITE_EPISODES_ENDPOINT_PATH
const devicesPath = import.meta.env.VITE_DEVICES_ENDPOINT_PATH

/**
 * Infrastructure gateway of the Vital Signs Capture bounded context.
 * The readings live inside the episode resource; the devices inventory
 * has its own collection.
 */
export class VitalSignsApi extends BaseApi {
    #episodesEndpoint
    #devicesEndpoint

    constructor() {
        super()
        this.#episodesEndpoint = new BaseEndpoint(this, episodesPath)
        this.#devicesEndpoint = new BaseEndpoint(this, devicesPath)
    }

    updateEpisodeVitals(id, resource) {
        return this.#episodesEndpoint.update(id, resource)
    }

    getDevices() { return this.#devicesEndpoint.getAll() }
    createDevice(resource) { return this.#devicesEndpoint.create(resource) }
    updateDevice(id, resource) { return this.#devicesEndpoint.update(id, resource) }
    deleteDevice(id) { return this.#devicesEndpoint.delete(id) }
}
