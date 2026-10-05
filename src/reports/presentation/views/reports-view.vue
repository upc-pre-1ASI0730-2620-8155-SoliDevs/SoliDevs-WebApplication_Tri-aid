<script setup>
import { ref, computed, onMounted } from 'vue'
import { store, fmtTime } from '../../../patient-registration/application/patient-store.js'
import { TriageApi } from '../../../triage-classification/infrastructure/triage-api.js'
import { ClassificationAssembler } from '../../../triage-classification/infrastructure/classification.assembler.js'
import { levelByCode } from '../../../triage-classification/domain/model/triage-level.js'
import { AlertingService } from '../../../alerting/infrastructure/alerting.service.js'
import { SpecialtyAssignmentApi } from '../../../specialty-assignment/infrastructure/specialty-assignment-api.js'
import { t } from '../../../shared/application/i18n.js'

const triageApi = new TriageApi()
const specialtyApi = new SpecialtyAssignmentApi()
const alertingService = new AlertingService()

const fromDate = ref('')
const toDate = ref('')
const episodes = ref([])
const classifications = ref([])
const alerts = ref([])
const queues = ref([])

onMounted(async () => {
  try {
    const [rc, ra] = await Promise.all([triageApi.getClassifications(), alertingService.getAudit()])
    classifications.value = (rc.data || []).map(c => ({ ...c, levelInfo: levelByCode(c.level?.split('_')[0]) }))
    alerts.value = ra.data || []
  } catch (e) { console.error(e) }
  episodes.value = [...store.episodes]
  try {
    const rs = await specialtyApi.getSpecialties()
    queues.value = rs.data || []
  } catch (e) { console.error(e) }
})

const inRangeEpisodes = computed(() => episodes.value.filter(e => {
  const d = String(e.arrival).slice(0, 10)
  if (fromDate.value && d < fromDate.value) return false
  if (toDate.value && d > toDate.value) return false
  return true
}))

const careLog = computed(() => inRangeEpisodes.value.map(e => {
  const c = classifications.value.find(c => c.episodeId === e.id)
  const l = c ? levelByCode(c.level?.split('_')[0]) : null
  const arrival = new Date(e.arrival)
  const end = c?.confirmedAt ? new Date(c.confirmedAt) : null
  const cycle = end ? Math.max(0, Math.round((end - arrival) / 60000)) : null
  return {
    id: e.id,
    patient: `${e.patient?.surnames ?? ''}, ${e.patient?.names ?? ''}`,
    arrivalTime: fmtTime(e.arrival),
    date: String(e.arrival).slice(0, 10),
    level: l?.code || null,
    levelColor: l?.color || null,
    confirmed: !!c?.isConfirmed,
    cycle
  }
}).sort((a, b) => (a.date + a.arrivalTime).localeCompare(b.date + b.arrivalTime)))

const alertsInRange = computed(() => alerts.value.filter(a => {
  const d = String(a.createdAt).slice(0, 10)
  if (fromDate.value && d < fromDate.value) return false
  if (toDate.value && d > toDate.value) return false
  return true
}))

const metrics = computed(() => {
  const log = careLog.value
  const classified = log.filter(x => x.level)
  const cycles = classified.filter(x => x.cycle !== null).map(x => x.cycle)
  return {
    admissions: log.length,
    classified: classified.length,
    critical: classified.filter(x => x.level === 'I' || x.level === 'II').length,
    avgCycle: cycles.length ? Math.round(cycles.reduce((a, b) => a + b, 0) / cycles.length) : null,
    maxCycle: cycles.length ? Math.max(...cycles) : null,
    alerts: alertsInRange.value.length
  }
})
</script>

<template>
  <div class="ta-page">
    <section class="ta-card rp-head">
      <div>
        <h3 class="ta-h">{{ t('reports.title') }}</h3>
        <p class="ta-sub">{{ t('reports.sub') }}</p>
      </div>
      <div class="rp-dates">
        <input type="date" v-model="fromDate" class="ta-input rp-date" :aria-label="t('reports.from')" />
        <span class="rp-arrow">→</span>
        <input type="date" v-model="toDate" class="ta-input rp-date" :aria-label="t('reports.to')" />
      </div>
    </section>

    <section class="rp-stats">
      <div class="rp-stat"><b>{{ metrics.admissions }}</b><span>{{ t('reports.mAdmissions') }}</span></div>
      <div class="rp-stat"><b>{{ metrics.classified }}</b><span>{{ t('reports.mClassified') }}</span></div>
      <div class="rp-stat crit"><b>{{ metrics.critical }}</b><span>{{ t('reports.mCritical') }}</span></div>
      <div class="rp-stat"><b>{{ metrics.alerts }}</b><span>{{ t('reports.mAlerts') }}</span></div>
      <div class="rp-stat"><b>{{ metrics.avgCycle === null ? '—' : metrics.avgCycle + ' min' }}</b><span>{{ t('reports.mAvgCycle') }}</span></div>
      <div class="rp-stat"><b>{{ metrics.maxCycle === null ? '—' : metrics.maxCycle + ' min' }}</b><span>{{ t('reports.mMaxCycle') }}</span></div>
    </section>

    <section class="ta-card rp-card">
      <h3 class="ta-h">{{ t('reports.logTitle') }}</h3>
      <table class="rp-table">
        <thead>
          <tr>
            <th>{{ t('reports.thDate') }}</th>
            <th>{{ t('reports.thTime') }}</th>
            <th>{{ t('reports.thPatient') }}</th>
            <th>{{ t('reports.thEpisode') }}</th>
            <th>{{ t('reports.thPriority') }}</th>
            <th>{{ t('reports.thStatus') }}</th>
            <th>{{ t('reports.thCycle') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="e in careLog" :key="e.id">
            <td>{{ e.date }}</td>
            <td>{{ e.arrivalTime }}</td>
            <td class="rp-patient">{{ e.patient }}</td>
            <td class="rp-ep">{{ e.id }}</td>
            <td>
              <span v-if="e.level" class="rp-lv" :style="{ background: e.levelColor }">{{ e.level }}</span>
              <span v-else class="rp-nolv">{{ t('reports.noLevel') }}</span>
            </td>
            <td>
              <span class="rp-st" :class="{ ok: e.confirmed }">
                {{ e.confirmed ? t('reports.stConfirmed') : t('reports.stPending') }}
              </span>
            </td>
            <td>{{ e.cycle === null ? '—' : e.cycle + ' min' }}</td>
          </tr>
          <tr v-if="!careLog.length">
            <td colspan="7" class="rp-empty">{{ t('reports.empty') }}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="ta-card rp-card">
      <h3 class="ta-h">{{ t('reports.alertLog') }}</h3>
      <table class="rp-table">
        <thead>
          <tr>
            <th>{{ t('reports.thTime') }}</th>
            <th>{{ t('reports.thPatient') }}</th>
            <th>{{ t('reports.thVital') }}</th>
            <th>{{ t('reports.thValue') }}</th>
            <th>{{ t('reports.thSeverity') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(a, i) in alertsInRange" :key="i">
            <td class="rp-ep">{{ a.time }}</td>
            <td class="rp-patient">{{ a.patientName }}</td>
            <td>{{ a.vitalSign }}</td>
            <td>{{ a.value }}</td>
            <td><span class="rp-sev" :class="'sev--' + a.severity">{{ a.severity }}</span></td>
          </tr>
          <tr v-if="!alertsInRange.length">
            <td colspan="5" class="rp-empty">{{ t('reports.noAlerts') }}</td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>

<style scoped>
.rp-head{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:16px 20px;flex-wrap:wrap}
.rp-dates{display:flex;align-items:center;gap:8px}
.rp-date{height:34px;width:auto;font-size:12px}
.rp-arrow{color:var(--ta-muted)}
.rp-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin-bottom:16px}
.rp-stat{background:#fff;border:1px solid var(--ta-line);border-radius:12px;padding:14px;display:grid;gap:2px}
.rp-stat b{font-size:22px;font-weight:600}
.rp-stat.crit b{color:var(--ta-danger)}
.rp-stat span{font-size:11px;color:var(--ta-muted)}
.rp-card{padding:16px 20px;margin-bottom:16px;overflow-x:auto}
.rp-table{width:100%;border-collapse:collapse;font-size:12.5px;margin-top:10px}
.rp-table th{text-align:left;font-size:10.5px;text-transform:uppercase;letter-spacing:.06em;color:var(--ta-muted);padding:8px 10px;border-bottom:2px solid var(--ta-line)}
.rp-table td{padding:9px 10px;border-bottom:1px solid var(--ta-line)}
.rp-patient{font-weight:500}
.rp-ep{font-family:var(--ta-mono);font-size:10.5px;color:var(--ta-muted)}
.rp-lv{color:#fff;font-weight:700;font-size:10.5px;border-radius:999px;padding:3px 9px}
.rp-nolv{color:var(--ta-muted);font-size:11.5px}
.rp-st{font-size:11px;padding:3px 9px;border-radius:999px;background:#fff4e5;color:#b45309}
.rp-st.ok{background:#e3f3ea;color:var(--ta-brand)}
.rp-sev{font-size:10.5px;padding:2px 8px;border-radius:999px;background:#eef0f2;color:var(--ta-muted)}
.rp-sev.sev--critical{background:#fee4e2;color:#b42318}
.rp-sev.sev--warning{background:#fef3c7;color:#b45309}
.rp-sev.sev--escalated{background:#ede9fe;color:#6d28d9}
.rp-sev.sev--resolved{background:#e3f3ea;color:var(--ta-brand)}
.rp-empty{text-align:center;color:var(--ta-muted);padding:18px}
</style>
