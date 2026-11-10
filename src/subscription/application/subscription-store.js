import { reactive, markRaw } from 'vue'
import { SubscriptionService } from '../infrastructure/subscription.service.js'
import { session } from '../../shared/application/demo-session.js'

/**
 * Reactive state of the Subscription bounded context. Centralizes the
 * plans catalog and the current institution subscription so any view
 * can consume them without refetching.
 */
export const subscriptionStore = reactive({
    plans: [],
    subscription: null,
    loaded: false,
    loading: false,
    trialJustCharged: false,

    service: markRaw(new SubscriptionService()),

    async load({ force = false } = {}) {
        if (this.loaded && !force) return
        this.loading = true
        try {
            const [plans, subscription] = await Promise.all([
                this.service.getPlans(),
                this.service.getSubscription(session.institution)
            ])
            this.plans = plans.data
            if (subscription.data) {
                const settled = await this.service.autoChargeTrialEnd(subscription.data)
                this.subscription = settled.data
                this.trialJustCharged = settled.charged
            } else {
                this.subscription = null
            }
            this.loaded = true
        } finally {
            this.loading = false
        }
    },

    /** Replaces the local subscription after a gateway operation. */
    setSubscription(subscription) {
        this.subscription = subscription
        this.loaded = true
    },

    /**
     * Seat usage against the contracted plan (maxUsers; 0 = unlimited).
     * @param {number} used - Accounts of the institution.
     * @returns {{limit:number, used:number, unlimited:boolean, nearLimit:boolean, atLimit:boolean}}
     */
    seatInfo(used = 0) {
        const limit = this.subscription?.status === 'active' || this.subscription?.status === 'trial'
            ? (currentPlanLimit(this) ?? 0)
            : 0
        const unlimited = !limit
        return {
            limit,
            used,
            unlimited,
            nearLimit: !unlimited && used >= Math.ceil(limit * 0.8),
            atLimit: !unlimited && used >= limit
        }
    }
})

/** Seat limit of the contracted plan (maxUsers); null when unknown. */
function currentPlanLimit(store) {
    const plan = store.plans.find(p => p.id === store.subscription?.planId)
    return plan ? plan.maxUsers : null
}
