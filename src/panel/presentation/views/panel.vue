<script setup>
import { ref, computed, onMounted } from 'vue'
import { store, fmtTime } from '../../../patient-registration/application/patient-store.js'
import { docLabel } from '../../../patient-registration/application/document-types.js'
import { t } from '../../../shared/application/i18n.js'
import { TriageApi } from '../../../triage-classification/infrastructure/triage-api.js'
import { ClassificationAssembler } from '../../../triage-classification/infrastructure/classification.assembler.js'
import { levelByCode } from '../../../shared/domain/shared-kernel/triage-level.js'
import { SpecialtyAssignmentApi } from '../../../specialty-assignment/infrastructure/specialty-assignment-api.js'

const triageApi = new TriageApi()
const specialtyApi = new SpecialtyAssignmentApi()

const classifications = ref([])
const queues = ref([])
// Episodes that have a referral record. The episode state alone is not enough:
// a referral may exist while the episode still reads Waiting.
const referredEpisodes = ref(new Set())

const ready = ref(false)

onMounted(async () => {
  // Episodes, classifications and referrals arrive together, so the rows never
  // show an intermediate state ("Por clasificar" → "Por derivar" → "Derivado").
  const loadClassifications = async () => {
    const rc = await triageApi.getClassifications()
    classifications.value = (rc.data || []).map(c => ({ ...c, levelInfo: levelByCode(c.level?.split('_')[0]) }))
  }
  const loadReferrals = async () => {
    // Waiting patients per specialty, counted from the live referrals. The API
    // returns the specialty by name, so match on name (not on the catalog key).
    const [rs, rr] = await Promise.all([specialtyApi.getSpecialties(), specialtyApi.getReferrals()])
    referredEpisodes.value = new Set((rr.data || []).map(r => String(r.episodeId)))
    const count = new Map()
    for (const r of (rr.data || [])) {
      if (String(r.state).toLowerCase() !== 'waiting') continue
      const name = (r.specialty || '').trim().toLowerCase()
      if (name) count.set(name, (count.get(name) || 0) + 1)
    }
    // Only specialties with someone waiting: an all-zero list is noise.
    queues.value = (rs.data || [])
      .map(s => ({ ...s, waiting: count.get(String(s.name).trim().toLowerCase()) || 0 }))
      .filter(q => q.waiting > 0)
      .sort((a, b) => b.waiting - a.waiting)
  }
  await Promise.all([loadClassifications(), loadReferrals()].map(p => p.catch(e => console.error(e))))
  ready.value = true
})

const episodes = computed(() => [...store.episodes].reverse())

const recent = computed(() => episodes.value.slice(0, 6).map(e => {
  // The API returns episodeId as a string; the episode id is a string in the store too,
  // but compare explicitly so a numeric id from another source still matches.
  const c = classifications.value.find(c => String(c.episodeId) === String(e.id))
  const l = c ? levelByCode(c.level?.split('_')[0]) : null
  // A classification counts as confirmed when its state is Confirmed, Modified
  // (nurse adjusted the level) or anything past PendingConfirmation.
  const state = String(c?.state || '')
  const confirmed = !!c && state !== 'PendingConfirmation' && state !== ''
  return {
    id: e.id,
    name: `${e.patient?.surnames ?? ''}, ${e.patient?.names ?? ''}`,
    time: fmtTime(e.arrival),
    level: l?.code || null,
    color: l?.color || null,
    confirmed,
    classificationConfirmed: confirmed,
    referred: !!e.referred || referredEpisodes.value.has(String(e.id))
  }
}))

const stats = computed(() => ([
  { key: 'admissions', value: episodes.value.length, icon: 'pi pi-users', label: t('panel.stat.admissions') },
  { key: 'pending', value: episodes.value.length - classifications.value.length, icon: 'pi pi-hourglass', label: t('panel.stat.pending') },
  { key: 'classified', value: classifications.value.length, icon: 'pi pi-check-square', label: t('panel.stat.classified') },
  { key: 'critical', value: classifications.value.filter(c => /^(I|II)_/.test(String(c.level || ''))).length, icon: 'pi pi-exclamation-circle', label: t('panel.stat.critical') }
]))

const specName = key => queues.value.find(q => q.key === key)?.name || key
</script>

<template>
  <div class="ta-page">
    <section class="pn-stats pn-in" style="--d:0">
      <div v-for="st in stats" :key="st.key" class="pn-stat">
        <i :class="st.icon"></i>
        <div><b>{{ st.value }}</b><span>{{ st.label }}</span></div>
      </div>
    </section>

    <section class="ta-card pn-card pn-in" style="--d:1">
      <h3 class="ta-h">{{ t('panel.recent') }}</h3>
      <p class="ta-sub">{{ t('panel.recentSub') }}</p>

      <p v-if="!recent.length" class="pn-empty">{{ t('pl.count.none') }}</p>
      <div v-else class="pn-scroll"><ul class="pn-list">
        <li v-for="e in recent" :key="e.id">
          <span class="pn-time">{{ e.time }}</span>
          <b>{{ e.name }}</b>
          <!-- Always occupy the level column so unclassified rows stay aligned. -->
          <span class="pn-lv" :class="{ 'pn-lv--empty': !e.level }" :style="e.level ? { background: e.color } : {}">{{ e.level || '·' }}</span>
          <span class="pn-id">{{ e.id }}</span>
          <span v-if="!ready" class="ta-skel" aria-hidden="true"></span>
          <template v-else>
            <span class="pn-status" :class="{ ok: e.referred }">
              {{ e.referred ? t('panel.referred') : (e.confirmed ? t('panel.toRefer') : t('panel.toClassify')) }}
            </span>
            <!-- The action follows the state: already referred opens the referral, else
                 classified goes to referral, else to classification. -->
            <router-link v-if="e.referred" class="ta-btn ta-btn--sm ta-btn--ghost" :to="`/specialty-assignment/${e.id}`">
              <i class="pi pi-qrcode"></i>{{ t('panel.btnViewReferral') }}
            </router-link>
            <router-link v-else-if="e.confirmed" class="ta-btn ta-btn--sm" :to="`/specialty-assignment/${e.id}`">
              <i class="pi pi-directions"></i>{{ t('panel.btnRefer') }}
            </router-link>
            <router-link v-else class="ta-btn ta-btn--sm ta-btn--ghost" :to="`/triage-classification/${e.id}`">
              <i class="pi pi-sort-amount-up"></i>{{ t('panel.btnClassify') }}
            </router-link>
          </template>
        </li>
      </ul></div>
    </section>

    <section class="ta-card pn-card pn-in" style="--d:2">
      <h3 class="ta-h">{{ t('referral.queuesTitle') }}</h3>
      <p class="ta-sub">{{ t('referral.queuesSub') }}</p>
      <div v-if="queues.length" class="rc-chips">
        <span v-for="q in queues" :key="q.key" class="rc-chip">{{ q.name }} <b>{{ q.waiting }}</b></span>
      </div>
      <p v-else class="pn-empty">{{ t('panel.queuesEmpty') }}</p>
    </section>
  </div>
</template>

<style scoped>
.pn-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px;margin-bottom:18px}
.pn-stat{background:#fff;border:1px solid var(--ta-line);border-radius:12px;padding:16px;display:flex;align-items:center;gap:12px}
.pn-stat i{width:38px;height:38px;border-radius:10px;background:#e3f3ea;color:var(--ta-brand);display:grid;place-items:center;font-size:16px}
.pn-stat div{display:grid}
.pn-stat b{font-size:22px;font-weight:600;line-height:1.1}
.pn-stat span{font-size:11.5px;color:var(--ta-muted)}
.pn-card{padding:18px 20px}
.pn-list{list-style:none;margin:12px 0 0;padding:0;display:grid;gap:8px}
.pn-list li{display:grid;grid-template-columns:40px minmax(0,1fr) 30px 110px 148px 114px;gap:12px;align-items:center;padding:10px 12px;border:1px solid var(--ta-line);border-radius:10px;background:#fff;font-size:12.5px}
.pn-time{font-family:var(--ta-mono);font-size:10.5px;color:var(--ta-muted)}
.pn-list b{min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pn-lv{color:#fff;font-weight:700;font-size:11px;line-height:1;padding:7px 0;border-radius:8px;justify-self:center;text-align:center;width:30px;box-sizing:border-box}
.pn-lv--empty{background:transparent;color:var(--ta-line);font-weight:600}
.pn-id{font-family:var(--ta-mono);font-size:10px;color:var(--ta-muted)}
.pn-status{font-size:10.5px;font-weight:500;line-height:1;padding:8px 0;border-radius:8px;background:#fff4e5;color:#b45309;justify-self:center;text-align:center;width:136px;box-sizing:border-box;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pn-status.ok{background:#e3f3ea;color:var(--ta-brand)}
.pn-list .ta-btn{justify-self:end;text-decoration:none;width:114px;box-sizing:border-box;justify-content:center;padding-left:6px;padding-right:6px}
.pn-empty{margin:14px 0 0;font-size:12.5px;color:var(--ta-muted);text-align:center}
/* Móvil: la fila conserva su grid y la lista se desliza en horizontal. */
.pn-scroll{overflow-x:auto;overscroll-behavior-x:contain;scrollbar-width:thin;scrollbar-color:var(--ta-brand) transparent;margin:12px 0 0 -4px;padding:0 4px 6px}
.pn-scroll::-webkit-scrollbar{height:6px}
.pn-scroll::-webkit-scrollbar-thumb{background:var(--ta-brand);border-radius:6px}
.pn-list{margin:0}
@media(max-width:760px){
  .pn-list li{grid-template-columns:40px minmax(160px,1fr) 30px 60px 136px 120px;min-width:620px}
  .pn-list b{white-space:nowrap}
}
.rc-chips{display:flex;flex-wrap:wrap;gap:10px;margin-top:12px}
.rc-chip{border:1px solid var(--ta-line);border-radius:999px;padding:6px 14px;font-size:12.5px;background:#fff;display:inline-flex;gap:8px}
.rc-chip b{color:var(--ta-brand)}
</style>
