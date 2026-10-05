<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { store, findEpisode, ageOf, fmtTime, fmtDateTime, saveEpisode } from '../../application/patient-store.js'
import { docLabel } from '../../application/document-types.js'
import { t, sexLabel } from '../../../shared/application/i18n.js'
import { levelByCode } from '../../../triage-classification/domain/model/triage-level.js'
import { TriageApi } from '../../../triage-classification/infrastructure/triage-api.js'
import { ClassificationAssembler } from '../../../triage-classification/infrastructure/classification.assembler.js'
import { SpecialtyAssignmentApi } from '../../../specialty-assignment/infrastructure/specialty-assignment-api.js'
import VitalsPanel from '../../../vital-signs-capture/presentation/components/vitals-panel.vue'

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

const dmy = s2 => s2.split('-').reverse().join('/')
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

/* ---------- Pestañas ---------- */
const tab = ref('vitals')
const tabsDef = computed(() => [
  { id: 'vitals', label: t('pf.tab.vitals') },
  { id: 'data', label: t('pf.tab.data') },
  { id: 'history', label: t('pf.tab.history') }
])

/* ---------- Estado del flujo: clasificacion + derivacion ---------- */
const classified = ref(null)
const classifiedConfirmed = ref(false)
const referred = ref(false)

async function loadFlowState() {
  if (!ep.value) return
  try {
    const rc = await new TriageApi().getClassificationByEpisode(ep.value.id)
    const c = ClassificationAssembler.toEntity((rc.data || [])[0] || null)
    if (c?.level) {
      const l = levelByCode(c.level.split('_')[0])
      classified.value = l ? { code: l.code, name: t('triage.level.' + l.code + '.name'), color: l.color } : null
      classifiedConfirmed.value = c.isConfirmed
    } else { classified.value = null; classifiedConfirmed.value = false }
    const rr = await new SpecialtyAssignmentApi().getReferralsByEpisode(ep.value.id)
    referred.value = (rr.data || []).length > 0
  } catch (e) { console.error(e) }
}

onMounted(() => loadFlowState())

/* ---------- Siguiente paso al confirmar lecturas ---------- */
function onVitalsConfirmed() {
  router.push(`/triage-classification/${id}`)
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
      <button v-for="tb in tabsDef" :key="tb.id" :class="{ on: tab === tb.id }" @click="tab = tb.id">{{ tb.label }}</button>
    </nav>

    <Transition name="fade" mode="out-in">
      <div v-if="tab === 'vitals'" key="v" class="fi-stack">
        <VitalsPanel :episode="ep" @confirmed="onVitalsConfirmed" />
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
.fi-pill.done{background:#e3f3ea;color:var(--ta-brand);border:1.5px solid}
.fi-dot{display:inline-block;width:7px;height:7px;border-radius:50%;margin-right:5px}
.fi-tabs{display:flex;gap:22px;padding:0 4px}
.fi-tabs button{position:relative;border:0;background:none;font:inherit;font-size:12.5px;color:var(--ta-muted);padding:10px 0;cursor:pointer;transition:color .2s}
.fi-tabs button::after{content:'';position:absolute;left:0;right:0;bottom:0;height:2px;background:var(--ta-brand);transform:scaleX(0);transform-origin:left;transition:transform .3s}
.fi-tabs button.on{color:var(--ta-brand);font-weight:500}
.fi-tabs button.on::after{transform:scaleX(1)}
.fi-tabs button:focus-visible{outline:2px solid var(--ta-accent);outline-offset:2px;border-radius:4px}
.fi-dl{margin:0;display:grid;grid-template-columns:1fr 1fr;gap:16px 20px}
.fi-dl div{display:grid;gap:4px}
.fi-dl dt{font-size:11px;color:var(--ta-muted)}
.fi-dl dd{margin:0;font-size:13px;font-weight:500}
.fi-visits{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.fi-visits li{display:flex;justify-content:space-between;gap:12px;padding:10px 12px;border:1px solid var(--ta-line);border-radius:10px;background:#fff;font-size:12px}
.fi-visits b{font-family:var(--ta-mono);font-weight:500}
.fi-visits span{color:var(--ta-muted)}
</style>
