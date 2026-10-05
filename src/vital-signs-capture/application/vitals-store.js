import { emit } from '../../shared/application/event-bus.js'
import { VitalSignsApi } from '../infrastructure/vital-signs-api.js'
import { VitalsConfirmedEvent } from '../domain/events/vitals-confirmed-event.js'
import { deviceStore } from './device-store.js'

const api = new VitalSignsApi()
const plain = o => JSON.parse(JSON.stringify(o))
const pad = n => String(n).padStart(2, '0')
const nowTime = () => {
    const d = new Date()
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/**
 * Produces a simulated automatic reading for a linked device type.
 * @param {Object} ep - Episode receiving the reading.
 * @param {Object} d - Linked device ({ type, model, online }).
 */
export function readFromDevice(ep, d) {
    if (ep.confirmed || !d.online) return
    const t = { pa: { sample: () => { const s = 95 + Math.round(Math.random() * 60); return `${s}/${40 + Math.round(Math.random() * 50)}` } }, spo2: { sample: () => String(88 + Math.round(Math.random() * 12)) }, fc: { sample: () => String(55 + Math.round(Math.random() * 70)) }, temp: { sample: () => (35.5 + Math.random() * 3.4).toFixed(1) } }[d.type]
    const time = nowTime()
    ep.vitals[d.type] = { value: t.sample(), source: 'auto', model: d.model, time }
    d.lastUse = time
    persist(ep)
}

/**
 * Stores a manually entered vital sign value (contingency mode).
 * @param {Object} ep - Episode receiving the value.
 * @param {string} key - Vital type key (pa, spo2, fc, temp).
 * @param {string} value - Manually entered value.
 */
export function setManual(ep, key, value) {
    ep.vitals[key] = { value, source: 'manual', time: nowTime() }
    persist(ep)
}

/** Removes a vital sign reading from the episode. */
export function clearVital(ep, key) {
    delete ep.vitals[key]
    persist(ep)
}

/**
 * Confirms the readings of the episode: seals them, stamps the time and
 * raises the VitalsConfirmedEvent on the application event bus.
 * @param {Object} ep - Episode whose readings are confirmed.
 */
export function confirmReadings(ep) {
    ep.confirmed = true
    ep.vitalsConfirmedAt = new Date().toISOString()
    emit('vitals-confirmed', { episodeId: ep.id, confirmedAt: ep.vitalsConfirmedAt, vitals: ep.vitals })
    persist(ep)
}

/**
 * Releases every device linked to an episode, making them available for
 * the next patient. Persisted to the backend.
 * @param {string} episodeId - Episode whose devices are released.
 */
export function releaseEpisodeDevices(episodeId) {
    const plain2 = o => JSON.parse(JSON.stringify(o))
    for (const d of deviceStore.devices) {
        if (d.linkedEpisode && String(d.linkedEpisode) === String(episodeId)) {
            d.linkedEpisode = null
            if (!String(d.id).startsWith('tmp-')) {
                api.updateDevice(d.id, plain2(d)).catch(console.error)
            }
        }
    }
}

/** Rejects the readings: clears them and re-enables capture for a new round. */
export function rejectReadings(ep) {
    ep.vitals = {}
    ep.confirmed = false
    ep.vitalsConfirmedAt = null
    persist(ep)
}

function persist(ep) {
    api.updateEpisodeVitals(ep.id, plain(JSON.parse(JSON.stringify(ep)))).catch(console.error)
}
