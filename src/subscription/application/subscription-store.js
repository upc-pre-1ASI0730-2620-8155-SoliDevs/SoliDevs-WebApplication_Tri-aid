import { reactive, markRaw } from 'vue'
import { SubscriptionService } from '../infrastructure/subscription.service.js'

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

    service: markRaw(new SubscriptionService()),

    async load({ force = false } = {}) {
        if (this.loaded && !force) return
        this.loading = true
        try {
            const [plans, subscription] = await Promise.all([
                this.service.getPlans(),
                this.service.getSubscription()
            ])
            this.plans = plans.data
            this.subscription = subscription.data
            this.loaded = true
        } finally {
            this.loading = false
        }
    },

    /** Replaces the local subscription after a gateway operation. */
    setSubscription(subscription) {
        this.subscription = subscription
        this.loaded = true
    }
})
