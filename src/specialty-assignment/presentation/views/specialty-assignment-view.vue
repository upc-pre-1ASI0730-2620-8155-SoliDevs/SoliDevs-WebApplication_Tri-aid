<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { findEpisode, ageOf, fmtTime, saveEpisode } from '../../../patient-registration/application/patient-store.js'
import { docLabel } from '../../../patient-registration/application/document-types.js'
import { notify } from '../../../shared/application/toast-store.js'
import { t } from '../../../shared/application/i18n.js'
import { levelByCode } from '../../../triage-classification/domain/model/triage-level.js'
import { TriageApi } from '../../../triage-classification/infrastructure/triage-api.js'
import { ClassificationAssembler } from '../../../triage-classification/infrastructure/classification.assembler.js'
import PatientBanner from '../../../shared/presentation/components/patient-banner.vue'
import SymptomAutocomplete from '../components/symptom-autocomplete.vue'
import QueueChips from '../components/queue-chips.vue'
import VoucherDialog from '../components/voucher-dialog.vue'
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

/* ---------- Sintoma codificado y sugerencia (US30) ---------- */
const selectedSymptom = ref(null)
const symptomErr = ref(false)
const suggestion = ref(null)
const specialties = ref([])
const selected = ref('')
const sugErr = ref('')
const chgReason = ref('')
const chgErr = ref(false)
const consulted = ref(false)

const suggestedSpecialty = computed(() => specialties.value.find(s => s.key === suggestion.value) || null)
const selectedSpecialty = computed(() => specialties.value.find(s => s.key === selected.value) || null)
const changed = computed(() => selected.value && selected.value !== suggestion.value)
const specName = key => t('referral.spec.' + key)

async function consult() {
  symptomErr.value = false; sugErr.value = ''
  if (!selectedSymptom.value) { symptomErr.value = true; return }
  const r = await service.suggestSpecialty({
    symptomId: selectedSymptom.value.id,
    symptom: selectedSymptom.value.es,
    level: level.value?.key, age: age.value
  })
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
const alreadyReferred = ref(false)
const referral = ref(null)

async function refer() {
  if (!consulted.value) { symptomErr.value = true; return }
  if (changed.value && !chgReason.value.trim()) { chgErr.value = true; return }
  referring.value = true
  const r = await service.refer(id, {
    specialtyRef: selectedSpecialty.value || suggestedSpecialty.value,
    symptom: `${selectedSymptom.value.id} — ${selectedSymptom.value.es}`
  }, age.value)
  referring.value = false
  if (!r.ok) { notify({ type: 'error', title: t(r.error) }); return }
  referral.value = r.data
  ep.value.referred = true
  saveEpisode(ep.value)
  await loadQueues()
  await makeVoucher()
}

/* ---------- Comprobante (US33) ---------- */
const voucher = ref(null)
const showVoucher = ref(false)

async function makeVoucher() {
  if (!referral.value) return
  const r = await service.generateVoucher(referral.value)
  if (!r.ok) return
  voucher.value = r.data
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

onMounted(async () => {
  const response = await triageApi.getClassificationByEpisode(id)
  const c = ClassificationAssembler.toEntity((response.data || [])[0] || null)
  if (c?.level) {
    level.value = levelByCode(c.level.split('_')[0])
    confirmedAt.value = c.confirmedAt ? fmtTime(c.confirmedAt) : null
  }
  // si el episodio ya fue derivado, restaurar el contexto (US31/US33)
  const existing = await service.findByEpisode(id)
  if (existing) {
    referral.value = existing
    selectedSymptom.value = { id: (existing.symptom || '').split(' — ')[0], es: (existing.symptom || '').split(' — ')[1] || '', en: '' }
    suggestion.value = existing.specialty
    selected.value = existing.specialty
    consulted.value = true
    alreadyReferred.value = true
  }
  await loadQueues()
})
</script>

<template>
  <div class="ta-page" v-if="ep">
    <PatientBanner
        :initials="initials"
        :name="fullName"
        :meta="meta"
        :badge="level ? `${level.code} · ${t('triage.level.' + level.code + '.name')}` : ''"
        :badge-color="level?.color"
    />

    <section class="ta-card rc-card rc-in" style="--d:1">
      <h3 class="ta-h">{{ t('referral.symptomTitle') }}</h3>
      <p class="ta-sub">{{ t('referral.symptomSub') }}</p>

      <div class="rc-symrow">
        <SymptomAutocomplete v-model="selectedSymptom" :error="symptomErr" />
        <button class="ta-btn" @click="consult"><i class="pi pi-sparkles"></i>{{ t('referral.suggestBtn') }}</button>
      </div>
      <p v-if="symptomErr" class="ta-err">{{ t('referral.err.catalog') }}</p>

      <div v-if="consulted" class="rc-sugg">
        <span class="rc-arrow"><i class="pi pi-arrow-right"></i></span>
        <div>
          <small>{{ t('referral.suggested') }}</small>
          <b>{{ specName(suggestion) }}</b>
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
          <button v-if="alreadyReferred" class="ta-btn ta-btn--ghost" @click="makeVoucher">
            <i class="pi pi-qrcode"></i>{{ t('referral.showVoucher') }}
          </button>
          <button class="ta-btn" :disabled="referring" @click="refer">
            <i class="pi pi-check"></i>{{ alreadyReferred ? t('referral.update') : t('referral.confirm') }}
          </button>
        </div>
      </template>
    </section>

    <section class="ta-card rc-in" style="--d:2">
      <h3 class="ta-h">{{ t('referral.queuesTitle') }}</h3>
      <p class="ta-sub">{{ t('referral.queuesSub') }}</p>
      <QueueChips :queues="queues" :label="specName" />
    </section>

    <VoucherDialog
        v-if="showVoucher"
        :voucher="voucher"
        :referral="referral"
        :patient-name="fullName"
        :episode-id="ep.id"
        :level="level"
        @close="closeVoucher"
        @send="sendVoucher"
    />
  </div>
</template>

<style scoped>
.rc-card label.ta-label{display:block;margin-top:18px;margin-bottom:6px}
.rc-symrow{display:flex;gap:10px;align-items:flex-start}
.rc-symrow .ta-btn{white-space:nowrap}
.rc-symrow > :first-child{flex:1}
.rc-sugg{display:flex;align-items:center;gap:12px;margin-top:18px;padding:12px 14px;border:1px solid var(--ta-line);border-radius:12px;background:#fff}
.rc-arrow{width:30px;height:30px;border-radius:8px;background:#e3f3ea;color:var(--ta-brand);display:grid;place-items:center;flex:none}
.rc-sugg small{display:block;font-size:10.5px;color:var(--ta-muted)}
.rc-sugg b{font-size:15px}
.rc-tag{margin-left:auto;display:inline-flex;align-items:center;gap:6px;font-size:11px;color:var(--ta-brand);background:#e3f3ea;border-radius:999px;padding:4px 10px;white-space:nowrap}
.rc-select{max-width:420px;margin-top:0}
.rc-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:26px}
</style>
