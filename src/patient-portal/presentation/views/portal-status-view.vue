<script setup>
/**
 * "My status": current state, urgency level with explanation, the care timeline,
 * vital signs (read only) and personal data. Everything comes from the overview
 * resolved server-side for the signed-in patient.
 */
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { gsap } from 'gsap'
import { patientPortalStore } from '../../application/patient-portal-store.js'
import '../styles/portal.css'

const { t, locale } = useI18n()
const store = patientPortalStore

const o = computed(() => store.overview)
const patient = computed(() => o.value?.patient)
const episode = computed(() => o.value?.episode)
const cls = computed(() => o.value?.classification)
const referral = computed(() => o.value?.referral)

const fmtTime = iso => iso ? new Date(iso).toLocaleTimeString(locale.value === 'en' ? 'en-US' : 'es-PE', { hour: '2-digit', minute: '2-digit' }) : '—'
const fmtDate = iso => iso ? new Date(iso).toLocaleDateString(locale.value === 'en' ? 'en-US' : 'es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'


/** Steps of the care timeline derived from the overview. */
const timeline = computed(() => {
  const steps = []
  if (!episode.value) return steps
  steps.push({ key: 'arrival', done: true, now: false, time: fmtTime(episode.value.arrivalTime) })
  const hasVitals = !!episode.value && cls.value !== null
  steps.push({ key: 'vitals', done: hasVitals, now: !hasVitals && episode.value.state !== 'Waiting', time: '' })
  steps.push({ key: 'priority', done: !!cls.value, now: !!cls.value && !referral.value, time: cls.value?.confirmedAt ? fmtTime(cls.value.confirmedAt) : '' })
  const attended = o.value?.isAttended ?? false
  steps.push({ key: 'waiting', done: attended || !!referral.value, now: !!referral.value && referral.value.isWaiting, time: '' })
  steps.push({ key: 'care', done: attended, now: false, time: '' })
  return steps
})

const vitals = computed(() => o.value?.vitals)

const reduce = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

onMounted(async () => {
  if (!store.isSignedIn) return
  await store.loadOverview()
  if (reduce()) return
  const cards = document.querySelectorAll('.pp-cols > .pp-col > *')
  gsap.fromTo(cards, { opacity: 0, y: 18 }, { opacity: 1, y: 0, stagger: .07, duration: .45, ease: 'power3.out', clearProps: 'transform,opacity' })
  const steps = document.querySelectorAll('.pp-tl-step')
  if (steps.length) gsap.fromTo(steps, { opacity: 0, x: -10 }, { opacity: 1, x: 0, stagger: .12, duration: .4, ease: 'power3.out', delay: .25, clearProps: 'transform,opacity' })
})
</script>

<template>
  <div class="pp-view" v-if="o">
    <header class="pp-view__head">
      <span class="pp-view__eyebrow">{{ t('portal.nav.status') }}</span>
      <h1 class="pp-view__title">{{ t('portal.status.hello', { name: patient?.firstName }) }}</h1>
      <p class="pp-view__sub">
        {{ t('portal.status.emergencies') }} · <span class="mono">EP-{{ String(episode?.id ?? 0).padStart(4, '0') }}</span>
        <template v-if="episode"> · {{ t('portal.status.arrived') }} {{ fmtTime(episode.arrivalTime) }}</template>
      </p>
    </header>

    <div class="pp-cols">
      <!-- ── principal ── -->
      <div class="pp-col main">
        <section class="pp-hero">
          <small>{{ t('portal.status.careState') }}</small>
          <template v-if="o.isAttended">
            <div class="pp-hero__title">{{ t('portal.status.attendedTitle') }}</div>
            <p class="pp-hero__sub">{{ t('portal.status.attendedSub', { specialty: referral?.specialty ?? '' }) }}</p>
          </template>
          <template v-else-if="referral">
            <div class="pp-hero__title">{{ t('portal.status.referredTo', { specialty: referral.specialty }) }}</div>
            <p class="pp-hero__sub">{{ t('portal.status.referredSub') }}</p>
            <div class="pp-hero__room"><span class="l">{{ t('portal.status.room') }}</span><span class="n">{{ referral.room }}</span></div>
          </template>
          <template v-else-if="cls">
            <div class="pp-hero__title">{{ t('portal.status.classifiedTitle') }}</div>
            <p class="pp-hero__sub">{{ t('portal.status.classifiedSub') }}</p>
          </template>
          <template v-else>
            <div class="pp-hero__title">{{ t('portal.status.waitingTitle') }}</div>
            <p class="pp-hero__sub">{{ t('portal.status.waitingSub') }}</p>
          </template>
          <svg class="pp-hero__ecg" viewBox="0 0 160 40" aria-hidden="true"><path d="M0 22h28l6-14 8 26 7-18 5 6h30l5-10 7 16 6-8h48" fill="none" stroke="#34d27b" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </section>

        <section v-if="cls" class="pp-card">
          <span class="pp-card__label">{{ t('portal.status.priority') }}</span>
          <div class="pp-prio-row">
            <span class="pp-prio" :data-level="cls.level">{{ cls.roman }}</span>
            <span class="pp-prio-name">{{ t(`portal.level.${cls.levelKey}.name`) }}</span>
          </div>
          <p style="margin:0;font-size:13px;color:var(--ta-muted)">{{ t(`portal.level.${cls.levelKey}.desc`) }}</p>
        </section>
        <section v-else class="pp-card">
          <span class="pp-card__label">{{ t('portal.status.priority') }}</span>
          <p style="margin:6px 0 0;font-size:13px;font-weight:500;color:var(--ta-text)">{{ t('portal.level.pending.desc') }}</p>
        </section>
      </div>

      <!-- ── recorrido ── -->
      <div class="pp-col">
        <section class="pp-card">
          <span class="pp-card__label">{{ t('portal.status.timeline') }}</span>
          <div class="pp-tl">
            <div v-for="s in timeline" :key="s.key" class="pp-tl-step" :class="{ 'pp-tl-step--done': s.done, 'pp-tl-step--now': s.now }">
              <span class="pp-tl-step__d"></span>
              <span>
                <span class="pp-tl-step__t">{{ t(`portal.timeline.${s.key}`) }}</span>
                <span class="pp-tl-step__s">{{ t(`portal.timeline.${s.key}Sub`) }}</span>
              </span>
              <span class="pp-tl-step__h">{{ s.now ? t('portal.timeline.now') : s.time }}</span>
            </div>
          </div>
        </section>
      </div>

      <!-- ── aside ── -->
      <div class="pp-col">
        <section class="pp-card">
          <span class="pp-card__label">{{ t('portal.status.vitals') }}</span>
          <template v-if="vitals">
            <div v-for="r in vitals.rows" :key="r.key" class="pp-vrow">
              <span class="pp-vrow__l"><i class="pi" :class="r.icon"></i>{{ t(`portal.vital.${r.key}`) }}</span>
              <span class="pp-vrow__v"><b>{{ r.value }} <small style="display:inline;font-family:var(--ta-font)">{{ r.unit }}</small></b><small v-if="r.time">{{ t('portal.vital.measured', { time: r.time }) }}</small></span>
            </div>
          </template>
          <p v-else class="pp-empty">{{ t('portal.status.noVitals') }}</p>
        </section>
        <section class="pp-card">
          <span class="pp-card__label">{{ t('portal.status.myData') }}</span>
          <dl class="pp-kv">
            <dt>{{ t('portal.data.document') }}</dt><dd class="mono">{{ patient?.dni ? `DNI ${patient.dni}` : '—' }}</dd>
            <dt>{{ t('portal.data.birth') }}</dt><dd class="mono">{{ fmtDate(patient?.birthDate) }}</dd>
            <dt>{{ t('portal.data.email') }}</dt><dd class="mono">{{ patient?.email || '—' }}</dd>
          </dl>
          <p class="pp-card__hint">{{ t('portal.status.readOnly') }}</p>
        </section>
      </div>
    </div>
  </div>
</template>
