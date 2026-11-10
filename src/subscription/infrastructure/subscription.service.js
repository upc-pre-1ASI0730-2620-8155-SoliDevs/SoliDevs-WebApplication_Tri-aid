import { Plan } from '../domain/model/plan.entity.js'
import { Subscription } from '../domain/model/subscription.entity.js'
import { SubscriptionApi } from './subscription-api.js'

const delay = (ms = 400) => new Promise(r => setTimeout(r, ms))

/**
 * Service of the Subscription bounded context. Loads the plans catalog
 * and the institution subscription, and simulates the payment gateway
 * for activation, retry and renewal flows (US04, US51, US52).
 */
export class SubscriptionService {
    constructor() {
        this.api = new SubscriptionApi()
    }

    /** Plans catalog ordered by price. */
    async getPlans() {
        const response = await this.api.getPlans()
        const list = (response.data || [])
            .map(p => new Plan(p))
            .sort((a, b) => a.monthlyPrice - b.monthlyPrice)
        return { data: list }
    }

    /** Subscription of the given institution, or null when not contracted. */
    async getSubscription(institution = null) {
        const response = await this.api.getSubscriptions()
        const list = response.data || []
        const match = institution
            ? list.find(s => String(s.institution).toLowerCase() === String(institution).toLowerCase())
            : list[0]
        return { data: match ? new Subscription(match) : null }
    }

    /**
     * Starts the 14-day card-required trial for a freshly registered
     * institution (onboarding). The card is validated at signup and kept
     * on file (masked) for the automatic charge when the trial ends.
     * @param {string} institution - Institution name.
     * @param {string} [planId] - Plan the institution selected.
     * @param {string} [method] - Masked payment method on file.
     * @returns {Promise<{ok: true, data: Subscription}>}
     */
    async startTrial(institution, planId = null, method = '') {
        const trialEnds = new Date()
        trialEnds.setDate(trialEnds.getDate() + 14)
        const draft = new Subscription({
            institution,
            planId,
            billingCycle: 'monthly',
            status: 'trial',
            startedAt: new Date().toISOString(),
            trialEndsAt: trialEnds.toISOString(),
            paymentMethod: method
        })
        const response = await this.api.createSubscription({ ...draft })
        return { ok: true, data: new Subscription(response.data) }
    }

    /**
     * Automatic charge when the trial window ends (card-required trial).
     * With a card on file the charge converts the trial to an active
     * subscription; without one it simply lapses to overdue so the
     * existing blocking flow takes over.
     * Backend swap note: with the .NET API this runs as a scheduled job
     * server-side; the UI only shows the resulting state.
     * @param {Subscription} subscription
     * @returns {Promise<{ok: true, charged: boolean, data: Subscription}>}
     */
    async autoChargeTrialEnd(subscription) {
        const sub = new Subscription({ ...subscription })
        if (!sub.isTrialExpired) return { ok: true, charged: false, data: sub }
        if (!sub.paymentMethod) return { ok: true, charged: false, data: sub }
        await delay()
        const amount = sub.payments.length
            ? sub.payments[sub.payments.length - 1].amount
            : 0
        sub.addPayment({ amount, status: 'paid', method: sub.paymentMethod })
        sub.status = 'active'
        const renewal = new Date(`${sub.trialEndDate}T12:00:00`)
        if (sub.billingCycle === 'annual') renewal.setFullYear(renewal.getFullYear() + 1)
        else renewal.setMonth(renewal.getMonth() + 1)
        sub.renewalDate = renewal.toISOString().slice(0, 10)
        const response = await this.api.updateSubscription(sub.id, { ...sub })
        return { ok: true, charged: true, data: new Subscription(response.data) }
    }

    /**
     * Simulated payment gateway (US51). On success the subscription is
     * created active with its renewal date and the charge registered;
     * on rejection it stays pending awaiting a retry.
     * @param {Object} input
     * @param {Plan} input.plan - Selected plan.
     * @param {string} input.billingCycle - 'monthly' | 'annual'.
     * @param {string} input.institution - Institution name.
     * @param {string} [input.method] - Masked payment method.
     * @param {boolean} [input.simulateReject] - Forces the gateway rejection.
     */
    async activate({ plan, billingCycle, institution, method = '', simulateReject = false }) {
        await delay()
        const now = new Date().toISOString()
        const renewal = new Date()
        if (billingCycle === 'annual') renewal.setFullYear(renewal.getFullYear() + 1)
        else renewal.setMonth(renewal.getMonth() + 1)

        const draft = new Subscription({
            institution,
            planId: plan.id,
            billingCycle,
            status: 'pending',
            startedAt: now,
            renewalDate: renewal.toISOString().slice(0, 10)
        })
        const payment = draft.addPayment({
            amount: plan.priceFor(billingCycle),
            status: simulateReject ? 'rejected' : 'paid',
            method: method || 'Visa •••• 4242'
        })
        if (!simulateReject) draft.status = 'active'

        const response = await this.api.createSubscription({ ...draft })
        return { ok: true, rejected: simulateReject, payment, data: new Subscription(response.data) }
    }

    /**
     * Retries the pending charge (US51 - Escenario 2). A confirmed retry
     * activates the subscription; a new rejection keeps it pending.
     */
    async retryPayment(subscription, { simulateReject = false, method = '' } = {}) {
        await delay()
        const sub = new Subscription({ ...subscription })
        const amount = sub.payments.length ? sub.payments[sub.payments.length - 1].amount : 0
        sub.addPayment({ amount, status: simulateReject ? 'rejected' : 'paid', method: method || 'Visa •••• 4242' })
        if (!simulateReject) {
            sub.status = 'active'
            sub.renewalDate = sub.nextRenewalDate
        }
        const response = await this.api.updateSubscription(sub.id, { ...sub })
        return { ok: true, rejected: simulateReject, data: new Subscription(response.data) }
    }

    /**
     * Runs the renewal charge for a new cycle (US52 - Escenario 1).
     * A confirmed charge extends the renewal date and registers the
     * payment; a failed one leaves the subscription pending.
     */
    async renew(subscription, { simulateReject = false, method = '' } = {}) {
        await delay()
        const sub = new Subscription({ ...subscription })
        const amount = sub.payments.length ? sub.payments[sub.payments.length - 1].amount : 0
        sub.addPayment({ amount, status: simulateReject ? 'rejected' : 'paid', method: method || 'Visa •••• 4242' })
        if (simulateReject) {
            sub.status = 'pending'
        } else {
            sub.status = 'active'
            sub.renewalDate = sub.nextRenewalDate
        }
        const response = await this.api.updateSubscription(sub.id, { ...sub })
        return { ok: true, rejected: simulateReject, data: new Subscription(response.data) }
    }
}
