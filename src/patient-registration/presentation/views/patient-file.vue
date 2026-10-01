<script setup>
import { ref, reactive, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { docLabel } from '../../application/document-types.js'
import { store, findEpisode, ageOf, fmtTime, fmtDateTime, vitalTypes, addDevice, removeDevice, readFromDevice, setManual, clearVital } from '../../application/patient-store.js'

const route = useRoute()
const router = useRouter()
const id = route.params.episode
const ep = computed(() => findEpisode(id))
if (!ep.value) router.replace('/patient-registration')

const p = computed(() => ep.value.patient)
const initials = computed(() => ((p.value.names[0] || '') + (p.value.surnames[0] || '')).toUpperCase())
const fullName = computed(() => `${p.value.surnames}, ${p.value.names}`)
const meta = computed(() => [
  docLabel(p.value),
  `${ageOf(p.value.birth)} años`,
  `Llegada ${fmtTime(ep.value.arrival)}`,
  ep.value.id
].join(' · '))
const dmy = s => s.split('-').reverse().join('/')
const rows = computed(() => [
  ['Documento', docLabel(p.value)],
  ['Fecha de nacimiento', dmy(p.value.birth)],
  ['Nombres', p.value.names],
  ['Apellidos', p.value.surnames],
  ['Sexo', p.value.sex],
  ['Teléfono', p.value.phone],
  ['Dirección', p.value.address]
])
const visits = computed(() => store.episodes.filter(e => e.key === ep.value.key).slice().reverse())

const tabs = [
  { id: 'vitals', label: 'Signos vitales' },
  { id: 'data', label: 'Datos personales' },
  { id: 'history', label: 'Historial de visitas' }
]
const tab = ref('vitals')

const icons = {
  pa: '<circle cx="12" cy="12" r="9"/><path d="M12 12l4-3"/>',
  spo2: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
  fc: '<path d="M3 12h4l2-6 4 12 2-6h6"/>',
  temp: '<path d="M10 14V5a2 2 0 0 1 4 0v9a4 4 0 1 1-4 0z"/>'
}
const typeOf = k => vitalTypes.find(t => t.key === k)

/* ---------- Dispositivos ---------- */
const showForm = ref(false)
const dForm = reactive({ type: 'pa', model: '' })
const dErr = ref('')
function link() {
  if (!dForm.model.trim()) { dErr.value = 'Indica la marca y el modelo.'; return }
  addDevice(dForm.type, dForm.model.trim())
  dForm.model = ''; dErr.value = ''; showForm.value = false
}
function closeForm() { showForm.value = false; dErr.value = ''; dForm.model = '' }

/* ---------- Signos vitales ---------- */
const dev = k => store.devices.find(d => d.type === k && d.online) || store.devices.find(d => d.type === k)
function state(k) {
  const v = ep.value.vitals[k]
  if (v) return v.source
  const d = dev(k)
  if (!d) return 'none'
  return d.online ? 'waiting' : 'lost'
}
const isBad = k => ['none', 'lost'].includes(state(k))
const shown = k => ep.value.vitals[k]?.value ?? '—'
const warn = k => state(k) === 'none' ? 'Sin dispositivo vinculado' : `Conexión con el ${typeOf(k).device.toLowerCase()} perdida temporalmente`
function metaLine(k) {
  const v = ep.value.vitals[k]
  if (v) return v.source === 'manual' ? `Ingreso manual · ${v.time}` : `${v.device} · ${v.time}`
  const d = dev(k)
  return d ? `Esperando lectura de ${typeOf(k).device.toLowerCase()} ${d.model}` : ''
}
const canManual = k => !ep.value.confirmed && !editing[k] && ['none', 'lost', 'waiting'].includes(state(k))

const editing = reactive({ pa: false, spo2: false, fc: false, temp: false })
const draft = reactive({ pa: { a: '', b: '' }, spo2: { a: '' }, fc: { a: '' }, temp: { a: '' } })
const mErr = reactive({ pa: '', spo2: '', fc: '', temp: '' })
function saveManual(t) {
  const k = t.key
  const [lo, hi] = t.lim
  const a = parseFloat(String(draft[k].a).replace(',', '.'))
  if (isNaN(a) || a < lo || a > hi) { mErr[k] = `Valor entre ${lo} y ${hi}`; return }
  let value = String(a)
  if (k === 'pa') {
    const b = parseFloat(draft.pa.b)
    if (isNaN(b) || b < 30 || b >= a) { mErr.pa = 'Diastólica inválida'; return }
    value = `${a}/${b}`
  }
  setManual(ep.value, k, value)
  mErr[k] = ''; editing[k] = false; draft[k].a = ''
  if (k === 'pa') draft.pa.b = ''
}

/* ---------- Confirmar / rechazar ---------- */
const toast = ref('')
const toastBad = ref(false)
let tt
function say(m, bad = false) { toast.value = m; toastBad.value = bad; clearTimeout(tt); tt = setTimeout(() => (toast.value = ''), 3200) }
function confirmReadings() {
  const missing = vitalTypes.filter(t => !ep.value.vitals[t.key]).map(t => t.label)
  if (missing.length) { say(`Faltan lecturas: ${missing.join(', ')}`, true); return }
  ep.value.confirmed = true
  say('Lecturas confirmadas')
}
function rejectReadings() {
  ep.value.vitals = {}
  ep.value.confirmed = false
  Object.keys(editing).forEach(k => (editing[k] = false))
  say('Lecturas rechazadas')
}
</script>

<template>
  <div v-if="ep" class="ta-page fi">
    <section class="ta-card fi-head fi-in" style="--d:0">
      <span class="fi-av">{{ initials }}</span>
      <div>
        <div class="fi-name">{{ fullName }}</div>
        <div class="fi-meta">{{ meta }}</div>
      </div>
      <span class="fi-pill">Sin clasificar</span>
    </section>

    <nav class="fi-tabs fi-in" style="--d:1">
      <button v-for="t in tabs" :key="t.id" :class="{ on: tab === t.id }" @click="tab = t.id">{{ t.label }}</button>
    </nav>

    <Transition name="fade" mode="out-in">
      <div v-if="tab === 'vitals'" key="v" class="fi-stack">
        <section class="ta-card fi-in" style="--d:2">
          <div class="fd-top">
            <div>
              <h3 class="ta-h">Dispositivos</h3>
              <p class="ta-sub">Estado de vinculación de los instrumentos de medición</p>
            </div>
            <button class="ta-btn ta-btn--ghost" @click="showForm ? closeForm() : (showForm = true)"><i class="pi pi-sync"></i>Vincular dispositivo</button>
          </div>

          <div class="fd-form" :class="{ open: showForm }">
            <div>
              <div class="fd-form__in">
                <select class="ta-select" v-model="dForm.type" aria-label="Tipo de dispositivo">
                  <option v-for="t in vitalTypes" :key="t.key" :value="t.key">{{ t.device }}</option>
                </select>
                <input class="ta-input" v-model="dForm.model" placeholder="Marca y modelo (ej. Bosch GL100)" aria-label="Marca y modelo" @keyup.enter="link" />
                <button class="ta-btn" @click="link">Vincular</button>
                <button class="ta-btn ta-btn--ghost" @click="closeForm">Cancelar</button>
                <small v-if="dErr" class="ta-err fd-err">{{ dErr }}</small>
              </div>
            </div>
          </div>

          <TransitionGroup name="list" tag="ul" class="fd-list">
            <li v-for="d in store.devices" :key="d.id">
              <span class="fd-ico"><svg viewBox="0 0 24 24" v-html="icons[d.type]"></svg></span>
              <div class="fd-info"><b>{{ typeOf(d.type).device }} · {{ d.model }}</b><small>{{ d.lastUse ? 'último uso ' + d.lastUse : 'sin lecturas aún' }}</small></div>
              <button class="ta-btn ta-btn--ghost ta-btn--sm" :disabled="!d.online || ep.confirmed" @click="readFromDevice(ep, d)">Simular lectura</button>
              <button class="fd-badge" :class="d.online ? 'on' : 'off'" title="Clic para cambiar el estado" @click="d.online = !d.online"><i></i>{{ d.online ? 'Conectado' : 'Desconectado' }}</button>
              <button class="fd-x" aria-label="Desvincular" @click="removeDevice(d.id)">×</button>
            </li>
          </TransitionGroup>
          <p v-if="!store.devices.length" class="fd-empty">Aún no hay dispositivos vinculados.</p>
        </section>

        <div class="fv-grid">
          <article v-for="(t, i) in vitalTypes" :key="t.key" class="fv-card" :class="{ bad: isBad(t.key) }" :style="{ '--i': i }">
            <header>
              <span class="fv-t"><svg viewBox="0 0 24 24" v-html="icons[t.key]"></svg>{{ t.label }}</span>
              <span v-if="state(t.key) === 'auto' || state(t.key) === 'manual'" class="fv-badge" :class="state(t.key)"><i></i>{{ state(t.key) === 'manual' ? 'manual' : 'automático' }}</span>
            </header>
            <Transition name="flip" mode="out-in">
              <div class="fv-val" :key="shown(t.key)"><b>{{ shown(t.key) }}</b><span>{{ t.unit }}</span></div>
            </Transition>
            <p v-if="metaLine(t.key)" class="fv-meta">{{ metaLine(t.key) }}</p>
            <p v-if="isBad(t.key)" class="fv-warn"><i class="pi pi-exclamation-triangle"></i>{{ warn(t.key) }}</p>

            <Transition name="fade">
              <div v-if="editing[t.key]" class="fv-manual">
                <input class="ta-input" v-model="draft[t.key].a" inputmode="decimal" :placeholder="t.ph" :aria-label="t.label" @keyup.enter="saveManual(t)" />
                <input v-if="t.key === 'pa'" class="ta-input" v-model="draft.pa.b" inputmode="numeric" placeholder="Diastólica" aria-label="Diastólica" @keyup.enter="saveManual(t)" />
                <div class="fv-row">
                  <button class="ta-btn ta-btn--sm" @click="saveManual(t)">Guardar</button>
                  <button class="ta-btn ta-btn--ghost ta-btn--sm" @click="editing[t.key] = false">Cancelar</button>
                </div>
                <small v-if="mErr[t.key]" class="ta-err">{{ mErr[t.key] }}</small>
              </div>
            </Transition>

            <button v-if="canManual(t.key)" class="ta-btn ta-btn--ghost ta-btn--sm" @click="editing[t.key] = true">Ingresar manualmente</button>
            <button v-if="state(t.key) === 'manual' && !ep.confirmed" class="ta-btn ta-btn--ghost ta-btn--sm" @click="clearVital(ep, t.key)">Quitar valor manual</button>
          </article>
        </div>

        <div class="fi-actions">
          <span v-if="ep.confirmed" class="fi-done"><i class="pi pi-check"></i>Lecturas confirmadas</span>
          <button class="ta-btn ta-btn--ghost" :disabled="ep.confirmed" @click="rejectReadings">Rechazar lecturas</button>
          <button class="ta-btn" :disabled="ep.confirmed" @click="confirmReadings">Confirmar lecturas</button>
        </div>
      </div>

      <section v-else-if="tab === 'data'" key="d" class="ta-card">
        <h3 class="ta-h">Datos personales</h3>
        <p class="ta-sub">Registrados al ingreso del paciente</p>
        <dl class="fi-dl">
          <div v-for="r in rows" :key="r[0]"><dt>{{ r[0] }}</dt><dd>{{ r[1] }}</dd></div>
        </dl>
      </section>

      <section v-else key="h" class="ta-card">
        <h3 class="ta-h">Historial de visitas</h3>
        <p class="ta-sub">Ingresos registrados de este paciente</p>
        <ul class="fi-visits">
          <li v-for="v in visits" :key="v.id"><b>{{ v.id }}</b><span>Llegada {{ fmtDateTime(v.arrival) }}</span></li>
        </ul>
      </section>
    </Transition>

    <Transition name="toast"><div v-if="toast" class="fi-toast" :class="{ bad: toastBad }">{{ toast }}</div></Transition>
  </div>
</template>

<style>
.fi-in{animation:ta-rise .6s calc(var(--d,0)*.1s) both}
.fi-stack{display:grid;gap:16px}
.fi-head{display:flex;align-items:center;gap:14px;padding:16px 20px}
.fi-av{width:40px;height:40px;border-radius:10px;background:#d6eedd;color:var(--ta-brand);display:grid;place-items:center;font-weight:600;font-size:13px;flex:none}
.fi-name{font-size:15px;font-weight:600}
.fi-meta{font-family:var(--ta-mono);font-size:10.5px;color:var(--ta-muted);margin-top:3px}
.fi-pill{margin-left:auto;font-size:11px;padding:3px 10px;border-radius:999px;background:#eef0f2;color:var(--ta-muted);white-space:nowrap}
.fi-tabs{display:flex;gap:22px;padding:0 4px}
.fi-tabs button{position:relative;border:0;background:none;font:inherit;font-size:12.5px;color:var(--ta-muted);padding:10px 0;cursor:pointer;transition:color .2s}
.fi-tabs button::after{content:'';position:absolute;left:0;right:0;bottom:0;height:2px;background:var(--ta-brand);transform:scaleX(0);transform-origin:left;transition:transform .3s}
.fi-tabs button.on{color:var(--ta-brand);font-weight:500}
.fi-tabs button.on::after{transform:scaleX(1)}
.fi-tabs button:focus-visible{outline:2px solid var(--ta-accent);outline-offset:2px;border-radius:4px}

.fd-top{display:flex;align-items:flex-start;justify-content:space-between;gap:14px}
.fd-top .ta-sub{margin-bottom:14px}
.fd-form{display:grid;grid-template-rows:0fr;transition:grid-template-rows .35s ease}
.fd-form.open{grid-template-rows:1fr}
.fd-form>div{overflow:hidden;min-height:0}
.fd-form__in{display:grid;grid-template-columns:190px 1fr auto auto;gap:10px;align-items:start;padding:4px 4px 16px}
.fd-err{grid-column:1/-1}
.fd-list{list-style:none;margin:0;padding:0;border-top:1px solid var(--ta-line)}
.fd-list li{display:flex;align-items:center;gap:12px;padding:12px 4px;border-bottom:1px solid var(--ta-line);flex-wrap:wrap}
.fd-ico{width:30px;height:30px;border-radius:8px;background:#e3f3ea;color:var(--ta-brand);display:grid;place-items:center;flex:none}
.fd-ico svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
.fd-info{flex:1;min-width:160px;display:grid}
.fd-info b{font-size:13px;font-weight:500}
.fd-info small{font-family:var(--ta-mono);font-size:10px;color:var(--ta-muted)}
.fd-badge{display:flex;align-items:center;gap:6px;border:0;font:inherit;font-size:11px;padding:3px 10px;border-radius:999px;cursor:pointer;transition:background .2s,color .2s}
.fd-badge i{width:6px;height:6px;border-radius:50%;background:currentColor}
.fd-badge.on{background:#e3f3ea;color:var(--ta-brand)}
.fd-badge.off{background:#eef0f2;color:var(--ta-muted)}
.fd-x{border:0;background:none;font-size:20px;line-height:1;color:var(--ta-muted);cursor:pointer;transition:color .2s}
.fd-x:hover{color:var(--ta-danger)}
.fd-empty{margin:16px 0 0;font-size:12px;color:var(--ta-muted);text-align:center}

.fv-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px}
.fv-card{background:#fff;border:1px solid var(--ta-line);border-radius:12px;padding:14px;display:grid;gap:9px;align-content:start;animation:ta-rise .55s calc(var(--i)*.09s + .1s) both;transition:border-color .3s,background .3s}
.fv-card.bad{border-color:var(--ta-danger-line);background:var(--ta-danger-bg)}
.fv-card header{display:flex;justify-content:space-between;align-items:center;gap:8px}
.fv-t{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--ta-muted)}
.fv-t svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round;flex:none}
.fv-badge{display:flex;align-items:center;gap:5px;font-size:10px;padding:2px 8px;border-radius:999px;background:#e3f3ea;color:var(--ta-brand);white-space:nowrap}
.fv-badge i{width:6px;height:6px;border-radius:50%;background:var(--ta-accent);animation:fi-pulse 1.6s infinite}
.fv-badge.manual{background:#eef0f2;color:var(--ta-muted)}
.fv-badge.manual i{animation:none;background:var(--ta-muted)}
@keyframes fi-pulse{0%{box-shadow:0 0 0 0 rgba(52,210,123,.6)}100%{box-shadow:0 0 0 7px rgba(52,210,123,0)}}
.fv-val{display:flex;align-items:baseline;gap:5px}
.fv-val b{font-size:24px;font-weight:600}
.fv-val span{font-size:11px;color:var(--ta-muted)}
.fv-meta{margin:0;font-family:var(--ta-mono);font-size:10px;color:var(--ta-muted)}
.fv-warn{margin:0;font-size:11px;color:var(--ta-danger);display:flex;gap:6px;align-items:flex-start}
.fv-warn i{font-size:11px;margin-top:2px}
.fv-manual{display:grid;gap:8px}
.fv-manual .ta-input{height:34px}
.fv-row{display:flex;gap:8px}

.fi-actions{display:flex;justify-content:flex-end;align-items:center;gap:10px;flex-wrap:wrap}
.fi-done{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--ta-brand);margin-right:auto}
.fi-dl{margin:0;display:grid;grid-template-columns:1fr 1fr;gap:16px 20px}
.fi-dl div{display:grid;gap:4px}
.fi-dl dt{font-size:11px;color:var(--ta-muted)}
.fi-dl dd{margin:0;font-size:13px;font-weight:500}
.fi-visits{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.fi-visits li{display:flex;justify-content:space-between;gap:12px;padding:10px 12px;border:1px solid var(--ta-line);border-radius:10px;background:#fff;font-size:12px}
.fi-visits b{font-family:var(--ta-mono);font-weight:500}
.fi-visits span{color:var(--ta-muted)}
.fi-toast{position:fixed;bottom:28px;right:28px;background:var(--ta-ink);color:#fff;padding:12px 18px;border-radius:10px;font-size:13px;box-shadow:0 10px 30px rgba(0,0,0,.25);max-width:360px}
.fi-toast.bad{background:var(--ta-danger)}
@media(max-width:760px){.fd-form__in,.fi-dl{grid-template-columns:1fr}}
</style>