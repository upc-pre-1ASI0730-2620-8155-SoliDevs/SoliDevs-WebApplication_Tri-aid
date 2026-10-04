/**
 * Translates between the flat fake-backend resource and the Voucher domain entity.
 */
import { Voucher } from '../domain/model/voucher.entity.js'
import { VoucherResource } from './voucher.resource.js'

export class VoucherAssembler {
    static toEntity(resource) {
        if (!resource) return null
        return new Voucher({ ...resource })
    }

    static toResource(entity) {
        return new VoucherResource({ ...entity })
    }
}
