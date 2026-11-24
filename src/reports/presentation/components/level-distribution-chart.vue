<script setup>
/**
 * Distribution of the shift's patients across the five NT-158 levels. Horizontal
 * bars so the levels read in triage order (I on top) and the names fit. Pure SVG:
 * no chart library, consistent with the rest of the app.
 */
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { gsap } from 'gsap'
import { TRIAGE_LEVELS } from '../../../shared/domain/shared-kernel/triage-level.js'

const props = defineProps({
  /** [{ level: 'I' | 'II' | ... | null }] — one entry per patient in range. */
  log: { type: Array, default: () => [] }
})

const { t } = useI18n()
const root = ref(null)

const rows = computed(() => {
  const total = props.log.filter(x => x.level).length
  return TRIAGE_LEVELS.map(l => {
    const count = props.log.filter(x => x.level === l.code).length
    return { ...l, count, pct: total ? Math.round((count / total) * 100) : 0 }
  })
})

const unclassified = computed(() => props.log.filter(x => !x.level).length)
const max = computed(() => Math.max(1, ...rows.value.map(r => r.count)))

onMounted(() => {
  if (!root.value || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  gsap.fromTo(root.value.querySelectorAll('.tl-bar'), { scaleX: 0 }, { scaleX: 1, duration: .6, stagger: .06, ease: 'power3.out', transformOrigin: 'left center' })
})
</script>

<template>
  <section class="ta-card tl-card">
    <h3 class="ta-h">{{ t('reports.levelChart.title') }}</h3>
    <p class="ta-sub">{{ t('reports.levelChart.sub') }}</p>

    <div v-if="rows.some(r => r.count)" ref="root" class="tl-chart">
      <div v-for="r in rows" :key="r.code" class="tl-row">
        <span class="tl-code" :style="{ color: r.color }">{{ r.code }}</span>
        <span class="tl-name">{{ t(`triage.level.${r.code}.name`) }}</span>
        <div class="tl-track">
          <div class="tl-bar" :style="{ width: (r.count / max * 100) + '%', background: r.color }"></div>
        </div>
        <span class="tl-count">{{ r.count }}</span>
        <span class="tl-pct">{{ r.pct }}%</span>
      </div>
      <p v-if="unclassified" class="tl-unclassified">
        {{ t('reports.levelChart.unclassified', { n: unclassified }) }}
      </p>
    </div>
    <p v-else class="tl-empty">{{ t('reports.levelChart.empty') }}</p>
  </section>
</template>

<style scoped>
.tl-card{scroll-margin-top:20px}
.tl-chart{display:grid;gap:10px;margin-top:16px}
.tl-row{display:grid;grid-template-columns:26px 120px 1fr 28px 38px;align-items:center;gap:10px}
.tl-code{font-family:var(--ta-mono);font-weight:700;font-size:14px}
.tl-name{font-size:12.5px;color:var(--ta-text)}
.tl-track{height:12px;border-radius:4px;background:#eef4f0;overflow:hidden}
.tl-bar{height:100%;border-radius:4px}
.tl-count{font-family:var(--ta-mono);font-weight:600;font-size:13px;text-align:right;color:var(--ta-text)}
.tl-pct{font-family:var(--ta-mono);font-size:11px;text-align:right;color:var(--ta-muted)}
.tl-unclassified{margin:6px 0 0;font-size:11.5px;color:var(--ta-muted)}
.tl-empty{margin:14px 0 0;font-size:13px;color:var(--ta-muted)}
@media (max-width:760px){
  .tl-row{grid-template-columns:22px 1fr 24px 34px;grid-template-areas:"code name count pct" "code track track track";row-gap:4px}
  .tl-name{grid-area:name}.tl-track{grid-area:track}.tl-count{grid-area:count}.tl-pct{grid-area:pct}.tl-code{grid-area:code}
}
</style>
