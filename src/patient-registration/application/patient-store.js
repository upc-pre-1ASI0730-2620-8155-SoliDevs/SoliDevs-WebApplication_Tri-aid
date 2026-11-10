import { reactive } from 'vue'
import { session } from '../../shared/application/demo-session.js'
import { PatientRegistrationApi } from '../infrastructure/patient-registration-api.js'

/**
 * Patient Registration state: patients and care episodes, synced with the
 * fake backend (json-server). Vital signs and devices live in the
 * Vital Signs Capture bounded context.
 */
const api = new PatientRegistrationApi()
export const store = reactive({ patients: [], episodes: [], seq: 0, loaded: false })

const plain = o => JSON.parse(JSON.stringify(o))
const epResource = ep => {
  const copy = plain(ep)
  delete copy.patient
  return copy
}

const pad = n => String(n).padStart(2, '0')

// Readable temporary portal password for the patient (no 0/O/1/I to
// avoid dictation mistakes); the patient replaces it from the portal.
const TMP_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ'
const TMP_DIGITS = '23456789'
const randomFrom = alphabet => alphabet[Math.floor(Math.random() * alphabet.length)]
export function generateTemporaryPassword() {
    const letters = Array.from({ length: 3 }, () => randomFrom(TMP_ALPHABET)).join('')
    const digits = Array.from({ length: 4 }, () => randomFrom(TMP_DIGITS)).join('')
    return `${letters}-${digits}`
}


export const fmtTime = iso => { const d = new Date(iso); return `${pad(d.getHours())}:${pad(d.getMinutes())}` }
export const fmtDateTime = iso => { const d = new Date(iso); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${fmtTime(iso)}` }

export function ageOf(birth) {
  const [y, m, d] = birth.split('-').map(Number)
  const n = new Date()
  let a = n.getFullYear() - y
  if (n.getMonth() + 1 < m || (n.getMonth() + 1 === m && n.getDate() < d)) a--
  return a
}

/**
 * Registers (or updates) the patient and creates a new care episode.
 * Both records are persisted to the fake backend through the write-through
 * API client. The episode id follows the pattern EP-YYMMDD-#### where the
 * sequence is per day, so ids do not collide after page reloads.
 * @param {Object} data - Patient admission data ({ dni, names, surnames,
 *   birth, sex, phone, address, sinDni?, docType? }).
 * @returns {Object} The created episode.
 */
export async function registerEpisode(data) {
  const now = new Date()
  const patient = { ...data }
  const i = data.dni ? store.patients.findIndex(p => p.dni === data.dni) : -1
  if (i >= 0) {
    store.patients[i] = { ...store.patients[i], ...patient }
    api.updatePatient(store.patients[i].id ?? store.patients[i].dni, plain(store.patients[i])).catch(console.error)
  } else {
    // Temporary portal credentials: patient logs in with DNI (or email)
    // plus this password, and can replace it from the portal.
    patient.portalPassword = generateTemporaryPassword()
    patient.portalEmail = data.email || ''
    store.patients.push(patient)
    api.createPatient(plain(patient)).then(r => {
      const j = store.patients.findIndex(x => x.dni === patient.dni)
      if (j >= 0) store.patients[j].id = r.data.id
    }).catch(console.error)
  }

  store.seq++
  const prefix = `EP-${String(now.getFullYear()).slice(2)}${pad(now.getMonth() + 1)}${pad(now.getDate())}`
  // Episode ids are global primary keys while the visible store is
  // tenant-filtered: another institution may already hold today's
  // sequence, so the create retries on id collision.
  let id = null
  let ep = null
  for (let attempt = 1; attempt <= 10; attempt++) {
    const todays = store.episodes.filter(e => String(e.id || '').startsWith(prefix))
    const next = todays.reduce((mx, e) => Math.max(mx, parseInt(String(e.id).split('-')[2]) || 0), 0) + 1
    id = `${prefix}-${String(next).padStart(4, '0')}`
    ep = { id, key: data.dni || `temp-${store.seq}`, patient, arrival: now.toISOString(), vitals: {}, confirmed: false }
    try {
      await api.createEpisode(epResource(ep))
      break
    } catch (e) {
      if (attempt === 10) { console.error('Could not persist episode:', e); return ep }
      store.episodes.push({ id, institution: session.institution })
    }
  }
  store.episodes.push(ep)
  return ep
}

export const findEpisode = id => store.episodes.find(e => e.id === id)

export const findPatient = (type, number) => store.patients.find(p => !p.sinDni && (p.docType || 'dni') === type && p.dni === number) || null

/**
 * Persists the current episode state to the fake backend.
 * @param {Object} ep - Episode to persist.
 */
export function saveEpisode(ep) {
  api.updateEpisode(ep.id, epResource(ep)).catch(console.error)
}

/**
 * Loads patients and episodes from the fake backend into the reactive
 * store before the app mounts, and re-links every episode with its
 * patient record.
 * @returns {Promise<void>}
 */
export async function loadFromServer() {
  try {
    const [pts, eps] = await Promise.all([api.getPatients(), api.getEpisodes()])
    store.patients = pts.data || []
    store.episodes = eps.data || []
    for (const e of store.episodes) {
      if (!e.vitals || typeof e.vitals !== 'object') e.vitals = {}
      e.patient = store.patients.find(pt => String(pt.dni) === String(e.key))
        || store.patients.find(pt => String(pt.id) === String(e.key)) || e.patient
    }
    store.loaded = true
  } catch (e) {
    console.error('Could not load persisted data:', e)
    store.loaded = true
  }
}
