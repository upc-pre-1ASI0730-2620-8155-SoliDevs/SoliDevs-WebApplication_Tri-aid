import { reactive } from 'vue'
import { VitalSignsApi } from '../infrastructure/vital-signs-api.js'

/**
 * Device inventory state of the Vital Signs Capture bounded context.
 */
export const deviceStore = reactive({ devices: [] })
if (import.meta.env.DEV) window.__deviceStore = deviceStore

const api = new VitalSignsApi()
const plain = o => JSON.parse(JSON.stringify(o))

/** Loads the device inventory from the fake backend. */
export async function loadDevices() {
    try {
        const r = await api.getDevices()
        deviceStore.devices = r.data || []
    } catch (e) { console.error(e) }
}

/**
 * Adds a device to the platform inventory. The local temporary id is
 * replaced by the backend-assigned id once the create resolves.
 * @param {string} type - DeviceType key (pa, spo2, fc, temp).
 * @param {string} model - Brand and model.
 * @returns {Object} The created device.
 */
export function addDevice(type, model) {
    const device = { type, model, online: true, lastUse: '' }
    deviceStore.devices.push(device)
    api.createDevice(plain(device)).then(r => { device.id = r.data.id }).catch(console.error)
    return device
}

/** Removes a device from the platform inventory. */
export function removeDevice(id) {
    deviceStore.devices = deviceStore.devices.filter(d => String(d.id) !== String(id))
    if (!String(id).startsWith('tmp-')) api.deleteDevice(id).catch(console.error)
}

/**
 * Toggles (and persists) the online/offline state of a device.
 * @param {string|number} id - Device id.
 * @param {boolean} online
 */
export function setDeviceOnline(id, online) {
    const d = deviceStore.devices.find(x => String(x.id) === String(id))
    if (!d) return
    d.online = online
    if (!String(id).startsWith('tmp-')) api.updateDevice(id, plain(d)).catch(console.error)
}

/**
 * Devices currently assigned to an episode.
 * @param {string} episodeId
 * @returns {Array<Object>} Linked devices.
 */
export const linkedDevices = episodeId => deviceStore.devices.filter(d => d.linkedEpisode === episodeId)

/**
 * Links a device to a triage episode (US12), persisting the change.
 * @param {Object} episode - Episode entity.
 * @param {string|number} deviceId - Device id to link.
 */
export function linkDeviceToEpisode(episode, deviceId) {
    const d = deviceStore.devices.find(x => String(x.id) === String(deviceId))
    if (!d) return
    d.linkedEpisode = episode.id
    if (!String(d.id).startsWith('tmp-')) api.updateDevice(d.id, plain(d)).catch(console.error)
}

/**
 * Unlinks a device from its triage episode, persisting the change.
 * @param {Object} episode - Episode entity.
 * @param {string|number} deviceId - Device id to unlink.
 */
export function unlinkDeviceFromEpisode(episode, deviceId) {
    const d = deviceStore.devices.find(x => String(x.id) === String(deviceId))
    if (!d) return
    d.linkedEpisode = null
    if (!String(d.id).startsWith('tmp-')) api.updateDevice(d.id, plain(d)).catch(console.error)
}
