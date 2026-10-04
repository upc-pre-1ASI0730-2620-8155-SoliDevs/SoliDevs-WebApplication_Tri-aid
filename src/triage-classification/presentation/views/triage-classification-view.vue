<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { store, findEpisode, ageOf, fmtTime, vitalTypes } from '../../../patient-registration/application/patient-store.js'
import { docLabel } from '../../../patient-registration/application/document-types.js'
import { notify } from '../../../shared/application/toast-store.js'
import { t, sexLabel } from '../../../shared/application/i18n.js'
import { session } from '../../../shared/application/demo-session.js'
import { TRIAGE_LEVELS, levelByKey, levelByCode } from '../../domain/model/triage-level.js'
import { ClassificationState } from '../../domain/model/classification.entity.js'
import { TriageClassificationService } from '../../infrastructure/triage-classification.service.js'
import { nt158Engine } from '../../domain/services/nt158-engine.js'

const route = useRoute()
const router = useRouter()
const service = new TriageClassificationService()

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

/* ---------- Signos vitales y motor NT-158 ---------- */
const vLabel = k => t('vital.' + k + '.label')
const vitalsRows = computed(() => vitalTypes.map(vt => ({
  key: vt.key,
  label: vLabel(vt.key),
  unit: vt.unit,
  value: ep.value.vitals[vt.key]?.value ?? '—',
  time: ep.value.vitals[vt.key]?.time ?? ''
})))

const outOfRange = computed(() => nt158Engine.outOfRange(ep.value.vitals))
const missing = computed(() => nt158Engine.missingMetrics(ep.value.vitals))
const hasAllVitals = computed(() => !missing.value.length)

/* ---------- Clasificación ---------- */
const classification = ref(null)
const reasons = ref([])
const loading = ref(false)

const suggested = computed(() => levelByKey(classification.value?.suggestedLevel))
const current = computed(() => levelByKey(classification.value?.level))
const state = computed(() => classification.value?.state ?? ClassificationState.PendingConfirmation)
const stateLabel = computed(() => t({
  PendingConfirmation: 'triage.state.pending',
  Assigned: 'triage.state.assigned',
  Overridden: 'triage.state.overridden',
  Confirmed: 'triage.state.confirmed'
}[state.value]))

onMounted(async () => {
  classification.value = await service.findByEpisode(id)
  if (!hasAllVitals.value) {
    notify({ type: 'error', title: t('triage.err.missingVitals', { list: missing.value.join(', ') }) })
    return
  }
  loading.value = true
  const r = await service.suggestPriority(ep.value, ep.value.vitals)
  loading.value = false
  if (r.ok) {
    classification.value = r.data
    reasons.value = r.reasons || []
  } else {
    notify({ type: 'error', title: t(r.error, { list: (r.missing || []).join(', ') }) })
  }
})

async function approve() {
  const r = await service.approveSuggestion(id, session.name || null)
  if (r.ok) { classification.value = r.data; syncEpisodeLevel(); notify({ type: 'success', title: t('triage.toast.approved') }) }
}

async function resetSuggestion() {
  const r = await service.resetToSuggestion(id, session.name || null)
  if (r.ok) { classification.value = r.data; syncEpisodeLevel(); notify({ type: 'info', title: t('triage.toast.reset') }) }
}

/* ---------- Modificar nivel (US21 + US22) ---------- */
const showModify = ref(false)
const modLevel = ref('')
const modReason = ref('')
const modErr = ref('')

function openModify() {
  modLevel.value = current.value?.code || suggested.value?.code || 'III'
  modReason.value = classification.value?.justification || ''
  modErr.value = ''
  showModify.value = true
}

async function saveModify() {
  const level = levelByCode(modLevel.value)
  if (!level) { modErr.value = t('triage.err.invalidLevel'); return }
  const r = await service.modifyLevel(id, { level: level.key, justification: modReason.value }, session.name || null)
  if (!r.ok) { modErr.value = t(r.error); return }
  classification.value = r.data
  syncEpisodeLevel()
  showModify.value = false
  notify({ type: 'info', title: t('triage.toast.overridden', { level: level.code }) })
}

/* ---------- Guía NT-158 (US23) ---------- */
const showGuide = ref(false)

/* ---------- Confirmar (US20 + US24) ---------- */
async function confirmClassification() {
  const r = await service.confirmClassification(id, session.name || null)
  if (!r.ok) { notify({ type: 'error', title: t(r.error) }); return }
  classification.value = r.data
  syncEpisodeLevel()
  const min = cycleMinutes(ep.value)
  notify({
    type: 'success',
    title: t('triage.toast.confirmed'),
    detail: min === null ? '' : t('triage.cycle', { min })
  })
  router.push(`/specialty-assignment/${ep.value.id}`)
}

const tone = lvl => lvl ? `lv lv--${lvl.tone}` : 'lv'
// Sincroniza el nivel con el episodio para que la ficha del paciente
// deje de mostrar "Sin clasificar" en cuanto hay una decision.
const syncEpisodeLevel = () => {
  if (ep.value && classification.value) {
    const l = levelByKey(classification.value.level)
    ep.value.classifiedLevel = classification.value.level
    ep.value.classifiedLevelCode = l?.code || null
    ep.value.classifiedLevelColor = l?.color || null
  }
}
// Tiempo de ciclo del triaje en minutos: llegada del episodio -> confirmacion (US24)
const cycleMinutes = episode => {
  const c = classification.value
  if (!c?.confirmedAt || !episode?.arrival) return null
  return Math.max(0, Math.round((new Date(c.confirmedAt) - new Date(episode.arrival)) / 60000))
}
</script>

<template>
  <div class="ta-page" v-if="ep">
    <!-- Banner del paciente -->
    <section class="ta-card tc-head tc-in" style="--d:0">
      <span class="tc-av">{{ initials }}</span>
      <div class="tc-id">
        <div class="fi-name">{{ fullName }}</div>
        <div class="fi-meta">{{ meta }}</div>
      </div>
      <span class="fi-pill" :class="{ done: ep.confirmed }">
        {{ ep.confirmed ? t('triage.vitalsConfirmed', { time: fmtTime(ep.vitalsConfirmedAt || ep.arrival) }) : t('pf.unclassified') }}
      </span>
    </section>

    <div class="tc-grid">
      <!-- Signos vitales confirmados -->
      <section class="ta-card tc-in" style="--d:1">
        <h3 class="ta-h">{{ t('triage.vitals.title') }}</h3>
        <p class="ta-sub">{{ t('triage.vitals.by', { who: session.name || t('triage.nurse'), time: fmtTime(ep.vitalsConfirmedAt || ep.arrival) }) }}</p>

        <dl class="tc-vitals">
          <div v-for="row in vitalsRows" :key="row.key">
            <dt>{{ row.label }}</dt>
            <dd><b>{{ row.value }}</b> <span>{{ row.unit }}</span></dd>
          </div>
        </dl>

        <p v-if="outOfRange.length" class="tc-warn">
          <i class="pi pi-exclamation-triangle"></i>
          <span>{{ t('triage.warning', { n: outOfRange.length }) }}
            {{ outOfRange.map(o => `${vLabel(o.metric === 'pas' ? 'pa' : o.metric)} ${o.value}${o.metric === 'spo2' ? ' %' : ''}`).join(' · ') }}</span>
        </p>
        <p v-else class="tc-ok"><i class="pi pi-check-circle"></i> {{ t('triage.allNormal') }}</p>
      </section>

      <!-- Sugerencia del sistema -->
      <section class="ta-card tc-in tc-suggest" style="--d:2">
        <span class="tc-tag"><i class="pi pi-sparkles"></i>{{ t('triage.suggested') }}</span>

        <template v-if="current">
          <div :class="tone(current)" class="tc-circle">{{ current.code }}</div>
          <div class="tc-lvname">{{ t('triage.level.' + current.code + '.name') }}</div>
          <p class="tc-lvdesc">{{ t('triage.level.' + current.code + '.desc') }}</p>

          <p v-if="reasons.length" class="tc-reasons">
            <b>{{ t('triage.reasons') }}</b>
            <span v-for="(r, i) in reasons" :key="i">{{ t('vital.' + (r.metric === 'pas' ? 'pa' : r.metric) + '.label') }}<template v-if="r.value !== null"> {{ r.value }}</template></span>
          </p>

          <span class="tc-state" :class="'st--' + state">{{ stateLabel }}</span>

          <p v-if="classification?.isOverridden && classification?.justification" class="tc-just">
            <b>{{ t('triage.justification') }}:</b> {{ classification.justification }}
          </p>

          <div class="tc-actions">
            <button v-if="!classification?.isConfirmed" class="ta-btn" @click="approve" :disabled="state === 'Assigned' || state === 'Confirmed'">
              <i class="pi pi-check"></i>{{ t('triage.approve') }}
            </button>
            <button v-if="!classification?.isConfirmed" class="ta-btn ta-btn--ghost" @click="openModify">
              <i class="pi pi-pencil"></i>{{ t('triage.modify') }}
            </button>
            <button v-if="classification?.isOverridden" class="tc-link" @click="resetSuggestion">
              <i class="pi pi-undo"></i>{{ t('triage.reset') }}
            </button>
            <button v-if="!classification?.isConfirmed" class="ta-btn ta-btn--ghost" @click="confirmClassification">
              <i class="pi pi-send"></i>{{ t('triage.confirm') }}
            </button>
            <span v-else class="tc-done"><i class="pi pi-check-circle"></i> {{ t('triage.confirmedAt', { time: fmtTime(classification.confirmedAt) }) }}
              <template v-if="cycleMinutes(ep) !== null"> · {{ t('triage.cycle', { min: cycleMinutes(ep) }) }}</template>
            </span>
          </div>
        </template>

        <p v-else class="ta-sub">{{ loading ? t('triage.calculating') : t('triage.noSuggestion') }}</p>
      </section>
    </div>

    <div class="tc-foot tc-in" style="--d:3">
      <button class="ta-btn ta-btn--ghost" @click="showGuide = true"><i class="pi pi-book"></i>{{ t('triage.guide') }}</button>
      <router-link class="ta-btn ta-btn--ghost" :to="`/patient-registration/${ep.id}`"><i class="pi pi-arrow-left"></i>{{ t('triage.backFile') }}</router-link>
    </div>

    <!-- Modal: modificar nivel -->
    <div v-if="showModify" class="tc-overlay" @click.self="showModify = false">
      <div class="ta-card tc-modal">
        <h3 class="ta-h">{{ t('triage.modifyTitle') }}</h3>
        <p class="ta-sub">{{ t('triage.modifySub') }}</p>

        <label class="ta-label">{{ t('triage.newLevel') }}</label>
        <div class="tc-levels">
          <button v-for="l in TRIAGE_LEVELS" :key="l.code" :class="[tone(l), { on: modLevel === l.code }]" @click="modLevel = l.code">
            {{ l.code }}
          </button>
        </div>

        <label class="ta-label" for="mod-reason">{{ t('triage.reason') }}</label>
        <textarea id="mod-reason" class="ta-input tc-area" v-model="modReason" :placeholder="t('triage.reasonPh')"></textarea>
        <p v-if="modErr" class="ta-err">{{ modErr }}</p>

        <div class="tc-modal__actions">
          <button class="ta-btn ta-btn--ghost" @click="showModify = false">{{ t('triage.cancel') }}</button>
          <button class="ta-btn" @click="saveModify"><i class="pi pi-save"></i>{{ t('triage.save') }}</button>
        </div>
      </div>
    </div>

    <!-- Modal: guía NT-158 (US23) -->
    <div v-if="showGuide" class="tc-overlay" @click.self="showGuide = false">
      <div class="ta-card tc-modal tc-guide">
        <h3 class="ta-h">{{ t('triage.guideTitle') }}</h3>
        <p class="ta-sub">{{ t('triage.guideSub') }}</p>
        <ul>
          <li v-for="l in TRIAGE_LEVELS" :key="l.code">
            <span :class="tone(l)" class="tc-gcode">{{ l.code }}</span>
            <div>
              <b>{{ t('triage.level.' + l.code + '.name') }}</b>
              <small>{{ t('triage.level.' + l.code + '.range') }}</small>
            </div>
          </li>
        </ul>
        <div class="tc-modal__actions">
          <button class="ta-btn" @click="showGuide = false">{{ t('triage.close') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tc-head{display:flex;align-items:center;gap:14px;padding:16px 20px}
.tc-av{width:42px;height:42px;border-radius:50%;background:#e3f3ea;color:var(--ta-brand);display:grid;place-items:center;font-weight:600;flex:none}
.tc-id{display:grid;gap:2px;flex:1;min-width:0}
.fi-name{font-size:14.5px;font-weight:600}
.fi-meta{font-family:var(--ta-mono);font-size:10.5px;color:var(--ta-muted)}
.fi-pill{font-size:11px;padding:3px 10px;border-radius:999px;background:#eef0f2;color:var(--ta-muted);white-space:nowrap}
.fi-pill.done{background:#e3f3ea;color:var(--ta-brand)}
.tc-grid{display:grid;grid-template-columns:1.25fr 1fr;gap:18px;margin-top:16px}
.tc-vitals{display:grid;grid-template-columns:1fr 1fr;gap:14px 20px;margin:16px 0 0}
.tc-vitals dt{font-size:11px;color:var(--ta-muted)}
.tc-vitals dd{margin:2px 0 0;font-size:15px;font-weight:600}
.tc-vitals dd span{font-size:11px;font-weight:400;color:var(--ta-muted)}
.tc-warn{margin:16px 0 0;display:flex;gap:8px;align-items:flex-start;font-size:12.5px;color:var(--ta-danger);background:var(--ta-danger-bg);border:1px solid var(--ta-danger-line);border-radius:10px;padding:10px 12px}
.tc-ok{margin:16px 0 0;display:flex;gap:8px;align-items:center;font-size:12.5px;color:var(--ta-brand)}
.tc-suggest{display:flex;flex-direction:column;align-items:center;text-align:center;gap:8px;padding:20px}
.tc-tag{display:inline-flex;align-items:center;gap:6px;font-size:11px;color:var(--ta-brand);background:#e3f3ea;border-radius:999px;padding:4px 10px}
.tc-circle{width:64px;height:64px;border-radius:50%;display:grid;place-items:center;font-size:24px;font-weight:700;color:#fff;background:var(--ta-muted)}
.tc-lvname{font-size:17px;font-weight:600}
.tc-lvdesc{margin:0;font-size:12.5px;color:var(--ta-muted);line-height:1.5;max-width:34ch}
.tc-reasons{display:grid;gap:3px;margin:6px 0 0;font-size:11.5px;color:var(--ta-muted)}
.tc-state{font-size:11px;padding:3px 10px;border-radius:999px;background:#eef0f2;color:var(--ta-muted)}
.st--PendingConfirmation{background:#fff4e5;color:#b45309}
.st--Assigned{background:#e3f3ea;color:var(--ta-brand)}
.st--Overridden{background:#eef2ff;color:#4338ca}
.st--Confirmed{background:#e3f3ea;color:var(--ta-brand-dk)}
.tc-just{margin:4px 0 0;font-size:11.5px;color:var(--ta-text);background:#f8fafc;border-radius:8px;padding:8px 10px;text-align:left}
.tc-actions{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin-top:10px}
.tc-link{border:0;background:none;font:inherit;font-size:12px;color:var(--ta-brand);cursor:pointer;display:inline-flex;align-items:center;gap:5px}
.tc-done{font-size:12px;color:var(--ta-brand);display:inline-flex;align-items:center;gap:6px}
.tc-foot{display:flex;justify-content:space-between;gap:12px;margin-top:16px}
.tc-overlay{position:fixed;inset:0;background:rgba(8,20,14,.45);display:grid;place-items:center;z-index:40;padding:20px}
.tc-modal{width:min(520px,100%);display:grid;gap:10px}
.tc-modal__actions{display:flex;justify-content:flex-end;gap:10px;margin-top:6px}
.tc-levels{display:flex;gap:8px}
.tc-levels button{width:44px;height:44px;border-radius:50%;border:1px solid var(--ta-line);background:#fff;font:inherit;font-weight:600;cursor:pointer;transition:transform .15s,border-color .15s}
.tc-levels button.on{transform:translateY(-2px);border-color:var(--ta-brand)}
.tc-area{min-height:88px;resize:vertical;padding:10px}
.tc-guide ul{list-style:none;margin:6px 0 0;padding:0;display:grid;gap:10px}
.tc-guide li{display:flex;gap:12px;align-items:flex-start}
.tc-gcode{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;color:#fff;font-weight:700;flex:none}
.tc-guide li small{display:block;color:var(--ta-muted);font-size:11.5px}
.lv--critical{background:#b42318}
.lv--emergency{background:#d97706}
.lv--urgent{background:#ca8a04}
.lv--less{background:#0f766e}
.lv--non{background:#2563eb}
@media(max-width:900px){.tc-grid{grid-template-columns:1fr}}
</style>
