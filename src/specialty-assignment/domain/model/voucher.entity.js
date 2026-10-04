/** Voucher entity of the Specialty Assignment bounded context (US33). */
export const DeliveryChannel = {
  Sms: 'Sms',
  QrPortal: 'QrPortal'
}

export class Voucher {
  constructor({ id = null, referralId, qrCode, channel = DeliveryChannel.QrPortal, sentAt = null } = {}) {
    this.id = id
    this.referralId = referralId
    this.qrCode = qrCode
    this.channel = channel
    this.sentAt = sentAt
  }

  markSent() {
    this.sentAt = new Date().toISOString()
  }
}

