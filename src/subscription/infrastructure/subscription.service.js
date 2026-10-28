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

    /** Current institution subscription, or null when not contracted yet. */
    async getSubscription() {
        const response = await this.api.getSubscriptions()
        const [first] = response.data || []
        return { data: first ? new Subscription(first) : null }
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
            // El reintento regulariza el ciclo vencido: la renovacion avanza.
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
