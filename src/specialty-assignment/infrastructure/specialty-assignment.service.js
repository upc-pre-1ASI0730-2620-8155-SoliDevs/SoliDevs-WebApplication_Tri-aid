/**
 * Service of the Specialty Assignment bounded context.
 * Mirrors IReferralService from the report: SuggestSpecialty, Refer,
 * ChangeSpecialty, GenerateVoucher and SendVoucher. Persists against
 * the fake backend (json-server) through SpecialtyAssignmentApi.
 */
import { Referral, ReferralState } from '../domain/model/referral.entity.js'
import { Voucher, DeliveryChannel } from '../domain/model/voucher.entity.js'
import { specialtyRules } from '../domain/services/specialty-rules.js'
import { SpecialtyAssignmentApi } from './specialty-assignment-api.js'
import { ReferralAssembler } from './referral.assembler.js'
import { VoucherAssembler } from './voucher.assembler.js'

const delay = (ms = 200) => new Promise(r => setTimeout(r, ms))

// Shift room codes, used when assigning a consulting room.
const ROOMS = { MedicinaInterna: 'MI-2', CirugiaGeneral: 'CG-1', Traumatologia: 'TT-3', Ginecologia: 'GI-1', Cardiologia: 'CA-2', Pediatria: 'PD-1', Neurologia: 'NE-1', TraumaShock: 'TS-1' }

export class SpecialtyAssignmentService {
    constructor() {
        this.api = new SpecialtyAssignmentApi()
        this.seq = 0
    }

    /** Coded symptom catalog (CIAP-2-like) served by the fake backend. */
    async getSymptoms() {
        const response = await this.api.getSymptoms()
        return { ok: true, data: response.data || [] }
    }

    /** Main symptom is mandatory. */
    static validateSymptom(symptom) {
        return String(symptom || '').trim() ? { ok: true } : { ok: false, error: 'referral.error.symptomRequired' }
    }

    /** Specialties with their shift queue. */
    async getSpecialties() {
        const response = await this.api.getSpecialties()
        const referrals = (await this.api.getReferrals()).data || []
        const data = (response.data || []).map(s => ({
            ...s,
            waiting: (s.waiting || 0) + referrals.filter(r => r.specialty === s.key && r.state !== 'Attended').length
        }))
        return { ok: true, data }
    }

    /**
     * Resolves the suggested specialty from the coded symptom selected in
     * the catalog. The symptom carries its bound specialty, so the mapping
     * is deterministic; free-text guessing is not used.
     * @param {Object} input - Suggestion input.
     * @param {string} input.symptomId - Coded symptom id (e.g. TRAU-002).
     * @param {string} input.symptom - Symptom label, for storage.
     * @param {string} [input.level] - Classified triage level key.
     * @param {number} [input.age] - Patient age in years.
     * @returns {Promise<{ok: boolean, specialtyKey?: string,
     *   rule?: string, error?: string}>}
     */
    async suggestSpecialty({ symptomId, symptom, level, age }) {
        await delay()
        const v = SpecialtyAssignmentService.validateSymptom(symptom)
        if (!v.ok) return v
        const symptoms = (await this.api.getSymptoms()).data || []
        const entry = symptoms.find(x => String(x.id) === String(symptomId))
        if (!entry) return { ok: false, error: 'referral.error.symptomCatalog' }
        return { ok: true, specialtyKey: entry.specialty, rule: 'coded-catalog' }
    }

    /** Finds the existing referral of the episode. */
    async findByEpisode(episodeId) {
        const response = await this.api.getReferralsByEpisode(episodeId)
        const list = response.data || []
        return ReferralAssembler.toEntity(list[0] || null)
    }

    /**
     * Registra la derivacion y asigna consultorio y posicion en cola.
     * `specialtyRef` es el objeto completo del catalogo (incluye restricciones
     * demographic maxAge/minAge constraints).
     */
    async refer(episodeId, { specialtyRef, symptom }, age = null) {
        await delay(180)
        const specialty = specialtyRef?.key
        if (!specialty) return { ok: false, error: 'referral.error.invalidSpecialty' }
        if (specialtyRules.violatesDemographics(specialtyRef, age)) {
            return { ok: false, error: 'referral.error.demographic' }
        }
        let referral = await this.findByEpisode(episodeId)
        if (referral) {
            referral.symptom = symptom || referral.symptom
            const updated = await this.api.updateReferral(referral.id, ReferralAssembler.toResource(referral))
            return { ok: true, data: ReferralAssembler.toEntity(updated.data) }
        }
        if (!specialtyRef || specialtyRef.id === undefined || specialtyRef.id === null) {
            return { ok: false, error: 'referral.err.catalog' }
        }
        // The API owns the flow: it resolves the room and computes the queue
        // position from the live referrals of that specialty.
        const response = await this.api.referEpisode(episodeId, specialtyRef.id, symptom)
        referral = ReferralAssembler.toEntity(response.data)
        return { ok: true, data: referral }
    }

    /** Reasignacion manual de especialidad con motivo. */
    async changeSpecialty(referralId, { specialty, reason }) {
        await delay(150)
        const referrals = (await this.api.getReferrals()).data || []
        const raw = referrals.find(r => String(r.id) === String(referralId))
        if (!raw) return { ok: false, error: 'referral.error.notFound' }
        const referral = ReferralAssembler.toEntity(raw)
        const r = referral.changeSpecialty(specialty, reason)
        if (!r.ok) return r
        const updated = await this.api.updateReferral(referral.id, ReferralAssembler.toResource(referral))
        return { ok: true, data: ReferralAssembler.toEntity(updated.data) }
    }

    /**
     * Issues the digital voucher of a referral. The API builds the payload from
     * the stored data and seals it: the client never sees readable patient data
     * in the QR, only the opaque token to render.
     */
    async generateVoucher(referral) {
        await delay(150)
        const r = await this.api.issueVoucher(referral.id)
        const voucher = new Voucher({
            id: null,
            referralId: referral.id,
            qrCode: r.data.token,
            channel: DeliveryChannel.QrPortal,
            episodeId: referral.episodeId
        })
        return { ok: true, data: voucher }
    }

    /** Updates the voucher after a clinical re-evaluation. */
    async updateVoucher(voucher) {
        const response = await this.api.updateVoucher(voucher.id, VoucherAssembler.toResource(voucher))
        return { ok: true, data: VoucherAssembler.toEntity(response.data) }
    }

    /** Envia el comprobante por el canal elegido. */
    /**
     * Delivers the voucher through the chosen channel and stamps the sent time.
     * @param {Object} voucher - Voucher entity to send.
     * @param {string} [channel] - Delivery channel ('Sms' | 'QrPortal').
     * @returns {Promise<{ok: true, data: Object}>} The updated voucher.
     */
    async sendVoucher(voucher, channel = DeliveryChannel.QrPortal) {
        await delay(300)
        voucher.channel = channel
        voucher.markSent()
        const updated = voucher.id
            ? await this.api.updateVoucher(voucher.id, VoucherAssembler.toResource(voucher))
            : await this.api.createVoucher(VoucherAssembler.toResource(voucher))
        return { ok: true, data: VoucherAssembler.toEntity(updated.data) }
    }
}
