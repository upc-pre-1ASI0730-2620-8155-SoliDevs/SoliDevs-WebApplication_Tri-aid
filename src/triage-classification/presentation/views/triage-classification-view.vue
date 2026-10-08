<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { findEpisode, ageOf, fmtTime } from '../../../patient-registration/application/patient-store.js'
import { DeviceType as vitalTypes } from '../../../vital-signs-capture/domain/model/device-type.js'
import { docLabel } from '../../../patient-registration/application/document-types.js'
import { notify } from '../../../shared/application/toast-store.js'
import { t, sexLabel } from '../../../shared/application/i18n.js'
import { session } from '../../../shared/application/demo-session.js'
import { AlertingService } from '../../../alerting/infrastructure/alerting.service.js'
import { pushAlerts } from '../../../alerting/application/alert-store.js'
import { findOutOfRangeVitals } from '../../../alerting/domain/services/vital-range-rules.js'
import PatientBanner from '../../../shared/presentation/components/patient-banner.vue'
import PriorityBadge from '../components/priority-badge.vue'
import TriageGuideModal from '../components/triage-guide-modal.vue'
import { TRIAGE_LEVELS, levelByKey, levelByCode } from '../../../shared/domain/shared-kernel/triage-level.js'
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

/** Signos vitales y motor NT-158 */
const vLabel = k => t('vital.' + k + '.label')
const vitalsRows = computed(() => vitalTypes.map(vt => ({
  key: vt.key,
  label: vLabel(vt.key),
  unit: vt.unit,
  value: ep.value.vitals[vt.key]?.value ?? '—'
})))

const outOfRange = computed(() => nt158Engine.outOfRange(ep.value.vitals))
const missing = computed(() => nt158Engine.missingMetrics(ep.value.vitals))
const hasAllVitals = computed(() => !missing.value.length)

/** Clasificacion */
const classification = ref(null)
const reasons = ref([])
const loading = ref(false)

const suggested = computed(() => levelByKey(classification.value?.suggestedLevel))
const current = computed(() => levelByKey(classification.value?.level))
const badgeLevel = computed(() => current.value ? {
  code: current.value.code,
  name: t('triage.level.' + current.value.code + '.name'),
  desc: t('triage.level.' + current.value.code + '.desc'),
  color: current.value.color
} : null)
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

/** Change level */
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

/** Guia NT-158 */
const showGuide = ref(false)

/** Confirm classification */
const cycleMinutes = episode => {
  const c = classification.value
  if (!c?.confirmedAt || !episode?.arrival) return null
  return Math.max(0, Math.round((new Date(c.confirmedAt) - new Date(episode.arrival)) / 60000))
}

async function confirmClassification() {
  const r = await service.confirmClassification(id, session.name || null)
  if (!r.ok) { notify({ type: 'error', title: t(r.error) }); return }
  classification.value = r.data
  syncEpisodeLevel()
  try {
    const alerting = new AlertingService()
    const generated = await alerting.generateForEpisode({
      episode: { id: ep.value.id, arrival: ep.value.arrival },
      patient: p.value,
      outOfRange: findOutOfRangeVitals(ep.value.vitals),
      levelCode: levelDisplay(current.value)?.code
    })
    pushAlerts(generated.data)
  } catch (e) { console.error(e) }
  const min = cycleMinutes(ep.value)
  notify({
    type: 'success',
    title: t('triage.toast.confirmed'),
    detail: min === null ? '' : t('triage.cycle', { min })
  })
  router.push(`/specialty-assignment/${ep.value.id}`)
}

/** Sincroniza el nivel con el episodio (ficha del paciente) */
const syncEpisodeLevel = () => {
  if (ep.value && classification.value) {
    const l = levelByKey(classification.value.level)
    ep.value.classifiedLevel = classification.value.level
    ep.value.classifiedLevelCode = l?.code || null
    ep.value.classifiedLevelColor = l?.color || null
  }
}

const tone = lvl => lvl ? `lv lv--${lvl.tone}` : 'lv'
const levelDisplay = lvl => lvl ? { code: lvl.code, name: t('triage.level.' + lvl.code + '.name'), desc: t('triage.level.' + lvl.code + '.desc'), color: lvl.color } : null
</script>

<template>
  <div class="ta-page" v-if="ep">
    <PatientBanner
        :initials="initials"
        :name="fullName"
        :meta="meta"
        :badge="ep.confirmed ? t('triage.vitalsConfirmed', { time: fmtTime(ep.vitalsConfirmedAt || ep.arrival) }) : t('pf.unclassified')"
    />

    <div class="tc-grid">
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

      <section class="ta-card tc-in tc-suggest" style="--d:2">
        <span class="tc-tag">{{ t('triage.suggested') }}</span>

        <template v-if="current">
          <PriorityBadge :level="levelDisplay(current)" />

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
            <router-link v-if="classification?.isConfirmed" class="ta-btn" :to="`/specialty-assignment/${ep.id}`">
              <i class="pi pi-arrow-right"></i>{{ t('triage.toReferral') }}
            </router-link>
          </div>
        </template>

        <p v-else class="ta-sub">{{ loading ? t('triage.calculating') : t('triage.noSuggestion') }}</p>
      </section>
    </div>

    <div class="tc-foot tc-in" style="--d:3">
      <button class="ta-btn ta-btn--ghost" @click="showGuide = true"><i class="pi pi-book"></i>{{ t('triage.guide') }}</button>
      <router-link class="ta-btn ta-btn--ghost" :to="`/patient-registration/${ep.id}`"><i class="pi pi-arrow-left"></i>{{ t('triage.backFile') }}</router-link>
    </div>

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

    <TriageGuideModal
        v-if="showGuide"
        :title="t('triage.guideTitle')"
        :sub="t('triage.guideSub')"
        :close-label="t('triage.close')"
        @close="showGuide = false"
    />
  </div>
</template>

<style scoped>
.tc-grid{display:grid;grid-template-columns:1.25fr 1fr;gap:18px;margin-top:16px}
.tc-vitals{display:grid;grid-template-columns:1fr 1fr;gap:14px 20px;margin:16px 0 0}
.tc-vitals dt{font-size:11px;color:var(--ta-muted)}
.tc-vitals dd{margin:2px 0 0;font-size:15px;font-weight:600}
.tc-vitals dd span{font-size:11px;font-weight:400;color:var(--ta-muted)}
.tc-warn{margin:16px 0 0;display:flex;gap:8px;align-items:flex-start;font-size:12.5px;color:var(--ta-danger);background:var(--ta-danger-bg);border:1px solid var(--ta-danger-line);border-radius:10px;padding:10px 12px}
.tc-ok{margin:16px 0 0;display:flex;gap:8px;align-items:center;font-size:12.5px;color:var(--ta-brand)}
.tc-suggest{display:flex;flex-direction:column;align-items:center;text-align:center;gap:8px;padding:20px}
.tc-tag{display:inline-flex;align-items:center;gap:6px;font-size:11px;color:var(--ta-brand);background:#e3f3ea;border-radius:999px;padding:4px 10px}
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
.tc-foot a{text-decoration:none}
.tc-actions a{text-decoration:none}
.tc-overlay{position:fixed;inset:0;background:rgba(8,20,14,.45);display:grid;place-items:center;z-index:40;padding:20px}
.tc-modal{width:min(520px,100%);display:grid;gap:10px}
.tc-modal__actions{display:flex;justify-content:flex-end;gap:10px;margin-top:6px}
.tc-levels{display:flex;gap:8px}
.tc-levels button{width:44px;height:44px;border-radius:50%;border:1px solid var(--ta-line);background:#fff;font:inherit;font-weight:600;cursor:pointer;transition:transform .15s,border-color .15s}
.tc-levels button.on{transform:translateY(-2px);border-color:var(--ta-brand)}
.tc-area{min-height:88px;resize:vertical;padding:10px}
@media(max-width:900px){.tc-grid{grid-template-columns:1fr}}
@media(max-width:760px){.tc-vitals{grid-template-columns:1fr 1fr;gap:10px}}
</style>
