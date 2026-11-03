<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { gsap } from 'gsap'
import AuthShell from '../../../shared/presentation/components/auth-shell.vue'
import { iamStore } from '../../application/iam-store.js'
import { subscriptionStore } from '../../../subscription/application/subscription-store.js'
import { notify } from '../../../shared/application/toast-store.js'

const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()

const card = ref(null)
const reduce = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

const features = computed(() => [
  { icon: 'clock', title: t('register.ft1.t'), text: t('register.ft1.d') },
  { icon: 'lock', title: t('register.ft2.t'), text: t('register.ft2.d') },
  { icon: 'mail', title: t('register.ft3.t'), text: t('register.ft3.d') }
])

const form = ref({
  institution: '',
  names: '',
  surnames: '',
  email: '',
  username: '',
  password: '',
  confirm: ''
})
const loading = ref(false)
const error = ref('')
const showPass = ref(false)
const showConfirm = ref(false)

// Plan preseleccionado cuando se llega desde la landing (?plan=...).
const selectedPlan = computed(() => {
  const slug = String(route.query.plan || '')
  return ['esencial', 'profesional', 'red'].includes(slug) ? slug : null
})

const rules = {
  institution: v => v.trim().length >= 3 || t('register.err.institution'),
  names: v => v.trim().length >= 3 || t('register.err.names'),
  surnames: v => v.trim().length >= 3 || t('register.err.surnames'),
  email: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) || t('register.err.email'),
  username: v => /^[a-z0-9._-]{4,}$/i.test(v.trim()) || t('register.err.username'),
  password: v => v.length >= 8 || t('register.err.password'),
  confirm: v => v === form.value.password || t('register.err.confirm')
}
const fieldError = key => rules[key]?.(form.value[key]) || ''
const touched = ref({})
const showErr = key => touched.value[key] && typeof fieldError(key) === 'string' && fieldError(key)
const valid = computed(() => Object.keys(rules).every(k => fieldError(k) === true))

onMounted(() => {
  if (reduce()) return
  gsap.fromTo(card.value, { y: 26, opacity: 0 },
    { y: 0, opacity: 1, duration: 0.5, ease: 'back.out(1.4)' })
})

function blur(key) { touched.value[key] = true }

async function submit() {
  touched.value = Object.fromEntries(Object.keys(rules).map(k => [k, true]))
  if (!valid.value) return
  loading.value = true
  error.value = ''
  try {
    // 1. Institucion + cuenta administradora (IAM).
    const created = await iamStore.service.registerInstitution({
      institution: form.value.institution,
      names: form.value.names,
      surnames: form.value.surnames,
      email: form.value.email.trim(),
      username: form.value.username.trim(),
      password: form.value.password
    })
    iamStore.setUser(created.data)
    // 2. Sesion abierta + suscripcion en prueba de 14 dias (Subscription).
    await iamStore.service.signIn(form.value.username.trim(), form.value.password)
    await subscriptionStore.service.startTrial(created.data.institution, selectedPlan.value)
    await subscriptionStore.load({ force: true })
    notify({ type: 'success', message: t('register.toastWelcome') })
    router.push('/subscriptions')
  } catch (e) {
    error.value = t(e.code === 'username-taken'
      ? 'register.err.usernameTaken'
      : e.code === 'institution-taken'
        ? 'register.err.institutionTaken'
        : 'register.err.api')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AuthShell :title="t('register.title')" :lead="t('register.lead')" :features="features">
    <div ref="card">
      <h2>{{ t('register.cardTitle') }}</h2>
      <p class="sub">{{ t('register.cardSub') }}</p>
      <p v-if="selectedPlan" class="rg__plan">
        <i class="pi pi-star-fill"></i>{{ t('register.planSelected', { plan: t(`register.plan_${selectedPlan}`) }) }}
      </p>
      <p v-if="error" class="err">{{ error }}</p>

      <form @submit.prevent="submit" novalidate>
        <div class="field">
          <label for="institution">{{ t('register.fInstitution') }}</label>
          <input id="institution" v-model="form.institution" @blur="blur('institution')" />
          <span v-if="showErr('institution')" class="fe">{{ fieldError('institution') }}</span>
        </div>

        <div class="rg__row">
          <div class="field">
            <label for="names">{{ t('register.fNames') }}</label>
            <input id="names" v-model="form.names" @blur="blur('names')" />
            <span v-if="showErr('names')" class="fe">{{ fieldError('names') }}</span>
          </div>
          <div class="field">
            <label for="surnames">{{ t('register.fSurnames') }}</label>
            <input id="surnames" v-model="form.surnames" @blur="blur('surnames')" />
            <span v-if="showErr('surnames')" class="fe">{{ fieldError('surnames') }}</span>
          </div>
        </div>

        <div class="field">
          <label for="email">{{ t('register.fEmail') }}</label>
          <input id="email" type="email" v-model="form.email" @blur="blur('email')" />
          <span v-if="showErr('email')" class="fe">{{ fieldError('email') }}</span>
        </div>

        <div class="field">
          <label for="username">{{ t('register.fUsername') }}</label>
          <input id="username" v-model="form.username" autocomplete="username" @blur="blur('username')" />
          <span v-if="showErr('username')" class="fe">{{ fieldError('username') }}</span>
        </div>

        <div class="rg__row">
          <div class="field">
            <label for="password">{{ t('register.fPassword') }}</label>
            <div class="pass-wrap">
              <input id="password" :type="showPass ? 'text' : 'password'" v-model="form.password" autocomplete="new-password" @blur="blur('password')" />
              <button type="button" class="pass-toggle" @click="showPass = !showPass" :aria-label="t('login.showPass')">
                <i class="pi" :class="showPass ? 'pi-eye-slash' : 'pi-eye'"></i>
              </button>
            </div>
            <span v-if="showErr('password')" class="fe">{{ fieldError('password') }}</span>
          </div>
          <div class="field">
            <label for="confirm">{{ t('register.fConfirm') }}</label>
            <div class="pass-wrap">
              <input id="confirm" :type="showConfirm ? 'text' : 'password'" v-model="form.confirm" autocomplete="new-password" @blur="blur('confirm')" />
              <button type="button" class="pass-toggle" @click="showConfirm = !showConfirm" :aria-label="t('login.showPass')">
                <i class="pi" :class="showConfirm ? 'pi-eye-slash' : 'pi-eye'"></i>
              </button>
            </div>
            <span v-if="showErr('confirm')" class="fe">{{ fieldError('confirm') }}</span>
          </div>
        </div>

        <button class="btn" :disabled="loading">
          {{ loading ? t('register.creating') : t('register.submit') }}
        </button>
        <p class="rg__trial"><i class="pi pi-gift"></i>{{ t('register.trialNote') }}</p>
      </form>

      <p class="rg__login">{{ t('register.haveAccount') }} <router-link class="link" to="/login">{{ t('register.loginLink') }}</router-link></p>
    </div>
  </AuthShell>
</template>

<style scoped>
.rg__row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.fe{font-size:.74rem;color:var(--ta-danger)}
.rg__plan{display:inline-flex;align-items:center;gap:8px;margin:12px 0 0;padding:7px 14px;border-radius:999px;background:#e3f6ea;color:var(--ta-brand);font-size:.8rem;font-weight:600}
.rg__trial{display:flex;align-items:center;gap:8px;justify-content:center;margin:10px 0 0;font-size:.8rem;color:var(--ta-brand);font-weight:600}
.rg__login{margin:14px 0 0;text-align:center;font-size:.85rem;color:var(--ta-muted)}
.rg__login a{font-weight:600}
@media (max-width:560px){.rg__row{grid-template-columns:1fr}}
</style>
