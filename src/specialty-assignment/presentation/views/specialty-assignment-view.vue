<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { store, findEpisode, ageOf, fmtTime } from '../../../patient-registration/application/patient-store.js'
import { docLabel } from '../../../patient-registration/application/document-types.js'
import { notify } from '../../../shared/application/toast-store.js'
import { t } from '../../../shared/application/i18n.js'
import { levelByCode } from '../../../triage-classification/domain/model/triage-level.js'
import { TriageApi } from '../../../triage-classification/infrastructure/triage-api.js'
import { ClassificationAssembler } from '../../../triage-classification/infrastructure/classification.assembler.js'
import { SpecialtyAssignmentService } from '../../infrastructure/specialty-assignment.service.js'

const route = useRoute()
const router = useRouter()
const service = new SpecialtyAssignmentService()
const triageApi = new TriageApi()

const id = route.params.episode
const ep = computed(() => findEpisode(id))
if (!ep.value) router.replace('/patient-registration')

const p = computed(() => ep.value.patient)
const initials = computed(() => ((p.value.names[0] || '') + (p.value.surnames[0] || '')).toUpperCase())
const fullName = computed(() => `${p.value.surnames}, ${p.value.names}`)
const age = computed(() => ageOf(p.value.birth))
const meta = computed(() => [
  docLabel(p.value),
  `${age.value} ${t('yrs')}`,
  t('pf.arrival', { time: fmtTime(ep.value.arrival) }),
  ep.value.id
].join(' · '))

/* ---------- Prioridad clasificada (del BC Triage Classification) ---------- */
const level = ref(null)
const confirmedAt = ref(null)

onMounted(async () => {
  const response = await triageApi.getClassificationByEpisode(id)
  const c = ClassificationAssembler.toEntity((response.data || [])[0] || null)
  if (c?.level) {
    level.value = levelByCode(c.level.split('_')[0])
    confirmedAt.value = c.confirmedAt ? fmtTime(c.confirmedAt) : null
  }
  await loadQueues()
})

/* ---------- Sintoma y sugerencia (US30) ---------- */
const symptom = ref('')
const suggestion = ref(null)
const specialties = ref([])

const suggestedSpecialty = computed(() => specialties.value.find(s => s.key === suggestion.value) || null)
const selectedSpecialty = computed(() => specialties.value.find(s => s.key === selected.value) || null)
const changed = computed(() => selected.value && selected.value !== suggestion.value)

const selected = ref('')
const symErr = ref(false)
const sugErr = ref('')
const chgReason = ref('')
const chgErr = ref(false)
const consulted = ref(false)

async function consult() {
  symErr.value = false; sugErr.value = ''
  if (!symptom.value.trim()) { symErr.value = true; return }
  const r = await service.suggestSpecialty({ symptom: symptom.value, level: level.value?.key, age: age.value })
  if (!r.ok) { sugErr.value = t(r.error); return }
  suggestion.value = r.specialtyKey
  selected.value = r.specialtyKey
  consulted.value = true
}

/* ---------- Colas por especialidad (US34) ---------- */
const queues = ref([])
async function loadQueues() {
  const r = await service.getSpecialties()
  if (r.ok) { queues.value = r.data; specialties.value = r.data }
}

/* ---------- Derivar (US31, US32) ---------- */
const referring = ref(false)
async function refer() {
  if (!consulted.value) { symErr.value = true; return }
  if (changed.value && !chgReason.value.trim()) { chgErr.value = true; return }
  referring.value = true
  const r = await service.refer(id, {
    specialtyRef: selectedSpecialty.value || suggestedSpecialty.value,
    symptom: symptom.value
  }, age.value)
  referring.value = false
  if (!r.ok) { notify({ type: 'error', title: t(r.error) }); return }
  referral.value = r.data
  await loadQueues()
  await makeVoucher()
}

/* ---------- Comprobante (US33) ---------- */
const referral = ref(null)
const voucher = ref(null)
const showVoucher = ref(false)
const qrBlocks = ref([])

async function makeVoucher() {
  if (!referral.value) return
  const r = await service.generateVoucher(referral.value)
  if (!r.ok) return
  voucher.value = r.data
  // pseudo-QR determinista a partir del codigo del comprobante
  let seed = 0
  for (const ch of voucher.value.qrCode) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0
  const blocks = []
  for (let i = 0; i < 121; i++) {
    seed = (seed * 1103515245 + 12345) >>> 0
    blocks.push(((seed >> 8) & 1) === 1)
  }
  qrBlocks.value = blocks
  showVoucher.value = true
}

async function sendVoucher(channel) {
  if (!voucher.value) return
  const r = await service.sendVoucher(voucher.value, channel)
  if (r.ok) {
    voucher.value = r.data
    notify({ type: 'success', title: t('referral.toast.sent') })
  }
}

function closeVoucher() {
  showVoucher.value = false
  router.push('/patient-registration')
}
</script>

<template>
  <div class="ta-page" v-if="ep">
    <!-- Banner del paciente con su prioridad confirmada -->
    <section class="ta-card rc-head rc-in" style="--d:0">
      <span class="tc-av">{{ initials }}</span>
      <div class="tc-id">
        <div class="fi-name">{{ fullName }}</div>
        <div class="fi-meta">{{ meta }}</div>
      </div>
      <span v-if="level" class="rc-badge" :style="{ borderColor: level.color, color: level.color }">
        {{ level.code }} · {{ t('triage.level.' + level.code + '.name') }}
      </span>
    </section>

    <!-- Sintoma principal y especialidad -->
    <section class="ta-card rc-in" style="--d:1">
      <h3 class="ta-h">{{ t('referral.symptomTitle') }}</h3>
      <p class="ta-sub">{{ t('referral.symptomSub') }}</p>

      <label class="ta-label" for="symptom">{{ t('referral.symptom') }}</label>
      <div class="rc-symrow">
        <input id="symptom" class="ta-input rc-sym" v-model="symptom" :class="{ bad: symErr }" :placeholder="t('referral.symptomPh')" @keyup.enter="consult" />
        <button class="ta-btn" @click="consult"><i class="pi pi-sparkles"></i>{{ t('referral.suggestBtn') }}</button>
      </div>
      <p v-if="symErr" class="ta-err">{{ t('referral.err.symptom') }}</p>

      <div v-if="suggestion" class="rc-sugg">
        <span class="rc-arrow"><i class="pi pi-arrow-right"></i></span>
        <div>
          <small>{{ t('referral.suggested') }}</small>
          <b>{{ t('referral.spec.' + suggestion) }}</b>
        </div>
        <span class="rc-tag"><i class="pi pi-sparkles"></i>{{ t('triage.suggested') }}</span>
      </div>

      <template v-if="consulted">
        <label class="ta-label" for="chg-spec">{{ t('referral.change') }}</label>
        <select id="chg-spec" class="ta-select rc-select" v-model="selected">
          <option :value="suggestion" disabled>{{ t('referral.keepSuggested') }}</option>
          <option v-for="s in specialties" :key="s.key" :value="s.key">{{ s.name }}</option>
        </select>

        <template v-if="changed">
          <label class="ta-label" for="chg-reason">{{ t('referral.changeReason') }}</label>
          <input id="chg-reason" class="ta-input" v-model="chgReason" :class="{ bad: chgErr }" :placeholder="t('referral.changeReasonPh')" />
          <p v-if="chgErr" class="ta-err">{{ t('referral.err.reason') }}</p>
        </template>

        <div class="rc-actions">
          <router-link class="ta-btn ta-btn--ghost" :to="`/patient-registration/${ep.id}`">{{ t('triage.cancel') }}</router-link>
          <button class="ta-btn" :disabled="referring" @click="refer">
            <i class="pi pi-check"></i>{{ t('referral.confirm') }}
          </button>
        </div>
      </template>
    </section>

    <!-- Pacientes en espera por especialidad (US34) -->
    <section class="ta-card rc-in" style="--d:2">
      <h3 class="ta-h">{{ t('referral.queuesTitle') }}</h3>
      <p class="ta-sub">{{ t('referral.queuesSub') }}</p>
      <div class="rc-chips">
        <span v-for="s in queues" :key="s.key" class="rc-chip">{{ s.name }} <b>{{ s.waiting }}</b></span>
      </div>
    </section>

    <!-- Comprobante digital (US33) -->
    <div v-if="showVoucher" class="tc-overlay" @click.self="closeVoucher">
      <div class="ta-card tc-modal rc-voucher">
        <span class="rc-vkicker">{{ t('referral.voucherKicker') }}</span>
        <h3 class="ta-h">{{ t('referral.voucherTitle') }}</h3>

        <div class="rc-qr" aria-hidden="true">
          <span v-for="(on, i) in qrBlocks" :key="i" :class="{ on }"></span>
        </div>
        <code class="rc-qrcode">{{ voucher?.qrCode }}</code>

        <dl class="rc-vdl">
          <div><dt>{{ t('referral.vPatient') }}</dt><dd>{{ fullName }}</dd></div>
          <div><dt>{{ t('referral.vEpisode') }}</dt><dd>{{ ep.id }}</dd></div>
          <div><dt>{{ t('referral.vSpecialty') }}</dt><dd>{{ t('referral.spec.' + referral?.specialty) }}</dd></div>
          <div><dt>{{ t('referral.vRoom') }}</dt><dd>{{ referral?.room }}</dd></div>
          <div v-if="level"><dt>{{ t('referral.vPriority') }}</dt><dd>{{ level.code }} · {{ t('triage.level.' + level.code + '.name') }}</dd></div>
          <div><dt>{{ t('referral.vQueue') }}</dt><dd>#{{ referral?.queuePosition }}</dd></div>
        </dl>

        <div class="tc-modal__actions">
          <button class="ta-btn ta-btn--ghost" @click="sendVoucher('Sms')"><i class="pi pi-mobile"></i>{{ t('referral.sendSms') }}</button>
          <button class="ta-btn" @click="closeVoucher"><i class="pi pi-check"></i>{{ t('referral.done') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.rc-head{display:flex;align-items:center;gap:14px;padding:16px 20px}
.tc-av{width:42px;height:42px;border-radius:50%;background:#e3f3ea;color:var(--ta-brand);display:grid;place-items:center;font-weight:600;flex:none}
.tc-id{display:grid;gap:2px;flex:1;min-width:0}
.fi-name{font-size:14.5px;font-weight:600}
.fi-meta{font-family:var(--ta-mono);font-size:10.5px;color:var(--ta-muted)}
.rc-badge{font-size:11px;padding:4px 10px;border-radius:999px;border:1.5px solid;background:#fff;white-space:nowrap;font-weight:600}
.rc-sym{max-width:420px}
.rc-symrow{display:flex;gap:10px;align-items:flex-start}
.rc-symrow .ta-input{flex:1}
.rc-symrow .ta-btn{white-space:nowrap}
.rc-sugg{display:flex;align-items:center;gap:12px;margin-top:14px;padding:12px 14px;border:1px solid var(--ta-line);border-radius:12px;background:#fff}
.rc-arrow{width:30px;height:30px;border-radius:8px;background:#e3f3ea;color:var(--ta-brand);display:grid;place-items:center;flex:none}
.rc-sugg small{display:block;font-size:10.5px;color:var(--ta-muted)}
.rc-sugg b{font-size:15px}
.rc-tag{margin-left:auto;display:inline-flex;align-items:center;gap:6px;font-size:11px;color:var(--ta-brand);background:#e3f3ea;border-radius:999px;padding:4px 10px;white-space:nowrap}
.rc-select{max-width:420px}
.rc-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:16px}
.rc-chips{display:flex;flex-wrap:wrap;gap:10px;margin-top:12px}
.rc-chip{border:1px solid var(--ta-line);border-radius:999px;padding:6px 14px;font-size:12.5px;background:#fff;display:inline-flex;gap:8px}
.rc-chip b{color:var(--ta-brand)}
.tc-overlay{position:fixed;inset:0;background:rgba(8,20,14,.45);display:grid;place-items:center;z-index:40;padding:20px}
.tc-modal{width:min(480px,100%);display:grid;gap:10px}
.tc-modal__actions{display:flex;justify-content:flex-end;gap:10px;margin-top:6px}
.rc-vkicker{font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--ta-brand);font-weight:700}
.rc-qr{display:grid;grid-template-columns:repeat(11,1fr);gap:2px;width:150px;padding:10px;background:#fff;border:1px solid var(--ta-line);border-radius:10px}
.rc-qr span{aspect-ratio:1;background:transparent;border-radius:1px}
.rc-qr span.on{background:var(--ta-ink)}
.rc-qrcode{font-family:var(--ta-mono);font-size:10.5px;color:var(--ta-muted);word-break:break-all}
.rc-vdl{display:grid;grid-template-columns:1fr 1fr;gap:12px 20px;margin:4px 0 0}
.rc-vdl div{display:grid;gap:3px}
.rc-vdl dt{font-size:11px;color:var(--ta-muted)}
.rc-vdl dd{margin:0;font-size:13px;font-weight:500}
</style>
