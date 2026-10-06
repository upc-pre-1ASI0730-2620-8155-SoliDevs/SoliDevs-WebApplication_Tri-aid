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

onMounted(async () => {
  try {
    const rc = await triageApi.getClassifications()
    classifications.value = (rc.data || []).map(c => ({ ...c, levelInfo: levelByCode(c.level?.split('_')[0]) }))
  } catch (e) { console.error(e) }
  try {
    const rs = await specialtyApi.getSpecialties()
    queues.value = (rs.data || []).map(s => ({ ...s, live: 0 }))
    const rr = await specialtyApi.getReferrals()
    for (const r of (rr.data || [])) {
      if (r.state === 'Attended') continue
      const q = queues.value.find(q => q.key === r.specialty)
      if (q) q.live++
    }
    queues.value = queues.value.map(q => ({ ...q, waiting: (q.waiting || 0) + q.live }))
  } catch (e) { console.error(e) }
})

const episodes = computed(() => [...store.episodes].reverse())

const recent = computed(() => episodes.value.slice(0, 6).map(e => {
  const c = classifications.value.find(c => c.episodeId === e.id)
  const l = c ? levelByCode(c.level?.split('_')[0]) : null
  return {
    id: e.id,
    name: `${e.patient?.surnames ?? ''}, ${e.patient?.names ?? ''}`,
    time: fmtTime(e.arrival),
    level: l?.code || null,
    color: l?.color || null,
    confirmed: c?.isConfirmed || false,
    classificationConfirmed: !!c?.isConfirmed,
    referred: !!e.referred
  }
}))

const stats = computed(() => ([
  { key: 'admissions', value: episodes.value.length, icon: 'pi pi-users', label: t('panel.stat.admissions') },
  { key: 'pending', value: episodes.value.length - classifications.value.length, icon: 'pi pi-hourglass', label: t('panel.stat.pending') },
  { key: 'classified', value: classifications.value.length, icon: 'pi pi-check-square', label: t('panel.stat.classified') },
  { key: 'critical', value: classifications.value.filter(c => c.level?.startsWith('I') || c.level?.startsWith('II')).length, icon: 'pi pi-exclamation-circle', label: t('panel.stat.critical') }
]))

const specName = key => t('referral.spec.' + key)
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
      <ul v-else class="pn-list">
        <li v-for="e in recent" :key="e.id">
          <span class="pn-time">{{ e.time }}</span>
          <b>{{ e.name }}</b>
          <span v-if="e.level" class="pn-lv" :style="{ background: e.color }">{{ e.level }}</span>
          <span class="pn-id">{{ e.id }}</span>
          <span class="pn-status" :class="{ ok: e.referred }">
            {{ e.referred ? t('panel.referred') : (e.confirmed ? t('panel.toRefer') : t('panel.toClassify')) }}
          </span>
          <router-link v-if="e.classificationConfirmed" class="ta-btn ta-btn--sm" :to="`/specialty-assignment/${e.id}`">
            <i class="pi pi-directions"></i>{{ t('panel.btnRefer') }}
          </router-link>
          <router-link v-else class="ta-btn ta-btn--sm ta-btn--ghost" :to="`/triage-classification/${e.id}`">
            <i class="pi pi-sort-amount-up"></i>{{ t('panel.btnClassify') }}
          </router-link>
        </li>
      </ul>
    </section>

    <section class="ta-card pn-card pn-in" style="--d:2">
      <h3 class="ta-h">{{ t('referral.queuesTitle') }}</h3>
      <p class="ta-sub">{{ t('referral.queuesSub') }}</p>
      <div class="rc-chips">
        <span v-for="q in queues" :key="q.key" class="rc-chip">{{ specName(q.key) }} <b>{{ q.waiting }}</b></span>
      </div>
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
.pn-lv{color:#fff;font-weight:700;font-size:11px;border-radius:999px;padding:2px 0;justify-self:center;text-align:center;width:28px;box-sizing:border-box}
.pn-id{font-family:var(--ta-mono);font-size:10px;color:var(--ta-muted)}
.pn-status{font-size:10.5px;padding:3px 0;border-radius:999px;background:#fff4e5;color:#b45309;justify-self:center;text-align:center;width:136px;box-sizing:border-box;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pn-status.ok{background:#e3f3ea;color:var(--ta-brand)}
.pn-list .ta-btn{justify-self:end;width:114px;box-sizing:border-box;justify-content:center;padding-left:6px;padding-right:6px}
.pn-empty{margin:14px 0 0;font-size:12.5px;color:var(--ta-muted);text-align:center}
@media(max-width:760px){.pn-list li{grid-template-columns:44px minmax(0,1fr) 32px 122px;grid-auto-rows:auto;row-gap:6px}.pn-status,.pn-list .ta-btn{grid-column:span 2;justify-self:start;width:auto;max-width:100%}}
.rc-chips{display:flex;flex-wrap:wrap;gap:10px;margin-top:12px}
.rc-chip{border:1px solid var(--ta-line);border-radius:999px;padding:6px 14px;font-size:12.5px;background:#fff;display:inline-flex;gap:8px}
.rc-chip b{color:var(--ta-brand)}
</style>
