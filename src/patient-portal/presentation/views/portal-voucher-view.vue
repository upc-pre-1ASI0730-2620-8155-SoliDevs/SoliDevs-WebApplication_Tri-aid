<script setup>
/**
 * "My voucher": the referral receipt with the QR the patient shows at the
 * consulting room, the care history and the data the doctor will see.
 */
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { gsap } from 'gsap'
import QRCode from 'qrcode'
import { patientPortalStore } from '../../application/patient-portal-store.js'
import '../styles/portal.css'

const { t, locale } = useI18n()
const store = patientPortalStore

const o = computed(() => store.overview)
const patient = computed(() => o.value?.patient)
const episode = computed(() => o.value?.episode)
const cls = computed(() => o.value?.classification)
const referral = computed(() => o.value?.referral)

const fmtDate = iso => iso ? new Date(iso).toLocaleDateString(locale.value === 'en' ? 'en-US' : 'es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'
const fmtTime = iso => iso ? new Date(iso).toLocaleTimeString(locale.value === 'en' ? 'en-US' : 'es-PE', { hour: '2-digit', minute: '2-digit' }) : '—'
const episodeCode = computed(() => `EP-${String(episode.value?.id ?? 0).padStart(4, '0')}`)
const shiftLabel = computed(() => {
  const h = referral.value ? new Date(referral.value.referredAt).getHours() : new Date().getHours()
  return h < 14 ? t('portal.voucher.morning') : t('portal.voucher.afternoon')
})

/** QR payload: the episode code the consulting room scans to verify. */
const qrSvg = ref('')
import { ref } from 'vue'
onMounted(async () => {
  if (!store.isSignedIn) return
  if (!o.value) await store.loadOverview()
  if (episode.value) qrSvg.value = await QRCode.toString(episodeCode.value, { type: 'svg', margin: 0, color: { dark: '#0a2118', light: '#ffffff' } })
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const cards = document.querySelectorAll('.pp-cols > .pp-col > *')
  gsap.fromTo(cards, { opacity: 0, y: 18 }, { opacity: 1, y: 0, stagger: .07, duration: .45, ease: 'power3.out', clearProps: 'transform,opacity' })
  const box = document.querySelector('.pp-qr__box')
  if (box) gsap.fromTo(box, { opacity: 0, scale: .9, rotate: -3 }, { opacity: 1, scale: 1, rotate: 0, duration: .6, ease: 'back.out(1.6)', delay: .2, clearProps: 'transform,opacity' })
})
</script>

<template>
  <div class="pp-view" v-if="o">
    <header class="pp-view__head">
      <span class="pp-view__eyebrow">{{ t('portal.nav.voucher') }}</span>
      <h1 class="pp-view__title">{{ t('portal.voucher.title') }}</h1>
      <p class="pp-view__sub">{{ t('portal.voucher.episode') }} <span class="mono">{{ episodeCode }}</span><template v-if="referral"> · {{ t('portal.voucher.issued') }} {{ fmtTime(referral.referredAt) }}</template></p>
    </header>

    <div v-if="!referral" class="pp-cols two">
      <div class="pp-col main"><div class="pp-empty">{{ t('portal.voucher.notYet') }}</div></div>
    </div>

    <div v-else class="pp-cols">
      <!-- ── comprobante ── -->
      <div class="pp-col main">
        <section class="pp-receipt">
          <div class="pp-receipt__head">
            <span class="pp-receipt__brand">
              <span class="pp-receipt__mark"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M6 17h5l2-6 4 10 2-6h7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
              Tri-Aid
            </span>
            <span class="pp-receipt__code">{{ fmtTime(referral.referredAt) }} · {{ shiftLabel }}</span>
          </div>
          <div class="pp-receipt__body">
            <div class="pp-receipt__grid">
              <div class="pp-receipt__item"><small>{{ t('portal.voucher.specialty') }}</small><b>{{ referral.specialty }}</b></div>
              <div class="pp-receipt__item"><small>{{ t('portal.voucher.priority') }}</small><span class="pp-prio pp-prio--sm" :data-level="cls?.level ?? 0">{{ cls?.roman ?? '—' }} · {{ t(`portal.level.${cls?.levelKey ?? 'pending'}.name`) }}</span></div>
              <div class="pp-receipt__item"><small>{{ t('portal.voucher.room') }}</small><b class="mono">{{ referral.room }}</b></div>
              <div class="pp-receipt__item"><small>{{ t('portal.voucher.referredAt') }}</small><b class="mono">{{ fmtTime(referral.referredAt) }}</b></div>
            </div>
            <div class="pp-qr">
              <span class="pp-qr__box" v-html="qrSvg"></span>
              <div>
                <p class="pp-qr__t">{{ t('portal.voucher.verifyTitle') }}</p>
                <p class="pp-qr__s">{{ t('portal.voucher.verifyText', { room: referral.room, code: episodeCode }) }}</p>
                <div class="pp-qr__code">{{ episodeCode }}</div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <!-- ── historial ── -->
      <div class="pp-col">
        <section class="pp-card">
          <span class="pp-card__label">{{ t('portal.voucher.history') }}</span>
          <div class="pp-vrow">
            <span class="pp-vrow__l"><i class="pi pi-clock"></i>{{ t('portal.timeline.arrival') }}</span>
            <span class="pp-vrow__v"><b>{{ fmtTime(episode?.arrivalTime) }}</b></span>
          </div>
          <div class="pp-vrow">
            <span class="pp-vrow__l"><i class="pi pi-wave-pulse"></i>{{ t('portal.timeline.vitals') }}</span>
            <span class="pp-vrow__v"><b>—</b></span>
          </div>
          <div class="pp-vrow" v-if="cls">
            <span class="pp-vrow__l"><i class="pi pi-check-circle"></i>{{ t('portal.timeline.priority') }}</span>
            <span class="pp-vrow__v"><b>{{ cls.roman }} · {{ t(`portal.level.${cls.levelKey}.name`) }}</b><small>{{ cls.confirmedAt ? t('portal.voucher.confirmedBy', { time: fmtTime(cls.confirmedAt) }) : '' }}</small></span>
          </div>
        </section>
        <section class="pp-card">
          <span class="pp-card__label">{{ t('portal.voucher.doctorSees') }}</span>
          <dl class="pp-kv">
            <dt>{{ t('portal.voucher.patient') }}</dt><dd>{{ patient?.fullName }}</dd>
            <dt>{{ t('portal.data.document') }}</dt><dd class="mono">{{ patient?.dni ? `DNI ${patient.dni}` : '—' }}</dd>
            <dt>{{ t('portal.data.birth') }}</dt><dd class="mono">{{ fmtDate(patient?.birthDate) }}</dd>
          </dl>
        </section>
      </div>

      <!-- ── qué hacer ── -->
      <div class="pp-col">
        <section class="pp-card">
          <span class="pp-card__label">{{ t('portal.voucher.whatToDo') }}</span>
          <ul class="pp-steps">
            <li><span class="n">1</span><span>{{ t('portal.voucher.step1') }}</span></li>
            <li><span class="n">2</span><span>{{ t('portal.voucher.step2') }}</span></li>
            <li><span class="n">3</span><span>{{ t('portal.voucher.step3') }}</span></li>
          </ul>
        </section>
        <section class="pp-card">
          <span class="pp-card__label">{{ t('portal.voucher.help') }}</span>
          <p style="margin:10px 0 0;font-size:13px;color:var(--ta-muted);line-height:1.5">{{ t('portal.voucher.helpText') }}</p>
        </section>
      </div>
    </div>
  </div>
</template>
