<script setup>
/** Digital referral voucher: QR, destination details and SMS delivery. */
import { ref, watch, computed } from 'vue'
import QRCode from 'qrcode'
import { useModalMotion } from '../../../shared/application/use-modal-motion.js'
import { t } from '../../../shared/application/i18n.js'

const props = defineProps({
    voucher: { type: Object, required: true },   // { qrCode, channel, sentAt }
    referral: { type: Object, required: true },  // { specialty, room, queuePosition }
    patientName: { type: String, required: true },
    episodeId: { type: String, required: true },
    level: { type: Object, default: null }       // { code, name }
})
const emit = defineEmits(['close', 'send'])
const { card, backdrop, close } = useModalMotion(() => emit('close'))

// Real, scannable QR carrying the voucher payload (the same code the admission
// desk scanner resolves). Rendered as SVG so it prints crisp.
const qrSvg = ref('')
watch(() => props.voucher?.qrCode, async code => {
    qrSvg.value = code ? await QRCode.toString(code, { type: 'svg', margin: 0, color: { dark: '#0a2118', light: '#ffffff' } }) : ''
}, { immediate: true })

async function downloadQr() {
    if (!props.voucher?.qrCode) return
    const url = await QRCode.toDataURL(props.voucher.qrCode, { margin: 2, width: 640, color: { dark: '#0a2118', light: '#ffffff' } })
    const a = document.createElement('a')
    a.href = url
    a.download = `triaid-comprobante-${props.voucher.qrCode.split('|')[1] || ''}.png`
    a.click()
}
</script>

<template>
    <div ref="backdrop" class="vd-overlay" @click.self="close">
        <div ref="card" class="ta-card vd-modal">
            <span class="vd-kicker">{{ t('referral.voucherKicker') }}</span>
            <h3 class="ta-h">{{ t('referral.voucherTitle') }}</h3>

            <div class="vd-qr" v-html="qrSvg"></div>
            <code class="vd-code">EP-{{ String(voucher.episodeId || '').padStart(4, '0') }}</code>

            <dl class="vd-dl">
                <div><dt>{{ t('referral.vPatient') }}</dt><dd>{{ patientName }}</dd></div>
                <div><dt>{{ t('referral.vEpisode') }}</dt><dd>{{ episodeId }}</dd></div>
                <div><dt>{{ t('referral.vSpecialty') }}</dt><dd>{{ referral.specialty }}</dd></div>
                <div><dt>{{ t('referral.vRoom') }}</dt><dd>{{ referral.room }}</dd></div>
                <div v-if="level"><dt>{{ t('referral.vPriority') }}</dt><dd>{{ level.code }} · {{ t('triage.level.' + level.code + '.name') }}</dd></div>
                <div><dt>{{ t('referral.vQueue') }}</dt><dd>#{{ referral.queuePosition }}</dd></div>
            </dl>

            <div class="vd-actions">
                <button class="ta-btn ta-btn--ghost" type="button" @click="downloadQr">
                    <i class="pi pi-download"></i>{{ t('referral.downloadQr') }}
                </button>
                <button class="ta-btn" @click="close()"><i class="pi pi-check"></i>{{ t('referral.done') }}</button>
            </div>
        </div>
    </div>
</template>

<style scoped>
.vd-overlay{position:fixed;inset:0;background:rgba(8,20,14,.45);display:grid;place-items:center;z-index:40;padding:20px}
.vd-modal{width:min(480px,100%);display:grid;gap:10px}
.vd-kicker{font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--ta-brand);font-weight:700}
.vd-qr{width:180px;height:180px;padding:10px;background:#fff;border:1px solid var(--ta-line);border-radius:10px}
.vd-qr :deep(svg){width:100%;height:100%;display:block}
.vd-code{font-family:var(--ta-mono);font-size:10.5px;color:var(--ta-text);background:#f2f6f4;border:1px solid var(--ta-line);border-radius:8px;padding:6px 10px;word-break:break-all;text-decoration:none}
.vd-dl{display:grid;grid-template-columns:1fr 1fr;gap:12px 20px;margin:4px 0 0}
@media(max-width:600px){.vd-dl{grid-template-columns:1fr}}
.vd-dl div{display:grid;gap:3px}
.vd-dl dt{font-size:11px;color:var(--ta-muted)}
.vd-dl dd{margin:0;font-size:13px;font-weight:500}
.vd-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:6px}
</style>
