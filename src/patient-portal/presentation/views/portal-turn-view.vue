<script setup>
/**
 * "My turn": live position in the queue of the referral specialty, restricted to
 * the patient's priority. The position is re-fetched every 45 s while the tab is
 * visible, so the number moves as the queue advances without websockets.
 */
import { computed, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { gsap } from 'gsap'
import { patientPortalStore } from '../../application/patient-portal-store.js'
import '../styles/portal.css'

const POLL_MS = 45000
const MAX_BARS = 9

const { t } = useI18n()
const store = patientPortalStore

const o = computed(() => store.overview)
const referral = computed(() => o.value?.referral)
const cls = computed(() => o.value?.classification)
const q = computed(() => store.queue)
const isEmergency = computed(() => o.value?.isEmergency ?? false)
const notReferred = computed(() => !referral.value)

let timer = null

const reduce = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Bars of the visual queue: patients before, you, patients after. */
const bars = computed(() => {
  if (!q.value) return []
  const before = Math.min(q.value.ahead, MAX_BARS - 1)
  const behind = Math.min(q.value.behind, MAX_BARS - 1 - before)
  return [
    ...Array.from({ length: before }, () => 'before'),
    'you',
    ...Array.from({ length: behind }, () => 'after')
  ]
})

function countUp(el, to) {
  const obj = { v: 0 }
  gsap.to(obj, { v: to, duration: 1, ease: 'power2.out', onUpdate: () => { el.textContent = Math.round(obj.v) } })
}

function animateIn() {
  if (reduce()) return
  const cards = document.querySelectorAll('.pp-cols > .pp-col > *')
  gsap.fromTo(cards, { opacity: 0, y: 18 }, { opacity: 1, y: 0, stagger: .07, duration: .45, ease: 'power3.out', clearProps: 'transform,opacity' })
  const qn = document.querySelector('.pp-hero__qn')
  if (qn && q.value) countUp(qn, q.value.ahead)
  const barEls = document.querySelectorAll('.pp-queue-bar i')
  if (barEls.length) {
    gsap.set(barEls, { scaleY: 0 })
    gsap.to(barEls, { scaleY: 1, duration: .35, stagger: .06, ease: 'power2.out', delay: .2 })
  }
}

async function refresh() {
  if (document.visibilityState !== 'visible') return
  const changed = await store.refreshQueue()
  if (changed && !reduce()) {
    const qn = document.querySelector('.pp-hero__qn')
    if (qn && q.value) countUp(qn, q.value.ahead)
  }
}

function startPolling() {
  stopPolling()
  timer = setInterval(refresh, POLL_MS)
  document.addEventListener('visibilitychange', refresh)
}
function stopPolling() {
  if (timer) clearInterval(timer)
  timer = null
  document.removeEventListener('visibilitychange', refresh)
}

onMounted(async () => {
  if (!store.isSignedIn) return
  if (!o.value) await store.loadOverview()
  animateIn()
  startPolling()
})
onBeforeUnmount(stopPolling)
</script>

<template>
  <div class="pp-view" v-if="o">
    <header class="pp-view__head">
      <span class="pp-view__eyebrow">{{ t('portal.nav.turn') }}</span>
      <h1 class="pp-view__title">{{ t('portal.turn.title') }}</h1>
      <p class="pp-view__sub">
        <template v-if="referral">{{ referral.specialty }} · <span class="mono">EP-{{ String(o.episode?.id ?? 0).padStart(4, '0') }}</span></template>
        <template v-else>{{ t('portal.turn.notReferred') }}</template>
      </p>
    </header>

    <!-- aún no derivado -->
    <div v-if="notReferred" class="pp-cols two">
      <div class="pp-col main">
        <div class="pp-empty">{{ t('portal.turn.waitReferral') }}</div>
      </div>
      <div class="pp-col">
        <section class="pp-card">
          <span class="pp-card__label">{{ t('portal.turn.whileYouWait') }}</span>
          <ul class="pp-tips">
            <li><i class="pi pi-check-circle"></i><span>{{ t('portal.turn.tip1') }}</span></li>
            <li><i class="pi pi-check-circle"></i><span>{{ t('portal.turn.tip2') }}</span></li>
          </ul>
        </section>
      </div>
    </div>

    <!-- emergencia -->
    <div v-else-if="isEmergency" class="pp-cols two">
      <div class="pp-col main">
        <section class="pp-hero pp-hero--urgent">
          <small>{{ t('portal.turn.aheadOfYou', { level: cls?.roman }) }}</small>
          <span class="pp-hero__qn">0</span>
          <p class="pp-hero__sub">{{ t('portal.turn.immediate') }}</p>
        </section>
      </div>
      <div class="pp-col">
        <div class="pp-warn" role="alert">
          <i class="pi pi-exclamation-triangle"></i>
          <span>{{ t('portal.turn.emergencyWarn') }}</span>
        </div>
        <section class="pp-card">
          <span class="pp-card__label">{{ t('portal.turn.whereNow') }}</span>
          <p style="margin:10px 0 0;font-size:13px;color:#3d4c44;line-height:1.55">{{ t('portal.turn.whereNowText') }}</p>
        </section>
      </div>
    </div>

    <!-- fila normal -->
    <div v-else class="pp-cols">
      <div class="pp-col main">
        <section class="pp-hero">
          <small>{{ t('portal.turn.aheadOfYou', { level: cls?.roman ?? '—' }) }}</small>
          <span class="pp-hero__qn">{{ q?.ahead ?? '—' }}</span>
          <p class="pp-hero__sub">{{ t('portal.turn.ofTotal', { total: q?.total ?? 0, specialty: referral?.specialty ?? '' }) }}</p>
          <span class="pp-hero__meta"><i class="pi pi-clock"></i>{{ t('portal.turn.estimated', { min: q?.estimatedWaitMinutes ?? 0 }) }}</span>
        </section>

        <section class="pp-card">
          <span class="pp-card__label">{{ t('portal.turn.queueBar') }}</span>
          <div class="pp-queue-bar" aria-hidden="true">
            <i v-for="(b, i) in bars" :key="i" :class="b === 'you' ? 'you' : b === 'before' ? 'before' : ''"></i>
          </div>
          <div class="pp-queue-legend">
            <span>{{ t('portal.turn.ahead', { n: q?.ahead ?? 0 }) }}</span>
            <span class="you">{{ t('portal.turn.you') }}</span>
            <span>{{ t('portal.turn.behind', { n: q?.behind ?? 0 }) }}</span>
          </div>
        </section>
      </div>

      <div class="pp-col">
        <section class="pp-card">
          <span class="pp-card__label">{{ t('portal.turn.whileYouWait') }}</span>
          <ul class="pp-tips">
            <li><i class="pi pi-check-circle"></i><span>{{ t('portal.turn.tip1') }}</span></li>
            <li><i class="pi pi-check-circle"></i><span>{{ t('portal.turn.tip2') }}</span></li>
            <li><i class="pi pi-check-circle"></i><span>{{ t('portal.turn.tip3') }}</span></li>
          </ul>
        </section>
        <section class="pp-card">
          <span class="pp-card__label">{{ t('portal.turn.whereToGo') }}</span>
          <div style="display:flex;align-items:center;gap:14px;margin-top:12px">
            <span class="pp-room-badge">{{ referral?.room }}</span>
            <span style="font-size:13px;color:var(--ta-muted)">{{ t('portal.turn.whereToGoText', { room: referral?.room }) }}</span>
          </div>
        </section>
      </div>

      <div class="pp-col">
        <section class="pp-card">
          <span class="pp-card__label">{{ t('portal.turn.meaning', { level: cls?.roman ?? '' }) }}</span>
          <p style="margin:10px 0 0;font-size:13px;color:#3d4c44;line-height:1.55">{{ t(`portal.level.${cls?.levelKey ?? 'pending'}.queueMeaning`) }}</p>
          <p class="pp-card__hint">{{ t('portal.turn.autoRefresh') }}</p>
        </section>
      </div>
    </div>
  </div>
</template>
