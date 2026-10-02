import { reactive } from 'vue'

// Estado en memoria (aún sin backend). TODO: reemplazar por llamadas al API (ASP.NET Core).
export const store = reactive({ patients: [], episodes: [], devices: [], seq: 0, devSeq: 0 })

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
  if (i >= 0) store.patients[i] = patient; else store.patients.push(patient)
  store.seq++
  // TODO: el código del episodio lo generará el backend
  const id = `EP-${String(now.getFullYear()).slice(2)}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${String(store.seq).padStart(4, '0')}`
  const ep = { id, key: data.dni || `temp-${store.seq}`, patient, arrival: now.toISOString(), vitals: {}, confirmed: false }
  store.episodes.push(ep)
  return ep
}

export const findEpisode = id => store.episodes.find(e => e.id === id)

// TODO: reemplazar por consulta al backend cuando exista la BD
export const findPatient = (type, number) => store.patients.find(p => !p.sinDni && (p.docType || 'dni') === type && p.dni === number) || null

export function addDevice(type, model) {
  store.devices.push({ id: ++store.devSeq, type, model, online: true, lastUse: '' })
}
export function removeDevice(id) { store.devices = store.devices.filter(d => d.id !== id) }

// Simulación: aún no hay hardware real
export function readFromDevice(ep, d) {
  if (ep.confirmed || !d.online) return
  const t = vitalTypes.find(x => x.key === d.type)
  const time = nowTime()
  ep.vitals[d.type] = { value: t.sample(), source: 'auto', model: d.model, time }
  d.lastUse = time
}
export function setManual(ep, key, value) { ep.vitals[key] = { value, source: 'manual', time: nowTime() } }
export function clearVital(ep, key) { delete ep.vitals[key] }