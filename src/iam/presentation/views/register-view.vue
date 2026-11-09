<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
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
const stepPane = ref(null)
const step = ref(1) // 1 cuenta · 2 plan · 3 tarjeta
const busy = ref(false)
const error = ref('')
const reduce = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

const features = computed(() => [
  { icon: 'clock', title: t('register.ft1.t'), text: t('register.ft1.d') },
  { icon: 'lock', title: t('register.ft2.t'), text: t('register.ft2.d') },
  { icon: 'mail', title: t('register.ft3.t'), text: t('register.ft3.d') }
])

// ── Paso 1: institucion y administrador ──
const form = ref({ institution: '', names: '', surnames: '', email: '', username: '', password: '', confirm: '' })
const touched = ref({})
const showPass = ref(false)
const showConfirm = ref(false)

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
const showErr = key => touched.value[key] && typeof fieldError(key) === 'string' && fieldError(key)
const institutionTaken = ref(false)
const instChecking = ref(false)
const step1Valid = computed(() => Object.keys(rules).every(k => fieldError(k) === true) && !institutionTaken.value)

// ── Paso 2: plan y ciclo ──
const slug = computed(() => {
  const s = String(route.query.plan || '')
  return ['esencial', 'profesional', 'red'].includes(s) ? s : null
})
const selectedPlanId = ref(null)
const cycle = ref('monthly')
const chosenPlan = computed(() => {
  if (selectedPlanId.value) return subscriptionStore.plans.find(p => p.id === selectedPlanId.value) || null
  return slug.value ? subscriptionStore.plans.find(p => p.id.endsWith(slug.value)) || null : null
})
const step2Valid = computed(() => chosenPlan.value !== null)

const breakdown = computed(() => {
  const plan = chosenPlan.value
  if (!plan) return null
  const monthly = plan.monthlyPrice
  const list = cycle.value === 'annual' ? monthly * 12 : monthly
  const price = cycle.value === 'annual' ? plan.annualPrice : plan.monthlyPrice
  return {
    list,
    price,
    discount: list - price,
    total: price,
    savingPct: plan.annualDiscount,
    firstCharge: firstChargeDate()
  }
})
function firstChargeDate() {
  const d = new Date()
  d.setDate(d.getDate() + 14)
  return d.toLocaleDateString(locale.value === 'en' ? 'en-US' : 'es-PE', { day: '2-digit', month: 'long', year: 'numeric' })
}

// ── Paso 3: tarjeta ──
const cardNumber = ref('')
const cardHolder = ref('')
const simulateReject = ref(false)
const showCard = ref(false)
const cardDigits = computed(() => (cardNumber.value || '').replace(/\D/g, ''))
const cardMasked = computed(() => cardDigits.value ? `Visa •••• ${cardDigits.value.slice(-4)}` : '')
const step3Valid = computed(() => cardDigits.value.length >= 13 && cardHolder.value.trim().length >= 3)

function blur(key) {
    touched.value[key] = true
    if (key === 'institution') checkInstitution()
}

/** Disponibilidad temprana del nombre de institucion (paso 1). */
async function checkInstitution() {
    const v = form.value.institution.trim()
    if (v.length < 3) { institutionTaken.value = false; return }
    instChecking.value = true
    try {
        const available = await iamStore.service.isInstitutionAvailable(v)
        if (form.value.institution.trim() === v) institutionTaken.value = !available
    } catch { /* la validacion final del submit es la autoridad */ }
    finally { instChecking.value = false }
}

function animateStep(direction = 1) {
  if (reduce() || !stepPane.value) return
  gsap.fromTo(stepPane.value,
    { x: 34 * direction, opacity: 0 },
    { x: 0, opacity: 1, duration: 0.38, ease: 'power2.out' })
}
function goTo(n) {
  step.value = n
  error.value = ''
  nextTick(() => animateStep(n))
}
function next1() {
  touched.value = Object.fromEntries(Object.keys(rules).map(k => [k, true]))
  if (step1Valid.value) goTo(2)
}
function next2() { if (step2Valid.value) goTo(3) }

onMounted(async () => {
  // Los planes se cargan temprano: el paso 2 necesita precios y el slug del landing.
  await subscriptionStore.load()
  if (chosenPlan.value) selectedPlanId.value = chosenPlan.value.id
  if (reduce() || !card.value) return
  gsap.fromTo(card.value, { y: 26, opacity: 0 },
    { y: 0, opacity: 1, duration: 0.5, ease: 'back.out(1.4)' })
})

async function submit() {
  if (!step3Valid.value) return
  busy.value = true
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
    // 2. Sesion abierta + trial con tarjeta registrada (Subscription).
    await iamStore.service.signIn(form.value.username.trim(), form.value.password)
    await subscriptionStore.service.startTrial(created.data.institution, chosenPlan.value.id, cardMasked.value)
    await subscriptionStore.load({ force: true })
    notify({ type: 'success', message: t('register.toastWelcome') })
    router.push('/subscriptions')
  } catch (e) {
    error.value = t(e.code === 'username-taken'
      ? 'register.err.usernameTaken'
      : e.code === 'institution-taken'
        ? 'register.err.institutionTaken'
        : e.code === 'card-rejected'
          ? 'register.err.cardRejected'
          : 'register.err.api')
    if (e.code === 'card-rejected') animateReject()
  } finally {
    busy.value = false
  }
}

/** Shake cuando la tarjeta de verificacion es rechazada. */
function animateReject() {
  if (reduce() || !stepPane.value) return
  gsap.fromTo(stepPane.value, { x: 0 },
    { keyframes: [{ x: -12 }, { x: 10 }, { x: -7 }, { x: 4 }, { x: 0 }], duration: 0.5, ease: 'power1.out' })
}
</script>

<template>
  <AuthShell :title="t('register.title')" :lead="t('register.lead')" :features="features">
    <div ref="card" class="rg__root">
      <h2>{{ t('register.cardTitle') }}</h2>
      <p class="sub">{{ t('register.cardSub') }}</p>

      <!-- Progreso -->
      <ol class="rg__steps">
        <li :class="{ on: step >= 1 }"><span>1</span>{{ t('register.stepAccount') }}</li>
        <li :class="{ on: step >= 2 }"><span>2</span>{{ t('register.stepPlan') }}</li>
        <li :class="{ on: step >= 3 }"><span>3</span>{{ t('register.stepCard') }}</li>
      </ol>

      <p v-if="error" class="err">{{ error }}</p>

      <div ref="stepPane">
        <!-- ═══ PASO 1: cuenta ═══ -->
        <form v-if="step === 1" @submit.prevent="next1" novalidate>
          <div class="field">
            <label for="institution">{{ t('register.fInstitution') }}</label>
            <input id="institution" v-model="form.institution" @blur="blur('institution')" />
            <span v-if="institutionTaken" class="fe">{{ t('register.err.institutionTaken') }}</span>
            <span v-else-if="showErr('institution')" class="fe">{{ fieldError('institution') }}</span>
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
          <button class="btn" :disabled="!step1Valid && Object.keys(touched).length > 0">{{ t('register.nextPlan') }}</button>
        </form>

        <!-- ═══ PASO 2: plan y resumen ═══ -->
        <form v-else-if="step === 2" @submit.prevent="next2" novalidate>
          <div class="rg__cycle">
            <button type="button" :class="{ on: cycle === 'monthly' }" @click="cycle = 'monthly'">{{ t('subscription.cycle_monthly') }}</button>
            <button type="button" :class="{ on: cycle === 'annual' }" @click="cycle = 'annual'">
              {{ t('subscription.cycle_annual') }} <em v-if="chosenPlan?.annualDiscount">−{{ chosenPlan.annualDiscount }}%</em>
            </button>
          </div>

          <div class="rg__plans">
            <button v-for="p in subscriptionStore.plans" :key="p.id" type="button"
                    class="rg__plan" :class="{ sel: chosenPlan?.id === p.id }" @click="selectedPlanId = p.id">
              <span v-if="chosenPlan?.id === p.id" class="rg__plan__tag">{{ t('register.selected') }}</span>
              <b class="rg__plan__name">{{ p.name }}</b>
              <span class="rg__plan__for">{{ p.for || p.description }}</span>
              <span class="rg__plan__price">
                {{ p.priceFor(cycle) === 0 ? t('plan.institutional.price') : `S/ ${p.priceFor(cycle)}` }}<small>/{{ t(cycle === 'annual' ? 'subscription.perYear' : 'subscription.perMonth') }}</small>
              </span>
              <ul class="rg__plan__feats">
                <li v-for="f in p.features" :key="f">{{ f }}</li>
              </ul>
            </button>
          </div>

          <p class="rg__trial"><i class="pi pi-gift"></i>{{ t('register.trialNote2') }}</p>

          <div class="rg__nav">
            <button type="button" class="btn btn--ghost" @click="goTo(1)">{{ t('register.back') }}</button>
            <button class="btn" :disabled="!step2Valid">{{ t('register.nextCard') }}</button>
          </div>
        </form>

        <!-- ═══ PASO 3: tarjeta ═══ -->
        <form v-else @submit.prevent="submit" novalidate>
          <div class="rg__summary rg__summary--mini">
            <div class="rg__sumrow"><span>{{ t('register.sumPlan') }}</span><b>{{ chosenPlan?.name }} · {{ t(cycle === 'annual' ? 'subscription.cycle_annual' : 'subscription.cycle_monthly') }}</b></div>
            <div class="rg__sumrow rg__sumrow--total"><span>{{ t('register.sumToday') }}</span><b>S/ 0</b></div>
            <div class="rg__sumrow"><span>{{ t('register.sumFirstChargeShort') }}</span><b>S/ {{ breakdown?.total }} · {{ breakdown?.firstCharge }}</b></div>
          </div>

          <div class="field">
            <label for="cardNumber">{{ t('register.fCard') }}</label>
            <div class="pass-wrap">
              <input id="cardNumber" :type="showCard ? 'text' : 'password'" v-model="cardNumber" inputmode="numeric" placeholder="4242 4242 4242 4242" maxlength="19" autocomplete="cc-number" />
              <button type="button" class="pass-toggle" @click="showCard = !showCard" :aria-label="t('login.showPass')">
                <i class="pi" :class="showCard ? 'pi-eye-slash' : 'pi-eye'"></i>
              </button>
            </div>
            <span v-if="cardDigits && cardDigits.length < 13" class="fe">{{ t('register.err.card') }}</span>
          </div>
          <div class="field">
            <label for="cardHolder">{{ t('register.fHolder') }}</label>
            <input id="cardHolder" v-model="cardHolder" autocomplete="cc-name" />
            <span v-if="cardHolder && cardHolder.trim().length < 3" class="fe">{{ t('register.err.holder') }}</span>
          </div>

          <label class="rg__reject">
            <input type="checkbox" v-model="simulateReject" />
            <span>{{ t('register.simulateReject') }}</span>
          </label>
          <p class="rg__note"><i class="pi pi-shield"></i>{{ t('register.cardNote', { date: breakdown?.firstCharge }) }}</p>

          <div class="rg__nav">
            <button type="button" class="btn btn--ghost" :disabled="busy" @click="goTo(2)">{{ t('register.back') }}</button>
            <button class="btn" :disabled="busy || !step3Valid">
              {{ busy ? t('register.creating') : t('register.finish') }}
            </button>
          </div>
        </form>
      </div>

      <p class="rg__login">{{ t('register.haveAccount') }} <router-link class="link" to="/login">{{ t('register.loginLink') }}</router-link></p>
    </div>
  </AuthShell>
</template>

<style scoped>
.rg__steps{display:flex;gap:8px;list-style:none;margin:12px 0 14px;padding:0}
.pass-wrap{position:relative;display:flex}
.pass-wrap input{width:100%;padding-right:2.6rem}
.pass-toggle{position:absolute;right:.45rem;top:50%;transform:translateY(-50%);display:inline-flex;align-items:center;justify-content:center;width:2rem;height:2rem;border:none;background:transparent;color:#64748b;cursor:pointer;border-radius:.4rem}
.pass-toggle:hover{color:#1d6b4f;background:rgba(29,107,79,.08)}
.pass-toggle i{font-size:1rem;line-height:1}
.rg__steps li{flex:1;display:flex;align-items:center;gap:7px;font-size:.74rem;color:var(--ta-muted);border-top:3px solid var(--ta-line);padding-top:9px}
.rg__steps li span{width:18px;height:18px;border-radius:999px;background:var(--ta-line);color:var(--ta-muted);display:grid;place-items:center;font-size:.66rem;font-weight:700;flex:none}
.rg__steps li.on{color:var(--ta-brand);border-top-color:var(--ta-accent)}
.rg__steps li.on span{background:var(--ta-brand);color:#fff}
.rg__row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.fe{position:absolute;left:0;bottom:2px;font-size:.74rem;color:var(--ta-danger);line-height:1.15;max-width:100%}
.rg__field,.field{position:relative;padding-bottom:17px}
.field:has(.pass-wrap){padding-bottom:34px}
.rg__cycle{display:flex;border:1px solid var(--ta-line);border-radius:10px;overflow:hidden;margin-bottom:14px}
.rg__cycle button{flex:1;border:0;background:transparent;padding:10px;cursor:pointer;font:inherit;font-size:.85rem;color:var(--ta-muted);display:flex;gap:8px;align-items:center;justify-content:center}
.rg__cycle button.on{background:var(--ta-brand);color:#fff}
.rg__cycle em{font-style:normal;font-size:.68rem;background:rgba(255,255,255,.25);border-radius:999px;padding:2px 8px}
.rg__cycle button:not(.on) em{background:#e3f6ea;color:var(--ta-brand)}
.rg__plans{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-bottom:18px;align-items:stretch}
.rg__plan{position:relative;display:flex;flex-direction:column;gap:10px;background:var(--ta-surface);border:1px solid var(--ta-line);border-radius:16px;padding:24px 22px;cursor:pointer;font:inherit;text-align:left;color:var(--ta-text);transition:transform .25s ease,box-shadow .25s ease}
.rg__plan:hover{transform:translateY(-6px);box-shadow:0 14px 34px rgba(10,34,26,.12)}
.rg__plan.sel{border:2px solid var(--ta-brand)}
.rg__plan__tag{position:absolute;top:-13px;right:20px;background:var(--ta-brand);color:#fff;font:700 .72rem/1 var(--ta-font);letter-spacing:.8px;text-transform:uppercase;padding:6px 12px;border-radius:999px}
.rg__plan__name{font-size:1.15rem;color:var(--ta-text)}
.rg__plan__for{color:var(--ta-muted);opacity:.7;font-size:.9rem;min-height:2.4em}
.rg__plan__price{font:500 1.35rem/1.1 var(--ta-mono);letter-spacing:-.3px;color:var(--ta-brand);white-space:nowrap}
.rg__plan__price small{font-size:.85rem;font-weight:400;letter-spacing:0;color:var(--ta-text);opacity:.65}
.rg__plan__feats{list-style:none;display:grid;gap:8px;margin:10px 0 0;padding:0}
.rg__plan__feats li{font-size:.92rem;color:var(--ta-text);padding-left:22px;position:relative}
.rg__plan__feats li::before{content:'\u2713';position:absolute;left:0;color:var(--ta-brand);font-weight:700}
.rg__plan__feats li::before{content:'\u2713';position:absolute;left:0;color:var(--ta-brand);font-weight:700}
.rg__plan__feats li::before{content:'✓';position:absolute;left:0;color:var(--ta-brand);font-weight:700}
.rg__summary{border:1px dashed var(--ta-line);border-radius:10px;padding:12px 14px;display:grid;gap:7px;margin-bottom:6px}
.rg__summary--mini{background:#f4f9f6}
.rg__sumrow{display:flex;justify-content:space-between;align-items:center;font-size:.84rem;color:var(--ta-muted)}
.rg__sumrow b{color:var(--ta-text);font-family:var(--ta-mono);font-weight:600}
.rg__sumrow b.ok{color:var(--ta-brand)}
.rg__sumrow s{color:var(--ta-muted)}
.rg__sumrow--total{border-top:1px solid var(--ta-line);padding-top:7px}
.rg__sumrow--total b{font-size:1rem}
.rg__nav{display:flex;justify-content:space-between;gap:10px;margin-top:16px}
.rg__nav .btn{flex:1}
.rg__note{display:flex;align-items:center;gap:8px;margin:10px 0 0;font-size:.78rem;color:var(--ta-muted)}
.rg__reject{display:flex;gap:8px;align-items:center;font-size:.82rem;color:var(--ta-muted);cursor:pointer;margin-top:12px}
.rg__trial{display:flex;align-items:center;gap:8px;justify-content:center;margin:10px 0 0;font-size:.8rem;color:var(--ta-brand);font-weight:600}
.rg__login{margin:14px 0 0;text-align:center;font-size:.85rem;color:var(--ta-muted)}
.rg__login a{font-weight:600}
.btn--ghost{background:transparent;border:1px solid var(--ta-line);color:var(--ta-muted)}
@media (max-width:560px){.rg__row{grid-template-columns:1fr}.rg__plans{grid-template-columns:1fr}.rg__plan__feats{grid-template-columns:1fr}}
</style>

<!-- La tarjeta del AuthShell mide 380px; el wizard con 3 columnas de planes necesita mas aire. -->
<style>
/* Solo el grid de planes rompe al ancho completo del panel auth. */
/* Paso 1 (cuenta) y paso 3 (tarjeta) tambien aprovechan el ancho del panel auth. */
.auth__card:has(.rg__root){width:min(100%,660px)}
</style>