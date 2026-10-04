import { reactive } from 'vue'
import { PatientRegistrationApi } from '../infrastructure/patient-registration-api.js'

/**
 * Local reactive-cache state synced with the fake backend (json-server).
 * Every mutation is written through the API, and persisted collections
 * are loaded on app startup (see loadFromServer at the bottom).
 */
// (handled by the header JSDoc)

const api = new PatientRegistrationApi()
export const store = reactive({ patients: [], episodes: [], devices: [], seq: 0, devSeq: 0, loaded: false })

// serializes a reactive proxy into plain JSON for HTTP requests
const plain = o => JSON.parse(JSON.stringify(o))
const epResource = ep => {
  const copy = plain(ep)
  delete copy.patient // the patient lives in its own collection
  return copy
}

const pad = n => String(n).padStart(2, '0')
const rnd = (a, b) => Math.round(a + Math.random() * (b - a))

export const fmtTime = iso => { const d = new Date(iso); return `${pad(d.getHours())}:${pad(d.getMinutes())}` }
export const fmtDateTime = iso => { const d = new Date(iso); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${fmtTime(iso)}` }
const nowTime = () => fmtTime(new Date().toISOString())

export const vitalTypes = [
  { key: 'pa', label: 'Presión arterial', device: 'Tensiómetro', unit: 'mmHg', ph: 'Sistólica', lim: [50, 260],
    sample: () => { const s = rnd(95, 160); return `${s}/${rnd(60, Math.min(100, s - 15))}` } },
  { key: 'spo2', label: 'SpO₂', device: 'Oxímetro', unit: '%', ph: '98', lim: [50, 100], sample: () => String(rnd(88, 100)) },
  { key: 'fc', label: 'Frecuencia cardíaca', device: 'Pulsímetro', unit: 'lpm', ph: '72', lim: [20, 250], sample: () => String(rnd(55, 120)) },
  { key: 'temp', label: 'Temperatura', device: 'Termómetro', unit: '°C', ph: '36.5', lim: [30, 45], sample: () => (35.5 + Math.random() * 3.4).toFixed(1) }
]

export function ageOf(birth) {
  const [y, m, d] = birth.split('-').map(Number)
  const n = new Date()
  let a = n.getFullYear() - y
  if (n.getMonth() + 1 < m || (n.getMonth() + 1 === m && n.getDate() < d)) a--
  return a
}

export function registerEpisode(data) {
  const now = new Date()
  const patient = { ...data }
  const i = data.dni ? store.patients.findIndex(p => p.dni === data.dni) : -1
  if (i >= 0) {
    store.patients[i] = { ...store.patients[i], ...patient }
    api.updatePatient(store.patients[i].id ?? store.patients[i].dni, plain(store.patients[i])).catch(console.error)
  } else {
    store.patients.push(patient)
    api.createPatient(plain(patient)).then(r => {
      const j = store.patients.findIndex(x => x.dni === patient.dni)
      if (j >= 0) store.patients[j].id = r.data.id
    }).catch(console.error)
  }

  store.seq++
  // The prefix changes daily; the sequence follows that day count (no collisions after reloads)
  const prefix = `EP-${String(now.getFullYear()).slice(2)}${pad(now.getMonth() + 1)}${pad(now.getDate())}`
  const todays = store.episodes.filter(e => String(e.id || '').startsWith(prefix))
  const next = todays.reduce((mx, e) => Math.max(mx, parseInt(String(e.id).split('-')[2]) || 0), 0) + 1
  const id = `${prefix}-${String(next).padStart(4, '0')}`
  const ep = { id, key: data.dni || `temp-${store.seq}`, patient, arrival: now.toISOString(), vitals: {}, confirmed: false }
  store.episodes.push(ep)
  api.createEpisode(epResource(ep)).catch(console.error)
  return ep
}

export const findEpisode = id => store.episodes.find(e => e.id === id)

// TODO: replace with a backend query once the real database exists
export const findPatient = (type, number) => store.patients.find(p => !p.sinDni && (p.docType || 'dni') === type && p.dni === number) || null

export function addDevice(type, model) {
  const device = { type, model, online: true, lastUse: '' }
  store.devices.push(device)
  api.createDevice(plain(device)).then(r => { device.id = r.data.id }).catch(console.error)
}
export function removeDevice(id) {
  store.devices = store.devices.filter(d => d.id !== id)
  if (!String(id).startsWith('tmp-')) api.deleteDevice(id).catch(console.error)
}

// Simulation: there is no real hardware yet
export function saveEpisode(ep) {
  api.updateEpisode(ep.id, epResource(ep)).catch(console.error)
}

export function readFromDevice(ep, d) {
  if (ep.confirmed || !d.online) return
  const t = vitalTypes.find(x => x.key === d.type)
  const time = nowTime()
  ep.vitals[d.type] = { value: t.sample(), source: 'auto', model: d.model, time }
  d.lastUse = time
}
export function setManual(ep, key, value) { ep.vitals[key] = { value, source: 'manual', time: nowTime() }; saveEpisode(ep) }
export function clearVital(ep, key) { delete ep.vitals[key]; saveEpisode(ep) }

/** Loads the persisted collections on app startup (before mounting). */
export async function loadFromServer() {
  try {
    const [pts, eps, devs] = await Promise.all([api.getPatients(), api.getEpisodes(), api.getDevices()])
    store.patients = pts.data || []
    store.episodes = eps.data || []
    store.devices = devs.data || []
    // re-link each episode with its patient (the episode resource does not
    // duplicate patient data)
    for (const e of store.episodes) {
      e.patient = store.patients.find(pt => String(pt.dni) === String(e.key))
        || store.patients.find(pt => String(pt.id) === String(e.key)) || e.patient
    }
    store.devSeq = store.devices.reduce((mx, d) => {
      const n = parseInt(String(d.id))
      return String(d.id || '').startsWith('tmp-') || isNaN(n) ? mx : Math.max(mx, n)
    }, 0)
    store.loaded = true
  } catch (e) {
    console.error('No se pudo cargar la data persistida:', e)
    store.loaded = true
  }
}
