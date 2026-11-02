<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { gsap } from 'gsap'
import { iamStore } from '../../application/iam-store.js'
import { subscriptionStore } from '../../../subscription/application/subscription-store.js'
import { notify } from '../../../shared/application/toast-store.js'

const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()

const card = ref(null)
const reduce = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

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
  gsap.fromTo(card.value, { y: 28, opacity: 0 },
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
  <div class="rg">
    <div ref="card" class="ta-card rg__card">
      <header class="rg__head">
        <h2>{{ t('register.title') }}</h2>
        <p class="ta-sub">{{ t('register.lead') }}</p>
        <p v-if="selectedPlan" class="rg__plan">
          <i class="pi pi-star-fill"></i>{{ t('register.planSelected', { plan: t(`register.plan_${selectedPlan}`) }) }}
        </p>
      </header>

      <p v-if="error" class="rg__error">{{ error }}</p>

      <form @submit.prevent="submit" novalidate>
        <fieldset class="rg__group">
          <legend>{{ t('register.gInstitution') }}</legend>
          <div class="rg__field" :class="{ bad: showErr('institution') }">
            <label for="institution">{{ t('register.fInstitution') }}</label>
            <input id="institution" v-model="form.institution" @blur="blur('institution')" />
            <span v-if="showErr('institution')" class="rg__fe">{{ fieldError('institution') }}</span>
          </div>
        </fieldset>

        <fieldset class="rg__group">
          <legend>{{ t('register.gAdmin') }}</legend>
          <div class="rg__row">
            <div class="rg__field" :class="{ bad: showErr('names') }">
              <label for="names">{{ t('register.fNames') }}</label>
              <input id="names" v-model="form.names" @blur="blur('names')" />
              <span v-if="showErr('names')" class="rg__fe">{{ fieldError('names') }}</span>
            </div>
            <div class="rg__field" :class="{ bad: showErr('surnames') }">
              <label for="surnames">{{ t('register.fSurnames') }}</label>
              <input id="surnames" v-model="form.surnames" @blur="blur('surnames')" />
              <span v-if="showErr('surnames')" class="rg__fe">{{ fieldError('surnames') }}</span>
            </div>
          </div>
          <div class="rg__field" :class="{ bad: showErr('email') }">
            <label for="email">{{ t('register.fEmail') }}</label>
            <input id="email" type="email" v-model="form.email" @blur="blur('email')" />
            <span v-if="showErr('email')" class="rg__fe">{{ fieldError('email') }}</span>
          </div>
        </fieldset>

        <fieldset class="rg__group">
          <legend>{{ t('register.gAccess') }}</legend>
          <div class="rg__field" :class="{ bad: showErr('username') }">
            <label for="username">{{ t('register.fUsername') }}</label>
            <input id="username" v-model="form.username" autocomplete="username" @blur="blur('username')" />
            <span v-if="showErr('username')" class="rg__fe">{{ fieldError('username') }}</span>
          </div>
          <div class="rg__row">
            <div class="rg__field" :class="{ bad: showErr('password') }">
              <label for="password">{{ t('register.fPassword') }}</label>
              <div class="rg__pass">
                <input id="password" :type="showPass ? 'text' : 'password'" v-model="form.password" autocomplete="new-password" @blur="blur('password')" />
                <button type="button" class="rg__eye" @click="showPass = !showPass" :aria-label="t('login.showPass')">
                  <i class="pi" :class="showPass ? 'pi-eye-slash' : 'pi-eye'"></i>
                </button>
              </div>
              <span v-if="showErr('password')" class="rg__fe">{{ fieldError('password') }}</span>
            </div>
            <div class="rg__field" :class="{ bad: showErr('confirm') }">
              <label for="confirm">{{ t('register.fConfirm') }}</label>
              <div class="rg__pass">
                <input id="confirm" :type="showConfirm ? 'text' : 'password'" v-model="form.confirm" autocomplete="new-password" @blur="blur('confirm')" />
                <button type="button" class="rg__eye" @click="showConfirm = !showConfirm" :aria-label="t('login.showPass')">
                  <i class="pi" :class="showConfirm ? 'pi-eye-slash' : 'pi-eye'"></i>
                </button>
              </div>
              <span v-if="showErr('confirm')" class="rg__fe">{{ fieldError('confirm') }}</span>
            </div>
          </div>
        </fieldset>

        <button class="ta-btn rg__submit" :disabled="loading">
          {{ loading ? t('register.creating') : t('register.submit') }}
        </button>
        <p class="rg__trial"><i class="pi pi-gift"></i>{{ t('register.trialNote') }}</p>
      </form>

      <p class="rg__login">{{ t('register.haveAccount') }} <router-link to="/login">{{ t('register.loginLink') }}</router-link></p>
    </div>
  </div>
</template>

<style scoped>
.rg{min-height:100vh;display:grid;place-items:start center;background:var(--ta-bg);padding:36px 20px;box-sizing:border-box;font-family:var(--ta-font)}
.rg__card{width:min(560px,100%);padding:32px 34px}
.rg__head h2{margin:0 0 4px;color:var(--ta-text);font-size:1.35rem}
.rg__head .ta-sub{margin:0}
.rg__plan{display:inline-flex;align-items:center;gap:8px;margin:14px 0 0;padding:7px 14px;border-radius:999px;background:#e3f6ea;color:var(--ta-brand);font-size:.82rem;font-weight:600}
.rg__error{margin:14px 0 0;padding:10px 12px;border-radius:8px;background:var(--ta-danger-bg);border:1px solid var(--ta-danger-line);color:var(--ta-danger);font-size:.84rem}
.rg__group{border:1px solid var(--ta-line);border-radius:12px;padding:16px 16px 18px;margin:16px 0 0;display:grid;gap:12px}
.rg__group legend{padding:0 8px;font-size:.78rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--ta-brand)}
.rg__row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.rg__field{display:flex;flex-direction:column;gap:5px}
.rg__field label{font-size:.8rem;color:var(--ta-muted);font-weight:600}
.rg__field input{padding:10px 12px;border:1px solid var(--ta-line);border-radius:8px;font:inherit;font-size:.9rem;background:var(--ta-surface);color:var(--ta-text)}
.rg__field input:focus{outline:2px solid var(--ta-accent);border-color:transparent}
.rg__field.bad input{border-color:var(--ta-danger)}
.rg__fe{font-size:.74rem;color:var(--ta-danger)}
.rg__pass{position:relative;display:flex}
.rg__pass input{width:100%;padding-right:2.6rem}
.rg__eye{position:absolute;right:6px;top:50%;transform:translateY(-50%);border:0;background:transparent;color:var(--ta-muted);cursor:pointer;padding:6px}
.rg__submit{width:100%;justify-content:center;margin-top:18px}
.rg__trial{display:flex;align-items:center;gap:8px;justify-content:center;margin:12px 0 0;font-size:.8rem;color:var(--ta-brand);font-weight:600}
.rg__login{margin:16px 0 0;text-align:center;font-size:.85rem;color:var(--ta-muted)}
.rg__login a{color:var(--ta-brand);font-weight:600}
@media (max-width:560px){.rg__row{grid-template-columns:1fr}}
</style>
