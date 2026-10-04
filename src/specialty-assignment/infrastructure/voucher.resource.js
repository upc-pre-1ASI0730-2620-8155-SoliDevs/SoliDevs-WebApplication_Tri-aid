/**
 * Resource que viaja hacia/desde el endpoint /vouchers.
 */
export class VoucherResource {
    constructor({ id, referralId, qrCode, channel, sentAt }) {
        this.id = id
        this.referralId = referralId
        this.qrCode = qrCode
        this.channel = channel
        this.sentAt = sentAt
    }
}
