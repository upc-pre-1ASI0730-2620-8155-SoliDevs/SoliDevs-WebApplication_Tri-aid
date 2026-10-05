<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { TriageApi } from '../../../triage-classification/infrastructure/triage-api.js'
import { ClassificationAssembler } from '../../../triage-classification/infrastructure/classification.assembler.js'
import { levelByCode } from '../../../triage-classification/domain/model/triage-level.js'
import { SpecialtyAssignmentApi } from '../../../specialty-assignment/infrastructure/specialty-assignment-api.js'
import { useRoute, useRouter } from 'vue-router'
import { store, findEpisode, ageOf, fmtTime, fmtDateTime, vitalTypes, readFromDevice, setManual, clearVital, saveEpisode, linkDeviceToEpisode, unlinkDeviceFromEpisode, linkedDevices, setDeviceOnline } from '../../application/patient-store.js'
import { docLabel } from '../../application/document-types.js'
import { notify } from '../../../shared/application/toast-store.js'
import { nt158Engine } from '../../../triage-classification/domain/services/nt158-engine.js'
import { AlertingService } from '../../../alerting/infrastructure/alerting.service.js'
import { alertStore } from '../../../alerting/application/alert-store.js'
import { t, sexLabel } from '../../../shared/application/i18n.js'

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
  `${ageOf(p.value.birth)} ${t('yrs')}`,
  t('pf.arrival', { time: fmtTime(ep.value.arrival) }),
  ep.value.id
].join(' · '))
const dmy = s => s.split('-').reverse().join('/')
const rows = computed(() => [
  [t('pf.r.document'), docLabel(p.value)],
  [t('rg.birth'), dmy(p.value.birth)],
  [t('rg.names'), p.value.names],
  [t('rg.surnames'), p.value.surnames],
  [t('rg.sex'), sexLabel(p.value.sex)],
  [t('pf.r.phone'), p.value.phone],
  [t('pf.r.address'), p.value.address]
])
const visits = computed(() => store.episodes.filter(e => e.key === ep.value.key).slice().reverse())
// Classification and referral are fetched from the fake backend (they survive F5)
const classified = ref(null)
const classifiedConfirmed = ref(false)
const referred = ref(false)

onMounted(async () => {
  if (!ep.value) return
  try {
    const rc = await new TriageApi().getClassificationByEpisode(ep.value.id)
    const c = ClassificationAssembler.toEntity((rc.data || [])[0] || null)
    if (c?.level) {
      const l = levelByCode(c.level.split('_')[0])
      classified.value = l ? { code: l.code, name: t('triage.level.' + l.code + '.name'), color: l.color } : null
      classifiedConfirmed.value = c.isConfirmed
    }
  } catch (e) { console.error(e) }
  try {
    const rr = await new SpecialtyAssignmentApi().getReferralsByEpisode(ep.value.id)
    referred.value = (rr.data || []).length > 0
  } catch (e) { console.error(e) }
})

// El formulario de vinculacion se cierra al cambiar de pestaña
watch(tab, () => closeForm())

const tabs = computed(() => [
  { id: 'vitals', label: t('pf.tab.vitals') },
  { id: 'data', label: t('pf.tab.data') },
  { id: 'history', label: t('pf.tab.history') }
])
const tab = ref('vitals')

const icons = {
  pa: '<circle cx="12" cy="12" r="9"/><path d="M12 12l4-3"/>',
  spo2: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
  fc: '<path d="M3 12h4l2-6 4 12 2-6h6"/>',
  temp: '<path d="M10 14V5a2 2 0 0 1 4 0v9a4 4 0 1 1-4 0z"/>'
}
const devName = k => t('vital.' + k + '.device')
const vLabel = k => t('vital.' + k + '.label')

/* ---------- Dispositivos ---------- */
// Vinculacion desde el inventario de la vista Devices (US12):
// solo equipos libres; un instrumento apagado o sin senal falla (escenario 2).
const freeDevices = computed(() => store.devices.filter(d => !d.linkedEpisode))
const pickId = ref(null)
const pickedDevice = computed(() => freeDevices.value.find(d => String(d.id) === String(pickId.value)) || null)

function link(d) {
  if (!d) return
  if (d.linkedEpisode) return
  if (!d.online) {
    notify({ type: 'error', title: t('pf.linkFail') })
    return
  }
  const r = linkDeviceToEpisode(ep.value, d.id)
  if (r.ok) {
    pickId.value = null
    notify({ type: 'success', title: t('pf.linkedOk') })
  }
}
function closeForm() { showForm.value = false; dErr.value = false; dForm.model = '' }

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
const warn = k => state(k) === 'none' ? t('pf.warn.none') : t('pf.warn.lost', { device: devName(k).toLowerCase() })
function metaLine(k) {
  const v = ep.value.vitals[k]
  if (v) return v.source === 'manual' ? t('pf.meta.manual', { time: v.time }) : `${devName(k)}${v.model ? ' ' + v.model : ''} · ${v.time}`
  const d = dev(k)
  return d ? t('pf.waiting', { device: devName(k).toLowerCase(), model: d.model }) : ''
}
const canManual = k => !ep.value.confirmed && !editing[k] && ['none', 'lost', 'waiting'].includes(state(k))

const editing = reactive({ pa: false, spo2: false, fc: false, temp: false })
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
  setManual(ep.value, k, value)
  mErr[k] = ''; editing[k] = false; draft[k].a = ''
  if (k === 'pa') draft.pa.b = ''
}

/* ---------- Confirmar / rechazar ---------- */
function say(m, bad = false) { notify({ type: bad ? 'error' : 'info', title: m }) }
async function confirmReadings() {
  const missing = vitalTypes.filter(x => !ep.value.vitals[x.key]).map(x => vLabel(x.key))
  if (missing.length) { say(t('pf.missing', { list: missing.join(', ') }), true); return }
  ep.value.confirmed = true
  ep.value.vitalsConfirmedAt = new Date().toISOString()
  saveEpisode(ep.value)
  // Los valores fuera del rango habitual generan alertas reales del episodio.
  const alerting = new AlertingService()
  const generated = await alerting.generateForEpisode({
    episode: { id: ep.value.id, arrival: ep.value.arrival },
    patient: p.value,
    outOfRange: nt158Engine.outOfRange(ep.value.vitals)
  })
  for (const a of generated.data) alertStore.items.push({ ...a, read: false })
  notify({
    type: generated.data.length ? 'success' : 'success',
    title: t('pf.confirmed'),
    detail: generated.data.length
      ? t('alerting.generatedCount', { n: generated.data.length })
      : t('pf.confirmedDetail')
  })
  // Once vital signs are confirmed the episode moves to priority classification.
  router.push(`/triage-classification/${ep.value.id}`)
}
function rejectReadings() {
  ep.value.vitals = {}
  ep.value.confirmed = false
  Object.keys(editing).forEach(k => (editing[k] = false))
  say(t('pf.rejected'))
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
      <span class="fi-pill" :class="{ done: classified }">
        <template v-if="classified">
          <i class="fi-dot" :style="{ background: classified.color }"></i>
          {{ classified.code }} · {{ classified.name }}
        </template>
        <template v-else>{{ t('pf.unclassified') }}</template>
      </span>
    </section>

    <nav class="fi-tabs fi-in" style="--d:1">
      <button v-for="tb in tabs" :key="tb.id" :class="{ on: tab === tb.id }" @click="tab = tb.id">{{ tb.label }}</button>
    </nav>

    <Transition name="fade" mode="out-in">
      <div v-if="tab === 'vitals'" key="v" class="fi-stack">
        <section class="ta-card fi-in" style="--d:2">
          <div class="fd-top">
            <div>
              <h3 class="ta-h">{{ t('pf.devices') }}</h3>
              <p class="ta-sub">{{ t('pf.devices.sub') }}</p>
            </div>
            <button class="ta-btn ta-btn--ghost" @click="showForm ? closeForm() : (showForm = true)"><i class="pi pi-sync"></i>{{ t('pf.link') }}</button>
          </div>

          <TransitionGroup name="list" tag="ul" class="fd-list">
            <li v-for="d in (ep ? linkedDevices(ep.id) : [])" :key="d.id">
              <span class="fd-ico"><svg viewBox="0 0 24 24" v-html="icons[d.type]"></svg></span>
              <div class="fd-info"><b>{{ devName(d.type) }} · {{ d.model }}</b><small>{{ d.lastUse ? t('pf.lastUse', { time: d.lastUse }) : t('pf.noReads') }}</small></div>
              <button class="fd-badge" :class="d.online ? 'on' : 'off'" :title="t('pf.toggleTitle')" @click="d.online = !d.online; setDeviceOnline(d.id, d.online)"><i></i>{{ d.online ? t('pf.connected') : t('pf.disconnected') }}</button>
              <button class="ta-btn ta-btn--ghost ta-btn--sm" :disabled="!d.online || ep.confirmed" @click="readFromDevice(ep, d)">{{ t('pf.simulate') }}</button>
              <button class="ta-btn ta-btn--ghost ta-btn--sm" :disabled="ep.confirmed" @click="unlinkDeviceFromEpisode(ep, d.id); notify({ type: 'info', title: t('devices.toastUnlinked') })">{{ t('pf.unlink') }}</button>
            </li>
          </TransitionGroup>
          <p v-if="ep && !linkedDevices(ep.id).length" class="fd-empty">{{ t('pf.noDevices') }}</p>

          <div class="fd-form" :class="{ open: showForm }">
            <div>
              <div class="fd-form__in">
                <select class="ta-select" v-model="pickId" :aria-label="t('pf.pickDevice')">
                  <option :value="null" disabled>{{ t('pf.chooseDevice') }}</option>
                  <option v-for="d in freeDevices" :key="d.id" :value="d.id">
                    {{ devName(d.type) }} · {{ d.model }}
                  </option>
                </select>
                <button class="ta-btn" @click="link">{{ t('pf.linkBtn') }}</button>
                <button class="ta-btn ta-btn--ghost" @click="closeForm">{{ t('pf.cancel') }}</button>
                <small v-if="linkErr" class="ta-err fd-err">{{ linkErr }}</small>
              </div>
            </div>
          </div>
          <p v-if="showForm && !freeDevices.length" class="fd-empty">{{ t('pf.noFreeDevices') }}</p>
        </section>

        <div class="fv-grid">
          <article v-for="(vt, i) in vitalTypes" :key="vt.key" class="fv-card" :class="{ bad: isBad(vt.key) }" :style="{ '--i': i }">
            <header>
              <span class="fv-t"><svg viewBox="0 0 24 24" v-html="icons[vt.key]"></svg>{{ vLabel(vt.key) }}</span>
              <span v-if="state(vt.key) === 'auto' || state(vt.key) === 'manual'" class="fv-badge" :class="state(vt.key)"><i></i>{{ state(vt.key) === 'manual' ? t('pf.manual') : t('pf.auto') }}</span>
            </header>
            <Transition name="flip" mode="out-in">
              <div class="fv-val" :key="shown(vt.key)"><b>{{ shown(vt.key) }}</b><span>{{ vt.unit }}</span></div>
            </Transition>
            <p v-if="metaLine(vt.key)" class="fv-meta">{{ metaLine(vt.key) }}</p>
            <p v-if="isBad(vt.key)" class="fv-warn"><i class="pi pi-exclamation-triangle"></i>{{ warn(vt.key) }}</p>

            <Transition name="fade">
              <div v-if="editing[vt.key]" class="fv-manual">
                <input class="ta-input" v-model="draft[vt.key].a" inputmode="decimal" :placeholder="vt.key === 'pa' ? t('pf.systolic') : vt.ph" :aria-label="vLabel(vt.key)" @keyup.enter="saveManual(vt)" />
                <input v-if="vt.key === 'pa'" class="ta-input" v-model="draft.pa.b" inputmode="numeric" :placeholder="t('pf.diastolic')" :aria-label="t('pf.diastolic')" @keyup.enter="saveManual(vt)" />
                <div class="fv-row">
                  <button class="ta-btn ta-btn--sm" @click="saveManual(vt)">{{ t('pf.save') }}</button>
                  <button class="ta-btn ta-btn--ghost ta-btn--sm" @click="editing[vt.key] = false">{{ t('pf.cancel') }}</button>
                </div>
                <small v-if="mErr[vt.key]" class="ta-err">{{ mErr[vt.key] }}</small>
              </div>
            </Transition>

            <button v-if="canManual(vt.key)" class="ta-btn ta-btn--ghost ta-btn--sm" @click="editing[vt.key] = true">{{ t('pf.enterManual') }}</button>
            <button v-if="state(vt.key) === 'manual' && !ep.confirmed" class="ta-btn ta-btn--ghost ta-btn--sm" @click="clearVital(ep, vt.key)">{{ t('pf.removeManual') }}</button>
          </article>
        </div>

        <div v-if="!ep.confirmed" class="fi-actions">
          <button class="ta-btn ta-btn--ghost" @click="rejectReadings">{{ t('pf.reject') }}</button>
          <button class="ta-btn" @click="confirmReadings">{{ t('pf.confirm') }}</button>
        </div>
        <div v-else class="fi-sealed">
          <div class="fi-steps">
            <span class="step done"><i class="pi pi-check-circle"></i>{{ t('pf.step.vitals') }}</span>
            <span class="step-line"></span>
            <span class="step" :class="classifiedConfirmed ? 'done' : 'todo'">
              <i :class="classifiedConfirmed ? 'pi pi-check-circle' : 'pi pi-clock'"></i>{{ t('pf.step.priority') }}
              <b v-if="classifiedCode"> · {{ classifiedCode }}</b>
            </span>
            <span class="step-line"></span>
            <span class="step" :class="referred ? 'done' : 'todo'">
              <i :class="referred ? 'pi pi-check-circle' : 'pi pi-clock'"></i>{{ t('pf.step.referral') }}
            </span>
          </div>
          <div class="fi-next">
            <router-link v-if="referred" class="ta-btn fi-cta" :to="`/specialty-assignment/${ep.id}`">
              <i class="pi pi-qrcode"></i>{{ t('pf.viewReferral') }}
            </router-link>
            <router-link v-else-if="classifiedConfirmed" class="ta-btn fi-cta" :to="`/specialty-assignment/${ep.id}`">
              <i class="pi pi-arrow-right"></i>{{ t('pf.ctaReferral') }}
            </router-link>
            <router-link v-else-if="classified" class="ta-btn fi-cta" :to="`/triage-classification/${ep.id}`">
              <i class="pi pi-check-square"></i>{{ t('pf.finishClass') }}
            </router-link>
            <router-link v-else class="ta-btn fi-cta" :to="`/triage-classification/${ep.id}`">
              <i class="pi pi-sort-amount-up"></i>{{ t('panel.btnClassify') }}
            </router-link>
          </div>
        </div>
      </div>

      <section v-else-if="tab === 'data'" key="d" class="ta-card">
        <h3 class="ta-h">{{ t('pf.tab.data') }}</h3>
        <p class="ta-sub">{{ t('pf.data.sub') }}</p>
        <dl class="fi-dl">
          <div v-for="r in rows" :key="r[0]"><dt>{{ r[0] }}</dt><dd>{{ r[1] }}</dd></div>
        </dl>
      </section>

      <section v-else key="h" class="ta-card">
        <h3 class="ta-h">{{ t('pf.tab.history') }}</h3>
        <p class="ta-sub">{{ t('pf.hist.sub') }}</p>
        <ul class="fi-visits">
          <li v-for="v in visits" :key="v.id"><b>{{ v.id }}</b><span>{{ t('pf.hist.arrival', { dt: fmtDateTime(v.arrival) }) }}</span></li>
        </ul>
      </section>
    </Transition>
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
.fd-pick{display:flex;gap:10px;align-items:center;margin-top:14px}
.fd-pick .ta-select{width:auto;min-width:280px;height:38px}
.fd-pick .ta-btn{white-space:nowrap;height:38px}

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
.fi-sealed{display:grid;gap:12px;font-size:12px;color:var(--ta-muted)}
.fi-steps{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.fi-steps .step{display:inline-flex;align-items:center;gap:5px;font-size:11.5px;padding:4px 11px;border-radius:999px;background:#eef0f2;color:var(--ta-muted)}
.fi-steps .step i{font-size:11px}
.fi-steps .step.done{background:#e3f3ea;color:var(--ta-brand)}
.fi-steps .step.todo{background:#fff4e5;color:#b45309;font-weight:500}
.fi-steps .step-line{width:22px;height:2px;background:var(--ta-line)}
.fi-next{display:flex;align-items:center;gap:14px;flex-wrap:wrap}
.fi-next a{text-decoration:none}
.fi-next .ta-btn i{color:#fff}
.fi-next .fi-cta i{margin-right:6px}
.fi-ghost{font-size:12px}
.fi-sealed i{color:var(--ta-brand)}
.fi-dot{display:inline-block;width:7px;height:7px;border-radius:50%;margin-right:5px}
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