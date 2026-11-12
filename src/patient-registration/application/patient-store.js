import { reactive } from 'vue'
import { PatientRegistrationApi } from '../infrastructure/patient-registration-api.js'
import { PatientAssembler } from '../infrastructure/patient.assembler.js'
import { TriageEpisodeAssembler } from '../infrastructure/triage-episode.assembler.js'
import { EpisodeState } from '../infrastructure/triage-episode.resource.js'

/**
 * Patient Registration state: patients and triage episodes, synced with the
 * RESTful API. Vital signs and devices live in the Vital Signs Capture
 * bounded context.
 */
const api = new PatientRegistrationApi()
export const store = reactive({ patients: [], episodes: [], loaded: false })

const pad = n => String(n).padStart(2, '0')

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
 * Registers the patient (or updates the contact data of a known DNI) and
 * opens a new triage episode for the visit.
 * @param {Object} data - Patient admission data ({ dni, names, surnames,
 *   birth, sex, phone, address, sinDni?, docType? }).
 * @returns {Promise<Object>} The opened episode.
 */
export async function registerEpisode(data) {
  let patient = data.dni ? store.patients.find(p => p.dni === data.dni) : null
  if (patient) {
    if ((data.phone || '') !== patient.phone || (data.address || '') !== patient.address) {
      const r = await api.updatePatientContact(patient.id, PatientAssembler.toUpdateContactResource(data))
      Object.assign(patient, PatientAssembler.toStoreModel(r.data))
    }
  } else {
    const r = data.sinDni
      ? await api.createTemporaryProfile(PatientAssembler.toTemporaryProfileResource(data))
      : await api.createPatient(PatientAssembler.toCreateResource(data))
    patient = PatientAssembler.toStoreModel(r.data)
    store.patients.push(patient)
  }

  const r = await api.openEpisode(TriageEpisodeAssembler.toOpenResource(patient.id))
  const ep = TriageEpisodeAssembler.toStoreModel(r.data, patient)
  store.episodes.push(ep)
  return ep
}

export const findEpisode = id => store.episodes.find(e => e.id === id)

export const findPatient = (type, number) => store.patients.find(p => !p.sinDni && (p.docType || 'dni') === type && p.dni === number) || null

/**
 * Syncs the episode state with the API: triage starts once the vital signs
 * are confirmed and the episode is marked as referred after the referral.
 * Vital signs, classification and referral data are persisted by their
 * own bounded contexts.
 * @param {Object} ep - Episode to sync.
 */
export async function saveEpisode(ep) {
  try {
    if ((ep.confirmed || ep.referred) && ep.state === EpisodeState.Waiting) {
      ep.state = (await api.startTriage(ep.id)).data.state
    }
    if (ep.referred && ep.state === EpisodeState.InTriage) {
      ep.state = (await api.markReferred(ep.id)).data.state
    }
  } catch (e) {
    console.error(e)
  }
}

/**
 * Loads patients and triage episodes from the API into the reactive store
 * before the app mounts, and links every episode with its patient record.
 * @returns {Promise<void>}
 */
export async function loadFromServer() {
  try {
    const [pts, eps] = await Promise.all([api.getPatients(), api.getEpisodes()])
    store.patients = (pts.data || []).map(PatientAssembler.toStoreModel)
    store.episodes = (eps.data || [])
      .map(e => TriageEpisodeAssembler.toStoreModel(e, store.patients.find(p => p.id === e.patientId)))
      .filter(e => e.patient)
    store.loaded = true
  } catch (e) {
    console.error('Could not load persisted data:', e)
    store.loaded = true
  }
}
