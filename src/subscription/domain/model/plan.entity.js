/**
 * Plan of the Subscription bounded context.
 * Represents a contracting option of the Tri-Aid platform with its
 * monthly / annual pricing and included capabilities.
 */
export class Plan {
    constructor({
        id = null,
        name = '',
        description = '',
        monthlyPrice = 0,
        annualPrice = 0,
        maxUsers = 0,
        features = []
    } = {}) {
        this.id = id
        this.name = name
        this.description = description
        this.monthlyPrice = Number(monthlyPrice) || 0
        this.annualPrice = Number(annualPrice) || 0
        this.maxUsers = Number(maxUsers) || 0
        this.features = Array.isArray(features) ? features : []
    }

    /** Price for the given billing cycle ('monthly' | 'annual'). */
    priceFor(cycle) {
        return cycle === 'annual' ? this.annualPrice : this.monthlyPrice
    }

    /** Savings percentage of the annual cycle against twelve monthly payments. */
    get annualDiscount() {
        if (!this.monthlyPrice || this.annualPrice >= this.monthlyPrice * 12) return 0
        return Math.round((1 - this.annualPrice / (this.monthlyPrice * 12)) * 100)
    }
}
