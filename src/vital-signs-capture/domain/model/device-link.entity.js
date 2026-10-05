/**
 * DeviceLink entity: a measurement device of the platform inventory.
 * While linkedEpisode is set, the device is monitoring that episode and
 * cannot be assigned to another patient.
 */
export class DeviceLink {
    constructor({ id = null, type, model, online = true, lastUse = '', linkedEpisode = null, linkedAt = null } = {}) {
        this.id = id
        this.type = type
        this.model = model
        this.online = online
        this.lastUse = lastUse
        this.linkedEpisode = linkedEpisode
        this.linkedAt = linkedAt
    }

    get isFree() {
        return !this.linkedEpisode
    }

    assignTo(episodeId) {
        this.linkedEpisode = episodeId
        this.linkedAt = new Date().toISOString()
    }

    release() {
        delete this.linkedEpisode
        delete this.linkedAt
    }
}
