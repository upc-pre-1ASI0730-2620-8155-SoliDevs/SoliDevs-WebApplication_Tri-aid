<script setup>
/**
 * E-mail delivery of a voucher, in two steps that only appear when they apply:
 *  1. the patient has no e-mail on file → ask for one;
 *  2. always → ask whether that address should become the patient's e-mail, then send.
 */
import { ref, computed, onMounted, nextTick } from 'vue'
import { useModalMotion } from '../../../shared/application/use-modal-motion.js'
import { t } from '../../../shared/application/i18n.js'
import { SpecialtyAssignmentService } from '../../infrastructure/specialty-assignment.service.js'
import { notify } from '../../../shared/application/toast-store.js'

const props = defineProps({
  referral: { type: Object, required: true },          // { id }
  patient: { type: Object, required: true }            // { names, surnames, email }
})
const emit = defineEmits(['close', 'sent'])
const service = new SpecialtyAssignmentService()
const { card, backdrop, close } = useModalMotion(() => emit('close'))

const email = ref('')
const error = ref('')
const sending = ref(false)
const needsAddress = computed(() => !props.patient?.email)
// 'address' (only when missing) → 'confirm' → done
const step = ref(needsAddress.value ? 'address' : 'confirm')
const valid = computed(() => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.value.trim()))
const target = computed(() => (needsAddress.value ? email.value.trim() : props.patient.email))
const patientName = computed(() => `${props.patient?.names || ''} ${props.patient?.surnames || ''}`.trim())

function acceptAddress() {
  if (!valid.value) { error.value = t('referral.emailInvalid'); return }
  error.value = ''
  step.value = 'confirm'
}

async function send(attach) {
  sending.value = true
  const r = await service.emailVoucher(props.referral, { email: target.value, attachToPatient: attach })
  sending.value = false
  if (!r.ok) { notify({ type: 'error', title: t(r.error) }); close(); return }
  notify({ type: 'success', title: t('referral.emailSent', { email: target.value }), detail: attach ? t('referral.emailAttached', { name: patientName.value }) : '' })
  emit('sent', { email: target.value, attached: attach })
  close()
}
</script>

<template>
  <div v-if="referral" ref="backdrop" class="ve-overlay" @click.self="close()">
    <div ref="card" class="ta-card ve-modal" role="dialog" aria-modal="true">
      <!-- Step 1: only when the patient has no e-mail -->
      <template v-if="step === 'address'">
        <span class="ve-kicker">{{ t('referral.voucherKicker') }}</span>
        <h3 class="ta-h">{{ t('referral.emailTitle') }}</h3>
        <p class="ta-sub">{{ t('referral.emailPrompt', { name: patientName }) }}</p>
        <label class="ve-label" for="ve-email">{{ t('rg.email') }}</label>
        <input id="ve-email" class="ta-input" type="email" v-model="email" :placeholder="t('referral.emailPlaceholder')" @keyup.enter="acceptAddress" />
        <p v-if="error" class="ve-error"><i class="pi pi-exclamation-circle"></i> {{ error }}</p>
        <div class="ve-actions">
          <button class="ta-btn ta-btn--ghost" type="button" @click="close()">{{ t('referral.cancel') }}</button>
          <button class="ta-btn" type="button" @click="acceptAddress">{{ t('referral.emailAccept') }}</button>
        </div>
      </template>

      <!-- Step 2: whether the address becomes the patient's e-mail, then send -->
      <template v-else>
        <span class="ve-kicker">{{ t('referral.voucherKicker') }}</span>
        <h3 class="ta-h">{{ t('referral.emailTitle') }}</h3>
        <p class="ta-sub">{{ t('referral.emailConfirm', { email: target, name: patientName }) }}</p>
        <div class="ve-box">
          <i class="pi pi-user-edit"></i>
          <div>
            <b>{{ t('referral.emailLinkTitle') }}</b>
            <p>{{ t('referral.emailLinkText', { email: target, name: patientName }) }}</p>
          </div>
        </div>
        <div class="ve-actions">
          <button class="ta-btn ta-btn--ghost" type="button" :disabled="sending" @click="send(false)">{{ t('referral.emailLinkNo') }}</button>
          <button class="ta-btn" type="button" :disabled="sending" @click="send(true)">
            <i class="pi" :class="sending ? 'pi-spin pi-spinner' : 'pi-envelope'"></i>{{ t('referral.emailLinkYes') }}
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.ve-overlay{position:fixed;inset:0;background:rgba(8,20,14,.45);display:grid;place-items:center;z-index:41;padding:20px}
.ve-modal{width:min(460px,100%);display:grid;gap:10px;padding:24px}
.ve-kicker{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--ta-brand);font-weight:600}
.ve-label{font-size:12px;color:var(--ta-muted);margin-top:4px}
.ve-error{margin:0;color:#b42318;font-size:12.5px;display:flex;gap:6px;align-items:center}
.ve-box{display:flex;gap:12px;align-items:flex-start;padding:12px 14px;border:1px solid var(--ta-line);border-radius:12px;background:#fafcfb;font-size:13px}
.ve-box i{color:var(--ta-brand);font-size:18px;margin-top:2px}
.ve-box p{margin:4px 0 0;color:var(--ta-muted);line-height:1.4}
.ve-actions{display:flex;gap:10px;justify-content:flex-end;margin-top:6px}
</style>
