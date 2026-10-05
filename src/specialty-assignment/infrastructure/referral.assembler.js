/**
 * Translates between the flat fake-backend resource and the Referral domain entity.
 */
import { Referral } from '../domain/model/referral.entity.js'
import { ReferralResource } from './referral.resource.js'

export class ReferralAssembler {
    static toEntity(resource) {
        if (!resource) return null
        return new Referral({ ...resource })
    }

    static toResource(entity) {
        return new ReferralResource({ ...entity })
    }
}
