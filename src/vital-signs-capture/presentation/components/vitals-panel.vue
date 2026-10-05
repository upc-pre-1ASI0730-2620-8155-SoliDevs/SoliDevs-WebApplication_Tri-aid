<script setup>
import { ref, reactive, computed } from 'vue'
import { t } from '../../../shared/application/i18n.js'
import { notify } from '../../../shared/application/toast-store.js'
import { deviceStore, linkedDevices, linkDeviceToEpisode, unlinkDeviceFromEpisode } from '../../application/device-store.js'
import { readFromDevice, setManual, clearVital, confirmReadings, rejectReadings } from '../../application/vitals-store.js'
import { DeviceType } from '../../domain/model/device-type.js'

const props = defineProps({ episode: { type: Object, required: true } })
const emit = defineEmits(['confirmed'])

const icons = {
  pa: '<circle cx="12" cy="12" r="9"/><path d="M12 12l4-3"/>',
  spo2: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
  fc: '<path d="M3 12h4l2-6 4 12 2-6h6"/>',
  temp: '<path d="M10 14V5a2 2 0 0 1 4 0v9a4 4 0 1 1-4 0z"/>'
}
const devName = k => t('vital.' + k + '.device')
const vLabel = k => t('vital.' + k + '.label')

/* ---------- Vinculacion desde el inventario (US12) ---------- */
const freeDevices = computed(() => deviceStore.devices.filter(d => !d.linkedEpisode))
const showForm = ref(false)
const pickId = ref(null)
const linkErr = ref('')
const pickedDevice = computed(() => freeDevices.value.find(d => String(d.id) === String(pickId.value)) || null)

function closeForm() { showForm.value = false; pickId.value = null; linkErr.value = '' }

function link() {
  linkErr.value = ''
  if (!pickedDevice.value) { linkErr.value = t('pf.chooseDevice'); return }
  if (!pickedDevice.value.online) {
    // US12 escenario 2: instrumento apagado o sin senal
    linkErr.value = t('pf.linkFail')
    return
  }
  linkDeviceToEpisode(props.episode, pickedDevice.value.id)
  pickId.value = null
  showForm.value = false
  notify({ type: 'success', title: t('pf.linkedOk') })
}

function unlink(d) {
  unlinkDeviceFromEpisode(props.episode, d.id)
  notify({ type: 'info', title: t('devices.toastUnlinked') })
}

/* ---------- Lecturas por tipo ---------- */
const dev = k => { const linked = linkedDevices(props.episode.id); return linked.find(d => d.type === k && d.online) || linked.find(d => d.type === k) }
function state(k) {
  const v = props.episode.vitals[k]
  if (v) return v.source
  const d = dev(k)
  if (!d) return 'none'
  return d.online ? 'waiting' : 'lost'
}
const isBad = k => ['none', 'lost'].includes(state(k))
const warn = k => state(k) === 'none' ? t('pf.warn.none') : t('pf.warn.lost', { device: devName(k).toLowerCase() })
function metaLine(k) {
  const v = props.episode.vitals[k]
  if (v) return v.source === 'manual' ? t('pf.meta.manual', { time: v.time }) : `${devName(k)}${v.model ? ' ' + v.model : ''} · ${v.time}`
  const d = dev(k)
  return d ? t('pf.waiting', { device: devName(k).toLowerCase(), model: d.model }) : ''
}
const canManual = k => !props.episode.confirmed && !editing[k] && manualMode[k] && ['none', 'lost', 'waiting'].includes(state(k))
const showManualBtn = k => !props.episode.confirmed && !editing[k] && !manualMode[k] && ['none', 'lost', 'waiting'].includes(state(k))
const startManual = k => { manualMode[k] = true }

/* Badge de estado de la tarjeta: manual / en linea / desconectado */
const badge = k => {
  const v = props.episode.vitals[k]
  if (!v) return null
  if (v.source === 'manual') return { cls: 'manual', label: t('pf.meta.manualShort') }
  const d = dev(k)
  return d?.online ? { cls: '', label: t('devices.online') } : { cls: 'manual', label: t('devices.offline') }
}

const editing = reactive({ pa: false, spo2: false, fc: false, temp: false })
const manualMode = reactive({ pa: false, spo2: false, fc: false, temp: false })
const draft = reactive({ pa: { a: '', b: '' }, spo2: { a: '' }, fc: { a: '' }, temp: { a: '' } })
const mErr = reactive({ pa: '', spo2: '', fc: '', temp: '' })
function saveManual(vt) {
  const k = vt.key
  const [lo, hi] = vt.lim
  const a = parseFloat(String(draft[k].a).replace(',', '.'))
  if (isNaN(a) || a < lo || a > hi) { mErr[k] = t('pf.err.range', { lo, hi }); return }
  let value = String(a)
  if (k === 'pa') {
    const b = parseFloat(draft.pa.b)
    if (isNaN(b) || b < 30 || b >= a) { mErr.pa = t('pf.err.dia'); return }
    value = `${a}/${b}`
  }
  setManual(props.episode, k, value)
  mErr[k] = ''; editing[k] = false; manualMode[k] = false; draft[k].a = ''
  if (k === 'pa') draft.pa.b = ''
}

/* ---------- Confirmar / rechazar (US18) ---------- */
async function onConfirm() {
  const missing = DeviceType.filter(x => !props.episode.vitals[x.key]).map(x => vLabel(x.key))
  if (missing.length) { notify({ type: 'error', title: t('pf.missing', { list: missing.join(', ') }) }); return }
  confirmReadings(props.episode)
  emit('confirmed')
}
function onReject() {
  rejectReadings(props.episode)
  notify({ type: 'info', title: t('pf.rejected') })
}
</script>

<template>
  <section class="ta-card fi-in" style="--d:2">
    <div class="fd-top">
      <div>
        <h3 class="ta-h">{{ t('pf.devices') }}</h3>
        <p class="ta-sub">{{ t('pf.devices.sub') }}</p>
      </div>
      <button class="ta-btn ta-btn--ghost" @click="showForm ? closeForm() : (showForm = true)"><i class="pi pi-sync"></i>{{ t('pf.link') }}</button>
    </div>

    <div class="fd-form" :class="{ open: showForm }">
      <div>
        <div class="fd-form__in">
          <div class="fd-form__pick">
            <label class="ta-label" for="pick-device">{{ t('pf.pickDevice') }}</label>
            <select id="pick-device" class="ta-select" v-model="pickId">
              <option :value="null" disabled>{{ t('pf.chooseDevice') }}</option>
              <option v-for="d in freeDevices" :key="d.id" :value="d.id">
                {{ devName(d.type) }} · {{ d.model }} ({{ d.online ? t('pf.connected') : t('pf.disconnected') }})
              </option>
            </select>
          </div>
          <button class="ta-btn" @click="link">{{ t('pf.linkBtn') }}</button>
          <button class="ta-btn ta-btn--ghost" @click="closeForm">{{ t('pf.cancel') }}</button>
          <small v-if="linkErr" class="ta-err fd-err">{{ linkErr }}</small>
        </div>
      </div>
    </div>
    <p v-if="showForm && !freeDevices.length" class="fd-empty">{{ t('pf.noFreeDevices') }}</p>

    <TransitionGroup name="list" tag="ul" class="fd-list">
      <li v-for="d in linkedDevices(props.episode.id)" :key="d.id">
        <span class="fd-ico"><svg viewBox="0 0 24 24" v-html="icons[d.type]"></svg></span>
        <div class="fd-info"><b>{{ devName(d.type) }} · {{ d.model }}</b><small>{{ d.lastUse ? t('pf.lastUse', { time: d.lastUse }) : t('pf.noReads') }}</small></div>
        <button class="ta-btn ta-btn--ghost ta-btn--sm" :disabled="!d.online || episode.confirmed" @click="readFromDevice(episode, d)">{{ t('pf.simulate') }}</button>
        <button class="ta-btn ta-btn--ghost ta-btn--sm" :disabled="episode.confirmed" @click="unlink(d)">{{ t('pf.unlink') }}</button>
      </li>
    </TransitionGroup>
    <div v-if="!linkedDevices(props.episode.id).length" class="fd-empty">
      <span class="fd-empty__ico"><i class="pi pi-box"></i></span>
      <b>{{ t('pf.noDevices') }}</b>
      <small>{{ t('pf.devices.sub') }}</small>
    </div>

    <div class="fv-grid">
      <article v-for="(vt, i) in DeviceType" :key="vt.key" class="fv-card" :class="{ bad: isBad(vt.key) }" :style="{ '--i': i }">
        <header>
          <span class="fv-t"><svg viewBox="0 0 24 24" v-html="icons[vt.key]"></svg>{{ vLabel(vt.key) }}</span>
          <span v-if="badge(vt.key)" class="fv-badge" :class="badge(vt.key).cls">
            <i></i>{{ badge(vt.key).label }}
          </span>
        </header>
        <div class="fv-val"><b>{{ props.episode.vitals[vt.key]?.value ?? '—' }}</b> <span>{{ vt.unit }}</span></div>
        <p class="fv-meta">{{ metaLine(vt.key) }}</p>
        <p v-if="isBad(vt.key)" class="fv-warn"><i class="pi pi-exclamation-triangle"></i>{{ warn(vt.key) }}</p>
        <button v-if="showManualBtn(vt.key)" class="ta-btn ta-btn--ghost ta-btn--sm fv-manual-btn" @click="startManual(vt.key)"><i class="pi pi-pencil"></i>{{ t('pf.manualEntry') }}</button>
        <div v-if="canManual(vt.key)" class="fv-manual">
          <template v-if="vt.key === 'pa'">
            <div class="fv-row">
              <input class="ta-input" v-model="draft.pa.a" :placeholder="vt.ph" inputmode="numeric" />
              <input class="ta-input" v-model="draft.pa.b" placeholder="Diastólica" inputmode="numeric" />
            </div>
            <small v-if="mErr.pa" class="ta-err">{{ mErr.pa }}</small>
          </template>
          <input v-else class="ta-input" v-model="draft[vt.key].a" :placeholder="vt.ph" inputmode="decimal" />
          <button class="ta-btn ta-btn--sm" @click="saveManual(vt)">{{ t('pf.save') }}</button>
        </div>
      </article>
    </div>

    <div class="fi-actions">
      <button class="ta-btn ta-btn--ghost" @click="onReject">{{ t('pf.reject') }}</button>
      <button class="ta-btn" @click="onConfirm">{{ t('pf.confirm') }}</button>
    </div>
  </section>
</template>

<style scoped>
.fd-top{display:flex;align-items:flex-start;justify-content:space-between;gap:14px}
.fd-top .ta-sub{margin-bottom:14px}
.fd-form{display:grid;grid-template-rows:0fr;transition:grid-template-rows .35s ease}
.fd-form.open{grid-template-rows:1fr}
.fd-form>div{overflow:hidden;min-height:0}
.fd-form__in{display:grid;grid-template-columns:190px 1fr auto auto;gap:10px;align-items:start;padding:4px 4px 16px}
.fd-form__pick{grid-column:1/-1;display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap}
.fd-form__pick .ta-label{width:100%;margin:0 0 6px}
.fd-form__pick .ta-select{flex:1;height:38px}
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
.fd-empty{margin:14px 0;padding:22px 16px;border:1.5px dashed var(--ta-line);border-radius:12px;background:linear-gradient(180deg,#f6faf7,#fafbfc);text-align:center;display:flex;flex-direction:column;align-items:center;gap:4px}
.fd-empty__ico{width:38px;height:38px;border-radius:50%;background:#e3f3ea;color:var(--ta-brand);display:grid;place-items:center;margin-bottom:6px}
.fd-empty__ico .pi{font-size:16px}
.fd-empty b{font-size:12.5px;font-weight:600;color:var(--ta-muted)}
.fd-empty small{font-size:11px;color:var(--ta-muted);opacity:.8;max-width:320px}

.fv-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px;margin-top:18px}
.fv-card{background:#fff;border:1px solid var(--ta-line);border-radius:12px;padding:14px;display:grid;gap:9px;align-content:start;transition:border-color .3s,background .3s}
.fv-card.bad{border-color:var(--ta-danger-line);background:var(--ta-danger-bg)}
.fv-card header{display:flex;justify-content:space-between;align-items:center;gap:8px}
.fv-t{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--ta-muted)}
.fv-t svg{width:14px;height:14px;flex:none;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
.fv-badge{display:inline-flex;align-items:center;align-self:flex-start;gap:6px;height:20px;line-height:1;font-size:10.5px;font-weight:500;padding:0 10px;border-radius:999px;background:#e3f3ea;color:var(--ta-brand);flex:none;white-space:nowrap}
.fv-badge i{width:6px;height:6px;border-radius:50%;background:currentColor}
.fv-badge.manual{background:#fdf3e3;color:#b9822a}
.fv-val{display:flex;align-items:baseline;gap:5px}
.fv-val b{font-size:24px;font-weight:600}
.fv-val span{font-size:11px;color:var(--ta-muted)}
.fv-meta{margin:0;font-family:var(--ta-mono);font-size:10px;color:var(--ta-muted)}
.fv-warn{margin:0;font-size:11px;color:var(--ta-danger);display:flex;gap:6px;align-items:flex-start}
.fv-manual{display:grid;gap:8px}
.fv-manual-btn{justify-self:start}
.fv-manual-btn .pi{font-size:11px}
.fv-row{display:flex;gap:8px}
.fi-actions{display:flex;justify-content:flex-end;align-items:center;gap:10px;flex-wrap:wrap;margin-top:22px;padding-top:16px;border-top:1px solid var(--ta-line)}

@media(max-width:760px){
  .fd-top{flex-direction:column;align-items:stretch}
  .fd-top .ta-btn{align-self:flex-start}
  .fd-form__in{grid-template-columns:1fr;padding-bottom:12px}
  .fd-form__pick{flex-direction:column;align-items:stretch}
  .fd-form__pick .ta-select{width:100%}
  .fd-list li{gap:8px;padding:10px 2px}
  .fd-info{min-width:120px}
}
</style>
