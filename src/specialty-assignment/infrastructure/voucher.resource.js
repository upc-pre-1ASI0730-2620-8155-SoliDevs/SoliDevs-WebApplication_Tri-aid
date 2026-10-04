/**
 * Resource traveling to/from the /vouchers endpoint.
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
