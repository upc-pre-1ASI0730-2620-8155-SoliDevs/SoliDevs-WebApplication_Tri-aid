<script setup>
/** Digital referral voucher: QR, destination details and SMS delivery. */
import { computed } from 'vue'
import { t } from '../../../shared/application/i18n.js'

const props = defineProps({
    voucher: { type: Object, required: true },   // { qrCode, channel, sentAt }
    referral: { type: Object, required: true },  // { specialty, room, queuePosition }
    patientName: { type: String, required: true },
    episodeId: { type: String, required: true },
    level: { type: Object, default: null }       // { code, name }
})
defineEmits(['close', 'send'])

// deterministic pseudo-QR generated from the voucher code (demo)
const blocks = computed(() => {
    let seed = 0
    for (const ch of props.voucher.qrCode) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0
    const out = []
    for (let i = 0; i < 121; i++) {
        seed = (seed * 1103515245 + 12345) >>> 0
        out.push(((seed >> 8) & 1) === 1)
    }
    return out
})
</script>

<template>
    <div class="vd-overlay" @click.self="$emit('close')">
        <div class="ta-card vd-modal">
            <span class="vd-kicker">{{ t('referral.voucherKicker') }}</span>
            <h3 class="ta-h">{{ t('referral.voucherTitle') }}</h3>

            <div class="vd-qr" aria-hidden="true">
                <span v-for="(on, i) in blocks" :key="i" :class="{ on }"></span>
            </div>
            <code class="vd-code">{{ voucher.qrCode }}</code>

            <dl class="vd-dl">
                <div><dt>{{ t('referral.vPatient') }}</dt><dd>{{ patientName }}</dd></div>
                <div><dt>{{ t('referral.vEpisode') }}</dt><dd>{{ episodeId }}</dd></div>
                <div><dt>{{ t('referral.vSpecialty') }}</dt><dd>{{ t('referral.spec.' + referral.specialty) }}</dd></div>
                <div><dt>{{ t('referral.vRoom') }}</dt><dd>{{ referral.room }}</dd></div>
                <div v-if="level"><dt>{{ t('referral.vPriority') }}</dt><dd>{{ level.code }} · {{ level.name }}</dd></div>
                <div><dt>{{ t('referral.vQueue') }}</dt><dd>#{{ referral.queuePosition }}</dd></div>
            </dl>

            <div class="vd-actions">
                <button class="ta-btn ta-btn--ghost" @click="$emit('send', 'Sms')">
                    <i class="pi pi-mobile"></i>{{ t('referral.sendSms') }}
                </button>
                <button class="ta-btn" @click="$emit('close')"><i class="pi pi-check"></i>{{ t('referral.done') }}</button>
            </div>
        </div>
    </div>
</template>

<style scoped>
.vd-overlay{position:fixed;inset:0;background:rgba(8,20,14,.45);display:grid;place-items:center;z-index:40;padding:20px}
.vd-modal{width:min(480px,100%);display:grid;gap:10px}
.vd-kicker{font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--ta-brand);font-weight:700}
.vd-qr{display:grid;grid-template-columns:repeat(11,1fr);gap:2px;width:150px;padding:10px;background:#fff;border:1px solid var(--ta-line);border-radius:10px}
.vd-qr span{aspect-ratio:1;border-radius:1px}
.vd-qr span.on{background:var(--ta-ink)}
.vd-code{font-family:var(--ta-mono);font-size:10.5px;color:var(--ta-muted);word-break:break-all}
.vd-dl{display:grid;grid-template-columns:1fr 1fr;gap:12px 20px;margin:4px 0 0}
.vd-dl div{display:grid;gap:3px}
.vd-dl dt{font-size:11px;color:var(--ta-muted)}
.vd-dl dd{margin:0;font-size:13px;font-weight:500}
.vd-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:6px}
</style>
