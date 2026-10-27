<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { subscriptionStore } from '../../application/subscription-store.js'
import { Plan } from '../../domain/model/plan.entity.js'
import { notify } from '../../../shared/application/toast-store.js'

const { t, locale } = useI18n()
const busy = ref(false)

// Ciclo de facturacion seleccionado (US04 - Escenario 2).
const cycle = ref('monthly')

// Modal de pago (US51).
const checkout = ref(null)        // { plan }
const institution = ref('')
const cardNumber = ref('')
const simulateReject = ref(false)
const lastOperation = ref(null)   // feedback bajo el card de estado

const state = computed(() => subscriptionStore.subscription?.state ?? null)
const subscription = computed(() => subscriptionStore.subscription)
const currentPlan = computed(() =>
    subscriptionStore.plans.find(p => p.id === subscription.value?.planId) || null
)

const money = n => new Intl.NumberFormat(locale.value === 'en' ? 'en-US' : 'es-PE',
    { style: 'currency', currency: 'PEN', maximumFractionDigits: 0 }).format(n)
const fmtDate = d => d ? new Date(`${d}T12:00:00`).toLocaleDateString(locale.value === 'en' ? 'en-US' : 'es-PE',
    { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
const fmtDateTime = iso => iso ? new Date(iso).toLocaleString(locale.value === 'en' ? 'en-US' : 'es-PE',
    { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'

onMounted(() => { subscriptionStore.load() })

function openCheckout(plan) {
    checkout.value = { plan: new Plan(plan) }
    simulateReject.value = false
}

function closeCheckout() {
    checkout.value = null
    cardNumber.value = ''
}

async function run(action) {
    busy.value = true
    try {
        const result = await action()
        subscriptionStore.setSubscription(result.data)
        lastOperation.value = result.rejected ? 'rejected' : 'confirmed'
        notify({ type: result.rejected ? 'error' : 'success',
                 message: t(result.rejected ? 'subscription.toastRejected' : 'subscription.toastConfirmed') })
        closeCheckout()
    } catch (e) {
        console.error('Subscription operation failed:', e)
        notify({ type: 'error', message: t('subscription.toastError') })
    } finally {
        busy.value = false
    }
}

const activate = () => run(() => subscriptionStore.service.activate({
    plan: checkout.value.plan,
    billingCycle: cycle.value,
    institution: institution.value.trim() || t('subscription.defaultInstitution'),
    method: maskedCard(),
    simulateReject: simulateReject.value
}))
const retry = () => run(() => subscriptionStore.service.retryPayment(subscription.value, { simulateReject: simulateReject.value }))
const renew = () => run(() => subscriptionStore.service.renew(subscription.value, { simulateReject: false }))

function maskedCard() {
    const digits = (cardNumber.value || '').replace(/\D/g, '')
    return digits.length >= 4 ? `Visa •••• ${digits.slice(-4)}` : 'Visa •••• 4242'
}
</script>

<template>
  <div class="ta-page sub">
    <!-- Cabecera de la seccion: titulo + ciclo de facturacion -->
    <section class="ta-card sub-head">
      <div>
        <h3 class="ta-h">{{ t('subscription.title') }}</h3>
        <p class="ta-sub">{{ t('subscription.sub') }}</p>
      </div>
      <div class="sub-cycle" role="tablist">
        <button :class="{ on: cycle === 'monthly' }" @click="cycle = 'monthly'">{{ t('subscription.cycle_monthly') }}</button>
        <button :class="{ on: cycle === 'annual' }" @click="cycle = 'annual'">
          {{ t('subscription.cycle_annual') }}
          <em>{{ t('subscription.annualSaving') }}</em>
        </button>
      </div>
    </section>

    <!-- Mi suscripcion (US51 / US52) -->
    <section class="ta-card sub-status" :class="`sub-status--${state ?? 'none'}`">
      <div class="sub-status__info">
        <h3 class="ta-h">{{ t('subscription.mine') }}</h3>
        <p class="ta-sub">{{ t('subscription.mineSub') }}</p>

        <div v-if="subscription" class="sub-facts">
          <div class="sub-fact"><span>{{ t('subscription.fPlan') }}</span><b>{{ currentPlan?.name || '—' }}</b></div>
          <div class="sub-fact"><span>{{ t('subscription.fCycle') }}</span><b>{{ t(`subscription.cycle_${subscription.billingCycle}`) }}</b></div>
          <div class="sub-fact"><span>{{ t('subscription.fRenewal') }}</span><b>{{ fmtDate(subscription.renewalDate) }}</b></div>
          <div class="sub-fact"><span>{{ t('subscription.fInstitution') }}</span><b>{{ subscription.institution }}</b></div>
        </div>

        <p v-else class="ta-sub sub-none">{{ t('subscription.noSub') }}</p>

        <p v-if="lastOperation === 'rejected'" class="ta-err">{{ t('subscription.rejectedNote') }}</p>
      </div>

      <div class="sub-status__side">
        <span v-if="subscription" class="sub-badge" :class="`sub-badge--${state}`">
          {{ t(`subscription.state_${state}`) }}
        </span>

        <div v-if="subscription" class="sub-actions">
          <button v-if="state === 'pending' || state === 'overdue'" class="ta-btn" :disabled="busy" @click="retry">
            {{ t('subscription.retryPayment') }}
          </button>
          <button v-else class="ta-btn ta-btn--ghost" :disabled="busy" @click="renew">
            {{ t('subscription.simulateRenewal') }}
          </button>
        </div>
        <p v-if="state === 'overdue'" class="sub-overdue-note">{{ t('subscription.overdueNote', { days: subscription.graceDays }) }}</p>
        <p v-if="state === 'pending'" class="sub-pending-note">{{ t('subscription.pendingNote', { days: subscription.graceDays }) }}</p>
      </div>
    </section>

    <!-- Planes (US04) -->
    <section class="sub-plans">
      <article v-for="p in subscriptionStore.plans" :key="p.id" class="ta-card sub-plan"
               :class="{ 'sub-plan--current': subscription?.planId === p.id && subscription?.status === 'active' }">
        <header>
          <h4>{{ p.name }}</h4>
          <span v-if="subscription?.planId === p.id && subscription?.status === 'active'" class="sub-plan__tag">{{ t('subscription.currentPlan') }}</span>
        </header>
        <p class="sub-plan__price">
          <b>{{ money(p.priceFor(cycle)) }}</b>
          <span>/ {{ t(cycle === 'annual' ? 'subscription.perYear' : 'subscription.perMonth') }}</span>
        </p>
        <p v-if="cycle === 'annual' && p.annualDiscount" class="sub-plan__save">{{ t('subscription.save', { pct: p.annualDiscount }) }}</p>
        <ul class="sub-plan__features">
          <li v-for="f in p.features" :key="f">{{ f }}</li>
        </ul>
        <button class="ta-btn sub-plan__cta"
                :disabled="busy || (subscription?.planId === p.id && subscription?.status === 'active')"
                @click="openCheckout(p)">
          {{ t('subscription.contract') }}
        </button>
      </article>
    </section>

    <!-- Historial de pagos (US52) -->
    <section v-if="subscription?.payments?.length" class="ta-card sub-history">
      <h3 class="ta-h">{{ t('subscription.history') }}</h3>
      <div class="sub-twrap">
        <table class="sub-table">
          <thead>
            <tr>
              <th>{{ t('subscription.thDate') }}</th>
              <th>{{ t('subscription.thConcept') }}</th>
              <th>{{ t('subscription.thMethod') }}</th>
              <th>{{ t('subscription.thAmount') }}</th>
              <th>{{ t('subscription.thStatus') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="pay in [...subscription.payments].reverse()" :key="pay.id">
              <td>{{ fmtDateTime(pay.paidAt) }}</td>
              <td>{{ t('subscription.concept', { plan: currentPlan?.name ?? '—', cycle: t(`subscription.cycle_${subscription.billingCycle}`) }) }}</td>
              <td>{{ pay.method }}</td>
              <td>{{ money(pay.amount) }}</td>
              <td><span class="sub-pill" :class="pay.status === 'paid' ? 'sub-pill--ok' : 'sub-pill--bad'">
                {{ t(pay.status === 'paid' ? 'subscription.payPaid' : 'subscription.payRejected') }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Modal de pago simulado (US51) -->
    <div v-if="checkout" class="sub-modal" @click.self="!busy && closeCheckout()">
      <div class="ta-card sub-modal__card">
        <h3 class="ta-h">{{ t('subscription.checkoutTitle', { plan: checkout.plan.name }) }}</h3>
        <p class="ta-sub">{{ t('subscription.checkoutSub', { amount: money(checkout.plan.priceFor(cycle)) }) }}</p>

        <label class="sub-field">
          <span>{{ t('subscription.institution') }}</span>
          <input v-model="institution" class="ta-input" :placeholder="t('subscription.defaultInstitution')" />
        </label>
        <label class="sub-field">
          <span>{{ t('subscription.card') }}</span>
          <input v-model="cardNumber" class="ta-input" inputmode="numeric" placeholder="4242 4242 4242 4242" maxlength="19" />
        </label>

        <label class="sub-reject">
          <input v-model="simulateReject" type="checkbox" />
          <span>{{ t('subscription.simulateReject') }}</span>
        </label>

        <div class="sub-modal__actions">
          <button class="ta-btn ta-btn--ghost" :disabled="busy" @click="closeCheckout">{{ t('subscription.cancel') }}</button>
          <button class="ta-btn" :disabled="busy" @click="activate">
            {{ busy ? t('subscription.processing') : t('subscription.pay', { amount: money(checkout.plan.priceFor(cycle)) }) }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sub{display:flex;flex-direction:column;gap:18px}
.sub-head{display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap}
.sub-cycle{display:flex;border:1px solid var(--ta-line);border-radius:10px;overflow:hidden;background:var(--ta-surface)}
.sub-cycle button{border:0;background:transparent;padding:9px 18px;cursor:pointer;font:inherit;font-size:.85rem;color:var(--ta-muted);display:flex;gap:8px;align-items:center}
.sub-cycle button.on{background:var(--ta-brand);color:#fff}
.sub-cycle em{font-style:normal;font-size:.68rem;background:#e3f6ea;color:var(--ta-brand);border-radius:999px;padding:2px 8px}
.sub-cycle button.on em{background:rgba(255,255,255,.2);color:#fff}
.sub-status{display:flex;justify-content:space-between;gap:24px;border-left:4px solid var(--ta-line)}
.sub-status--active{border-left-color:var(--ta-accent)}
.sub-status--pending{border-left-color:#e0a83c}
.sub-status--overdue{border-left-color:var(--ta-danger)}
.sub-status__info{flex:1;min-width:0}
.sub-facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px 20px;margin-top:14px}
.sub-fact span{display:block;font-size:.75rem;color:var(--ta-muted)}
.sub-fact b{font-size:.95rem}
.sub-none{margin-top:10px}
.sub-status__side{display:flex;flex-direction:column;align-items:flex-end;gap:10px}
.sub-badge{padding:6px 14px;border-radius:999px;font-size:.8rem;font-weight:600;white-space:nowrap}
.sub-badge--active{background:#e3f6ea;color:var(--ta-brand)}
.sub-badge--pending{background:#fdf4e0;color:#9a6d10}
.sub-badge--overdue{background:var(--ta-danger-bg);color:var(--ta-danger)}
.sub-overdue-note,.sub-pending-note{font-size:.78rem;color:var(--ta-muted);max-width:230px;text-align:right}
.sub-plans{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:16px}
.sub-plan{display:flex;flex-direction:column;gap:10px;padding:22px}
.sub-plan--current{outline:2px solid var(--ta-accent)}
.sub-plan header{display:flex;justify-content:space-between;align-items:center}
.sub-plan h4{margin:0;font-size:1.05rem}
.sub-plan__tag{font-size:.68rem;background:#e3f6ea;color:var(--ta-brand);border-radius:999px;padding:3px 10px;font-weight:600}
.sub-plan__price b{font-size:1.7rem;font-family:var(--ta-mono)}
.sub-plan__price span{color:var(--ta-muted);font-size:.85rem}
.sub-plan__save{font-size:.78rem;color:var(--ta-brand);font-weight:600;margin:-4px 0 0}
.sub-plan__features{list-style:none;margin:0;padding:0;flex:1;display:flex;flex-direction:column;gap:7px}
.sub-plan__features li{font-size:.85rem;color:var(--ta-text);padding-left:18px;position:relative}
.sub-plan__features li::before{content:'✓';position:absolute;left:0;color:var(--ta-accent);font-weight:700}
.sub-plan__cta{justify-content:center}
.sub-history{margin-top:4px}
.sub-twrap{overflow-x:auto;margin-top:12px}
.sub-table{width:100%;border-collapse:collapse;font-size:.85rem}
.sub-table th{text-align:left;padding:10px 12px;color:var(--ta-muted);font-weight:600;border-bottom:2px solid var(--ta-line);white-space:nowrap}
.sub-table td{padding:10px 12px;border-bottom:1px solid var(--ta-line);white-space:nowrap}
.sub-pill{padding:3px 10px;border-radius:999px;font-size:.72rem;font-weight:600}
.sub-pill--ok{background:#e3f6ea;color:var(--ta-brand)}
.sub-pill--bad{background:var(--ta-danger-bg);color:var(--ta-danger)}
.sub-modal{position:fixed;inset:0;background:rgba(10,33,24,.45);display:flex;align-items:center;justify-content:center;z-index:60;padding:20px}
.sub-modal__card{width:min(430px,100%);display:flex;flex-direction:column;gap:14px}
.sub-field{display:flex;flex-direction:column;gap:6px}
.sub-field span{font-size:.8rem;color:var(--ta-muted);font-weight:600}
.sub-reject{display:flex;gap:8px;align-items:center;font-size:.82rem;color:var(--ta-muted);cursor:pointer}
.sub-modal__actions{display:flex;justify-content:flex-end;gap:10px;margin-top:4px}
@media (max-width:640px){
  .sub-status{flex-direction:column}
  .sub-status__side{align-items:flex-start}
  .sub-overdue-note,.sub-pending-note{text-align:left}
}
</style>
