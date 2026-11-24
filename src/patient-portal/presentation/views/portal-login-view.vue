<script setup>
/**
 * Sign-in of the patient portal. Identifier is the DNI or the e-mail given at
 * admission; password is the access code the admission desk handed over.
 */
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { gsap } from 'gsap'
import { patientPortalStore } from '../../application/patient-portal-store.js'
import LangSwitch from '../../../shared/presentation/components/lang-switch.vue'
import '../styles/portal.css'

const router = useRouter()
const { t } = useI18n()
const store = patientPortalStore

const identifier = ref('')
const password = ref('')
const error = ref(null)
const submitting = ref(false)
const form = ref(null)
const aside = ref(null)

const reduce = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
const errorMessage = computed(() => error.value ? t(`portal.error.${error.value}`) : '')

onMounted(() => {
  if (store.isSignedIn) return router.replace('/portal/estado')
  if (reduce()) return
  gsap.fromTo(form.value, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: .5, ease: 'power3.out', clearProps: 'transform,opacity' })
  gsap.fromTo(aside.value, { opacity: 0, x: 24 }, { opacity: 1, x: 0, duration: .5, ease: 'power3.out', delay: .1, clearProps: 'transform,opacity' })
  gsap.fromTo(aside.value?.querySelectorAll('.pp-la-step') || [], { opacity: 0, y: 10 }, { opacity: 1, y: 0, stagger: .1, duration: .4, ease: 'power3.out', delay: .3, clearProps: 'transform,opacity' })
})

async function submit() {
  error.value = null
  if (!identifier.value.trim() || !password.value) { error.value = 'required'; return }
  submitting.value = true
  const r = await store.signIn(identifier.value.trim(), password.value)
  submitting.value = false
  if (!r.ok) {
    error.value = r.error
    if (!reduce() && form.value) gsap.fromTo(form.value, { x: 0 }, { x: -6, duration: .06, repeat: 5, yoyo: true, ease: 'none', clearProps: 'x' })
    return
  }
  router.replace('/portal/estado')
}
</script>

<template>
  <div class="pp-login">
    <LangSwitch class="ls--float" />
    <div class="pp-login__grid">
      <div>
        <span class="pp-login__brand">
          <span class="pp-login__mark"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M6 17h5l2-6 4 10 2-6h7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
          <b>Tri-Aid</b>
        </span>
        <h1 class="pp-login__title">{{ t('portal.login.title') }}</h1>
        <p class="pp-login__lead">{{ t('portal.login.lead') }}</p>

        <div v-if="error" class="ta-err" role="alert" style="margin-bottom:14px">
          <i class="pi pi-exclamation-circle"></i> {{ errorMessage }}
        </div>

        <form ref="form" class="ta-card pp-login__form" @submit.prevent="submit">
          <div class="field">
            <label for="pp-id">{{ t('portal.login.identifier') }}</label>
            <input id="pp-id" v-model="identifier" class="ta-input" type="text" autocomplete="username" :placeholder="t('portal.login.identifierPlaceholder')" />
          </div>
          <div class="field">
            <label for="pp-pass">{{ t('portal.login.password') }}</label>
            <input id="pp-pass" v-model="password" class="ta-input" type="password" autocomplete="current-password" :placeholder="t('portal.login.passwordPlaceholder')" />
          </div>
          <button class="ta-btn" type="submit" :disabled="submitting">{{ t('portal.login.submit') }}</button>
        </form>

        <p class="pp-login__below">
          <a class="pp-login__help" href="#admision">{{ t('portal.login.noAccess') }}</a>
        </p>
      </div>

      <aside ref="aside" class="pp-login__aside">
        <span class="pp-login__kicker">{{ t('portal.login.asideKicker') }}</span>
        <h2>{{ t('portal.login.asideTitle') }}</h2>
        <div class="pp-la-step">
          <span class="pp-la-step__ic"><i class="pi pi-wave-pulse"></i></span>
          <div><b>{{ t('portal.login.step1Title') }}</b><p>{{ t('portal.login.step1') }}</p></div>
        </div>
        <div class="pp-la-step">
          <span class="pp-la-step__ic"><i class="pi pi-clock"></i></span>
          <div><b>{{ t('portal.login.step2Title') }}</b><p>{{ t('portal.login.step2') }}</p></div>
        </div>
        <div class="pp-la-step">
          <span class="pp-la-step__ic"><i class="pi pi-qrcode"></i></span>
          <div><b>{{ t('portal.login.step3Title') }}</b><p>{{ t('portal.login.step3') }}</p></div>
        </div>
      </aside>
    </div>
  </div>
</template>
