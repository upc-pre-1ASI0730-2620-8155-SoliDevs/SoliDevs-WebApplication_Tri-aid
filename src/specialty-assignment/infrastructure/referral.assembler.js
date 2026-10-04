/**
 * Traduce entre el resource plano del backend falso y la entidad de dominio Referral.
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
