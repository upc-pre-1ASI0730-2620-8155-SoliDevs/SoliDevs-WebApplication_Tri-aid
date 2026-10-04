/**
 * Traduce entre el resource plano del backend falso y la entidad de dominio Voucher.
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
