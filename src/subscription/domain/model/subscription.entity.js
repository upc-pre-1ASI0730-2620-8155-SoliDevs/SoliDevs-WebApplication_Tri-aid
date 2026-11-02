/**
 * Subscription of the Subscription bounded context.
 * Tracks the institution's contract state, its billing cycle, renewal
 * date, payment history and the derived display state.
 *
 * Derived states (computed, never persisted):
 *  - 'active'  : payments up to date.
 *  - 'pending' : a charge failed and the grace period is still running.
 *  - 'overdue' : the charge failed and the grace period has expired
 *                (displayed as "Vencida" in the UI).
 */
export class Subscription {
    static CYCLES = { monthly: 'monthly', annual: 'annual' }

    constructor({
        id = null,
        institution = '',
        planId = null,
        billingCycle = 'monthly',
        status = 'pending',
        trialEndsAt = null,
        startedAt = null,
        renewalDate = null,
        graceDays = 7,
        payments = []
    } = {}) {
        this.id = id
        this.institution = institution
        this.planId = planId
        this.billingCycle = billingCycle
        this.status = ['active', 'pending', 'trial'].includes(status) ? status : 'pending'
        this.trialEndsAt = trialEndsAt
        this.startedAt = startedAt
        this.renewalDate = renewalDate
        this.graceDays = Number(graceDays) || 7
        this.payments = Array.isArray(payments) ? payments : []
    }

    /** Adds a payment record to the history. */
    addPayment({ amount, currency = 'PEN', status = 'paid', method = '' }) {
        const payment = {
            id: `pay-${Date.now()}`,
            amount: Number(amount),
            currency,
            status,
            method,
            paidAt: new Date().toISOString()
        }
        this.payments = [...this.payments, payment]
        return payment
    }

    /** Whether the grace period after a failed renewal already expired. */
    get isGraceExpired() {
        if (!this.renewalDate) return false
        const limit = new Date(`${this.renewalDate}T23:59:59`)
        limit.setDate(limit.getDate() + this.graceDays)
        return new Date() > limit
    }

    /**
     * Display state: 'trial' (free evaluation window), 'active',
     * 'pending' (inside the grace window) or 'overdue' (grace expired
     * without regularizing the payment, or trial lapsed).
     */
    get state() {
        if (this.status === 'active') return 'active'
        if (this.status === 'trial') {
            const end = this.trialEndsAt ? new Date(this.trialEndsAt) : null
            return end && new Date() <= end ? 'trial' : 'overdue'
        }
        return this.isGraceExpired ? 'overdue' : 'pending'
    }

    /** Days remaining in the trial window (0 when already lapsed). */
    get trialDaysLeft() {
        if (this.status !== 'trial' || !this.trialEndsAt) return 0
        const ms = new Date(this.trialEndsAt) - new Date()
        return Math.max(0, Math.ceil(ms / 86400000))
    }

    /** Date the renewal will land on after one more cycle. */
    get nextRenewalDate() {
        if (!this.renewalDate) return null
        const next = new Date(`${this.renewalDate}T12:00:00`)
        if (this.billingCycle === 'annual') next.setFullYear(next.getFullYear() + 1)
        else next.setMonth(next.getMonth() + 1)
        return next.toISOString().slice(0, 10)
    }
}
