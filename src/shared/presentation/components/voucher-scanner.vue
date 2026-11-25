<script setup>
/**
 * Voucher scanner for the admission desk. Opens the device camera, reads the QR
 * on the patient's phone (or accepts the code typed by hand), resolves it through
 * the API and takes the staff straight to the patient file.
 */
import { ref, onBeforeUnmount, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Html5Qrcode } from 'html5-qrcode'
import { SpecialtyAssignmentApi } from '../../../specialty-assignment/infrastructure/specialty-assignment-api.js'

const emit = defineEmits(['close'])
const router = useRouter()
const { t } = useI18n()

const scanner = ref(null)
const reader = ref(null)
const status = ref('idle')           // idle | starting | scanning | found | notFound | error | noCamera
const typedCode = ref('')
const result = ref(null)
const api = new SpecialtyAssignmentApi()

const fmtTime = iso => iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'
const scanning = computed(() => status.value === 'scanning' || status.value === 'starting')

async function startCamera() {
  status.value = 'starting'
  try {
    reader.value = new Html5Qrcode('voucher-reader')
    await reader.value.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 220, height: 220 } },
      onDecoded,
      () => {}
    )
    status.value = 'scanning'
  } catch (e) {
    status.value = 'noCamera'
  }
}

async function stopCamera() {
  try { if (reader.value?.isScanning) await reader.value.stop() } catch {}
  reader.value = null
}

let lastCode = null
function onDecoded(code) {
  if (status.value !== 'scanning' || code === lastCode) return
  lastCode = code
  verify(code)
}

async function verify(code) {
  status.value = 'found'
  try {
    const r = await api.verifyVoucher(code)
    result.value = r.data
  } catch (e) {
    status.value = e?.response?.status === 404 ? 'notFound' : 'error'
    result.value = null
  }
}

async function submitTyped() {
  if (!typedCode.value.trim()) return
  await stopCamera()
  await verify(typedCode.value.trim())
}

async function reset() {
  result.value = null
  lastCode = null
  typedCode.value = ''
  await startCamera()
}

function goToFile() {
  if (!result.value) return
  emit('close')
  router.push(`/patient-registration/${result.value.episodeId}`)
}

defineExpose({ startCamera, stopCamera })
onBeforeUnmount(stopCamera)
</script>

<template>
  <div class="vs-backdrop" @click.self="emit('close')">
    <div class="ta-card vs-card" role="dialog" aria-modal="true">
      <div class="vs-head">
        <div>
          <h3 class="ta-h">{{ t('scanner.title') }}</h3>
          <p class="ta-sub">{{ t('scanner.sub') }}</p>
        </div>
        <button class="ta-btn ta-btn--ghost ta-btn--sm" type="button" @click="emit('close')">
          <i class="pi pi-times"></i>
        </button>
      </div>

      <!-- resultado -->
      <div v-if="result" class="vs-result">
        <span class="vs-av">{{ result.patientName.split(' ').map(p => p[0]).slice(0, 2).join('') }}</span>
        <div class="vs-result__who">
          <b>{{ result.patientName }}</b>
          <span>{{ result.dni ? `DNI ${result.dni}` : t('scanner.temporary') }} · {{ t('scanner.arrived') }} {{ fmtTime(result.arrivalTime) }}</span>
          <span v-if="result.room" class="vs-room"><i class="pi pi-door-open"></i> {{ result.room }}</span>
        </div>
        <button class="ta-btn" type="button" @click="goToFile">
          <i class="pi pi-user"></i>{{ t('scanner.openFile') }}
        </button>
      </div>

      <!-- cámara -->
      <div v-else-if="status === 'starting' || status === 'scanning'" class="vs-stage">
        <div id="voucher-reader" class="vs-reader"></div>
        <p class="vs-hint"><i class="pi pi-qrcode"></i>{{ t('scanner.hint') }}</p>
      </div>

      <!-- estados -->
      <div v-else-if="status === 'noCamera'" class="vs-stage vs-stage--msg">
        <i class="pi pi-camera"></i>
        <p>{{ t('scanner.noCamera') }}</p>
      </div>
      <div v-else-if="status === 'notFound'" class="vs-stage vs-stage--msg">
        <i class="pi pi-exclamation-circle"></i>
        <p>{{ t('scanner.notFound') }}</p>
        <button class="ta-btn ta-btn--ghost ta-btn--sm" type="button" @click="reset">{{ t('scanner.again') }}</button>
      </div>
      <div v-else-if="status === 'error'" class="vs-stage vs-stage--msg">
        <i class="pi pi-exclamation-triangle"></i>
        <p>{{ t('scanner.error') }}</p>
        <button class="ta-btn ta-btn--ghost ta-btn--sm" type="button" @click="reset">{{ t('scanner.again') }}</button>
      </div>

      <!-- entrada manual siempre disponible -->
      <form class="vs-typed" @submit.prevent="submitTyped">
        <label class="ta-label" for="vs-code">{{ t('scanner.typed') }}</label>
        <div class="vs-typed__row">
          <input id="vs-code" v-model="typedCode" class="ta-input" placeholder="EP-0014" />
          <button class="ta-btn ta-btn--ghost" type="submit">{{ t('scanner.verify') }}</button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.vs-backdrop{position:fixed;inset:0;z-index:70;display:grid;place-items:center;padding:20px;background:rgba(10,33,24,.5);backdrop-filter:blur(4px)}
.vs-card{width:min(520px,100%);display:grid;gap:16px;padding:24px}
.vs-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}
.vs-head .ta-sub{margin:0}
.vs-stage{display:grid;gap:12px;justify-items:center}
.vs-reader{width:100%;min-height:260px;border-radius:14px;overflow:hidden;background:#0a221a}
.vs-reader :deep(video){width:100%;border-radius:14px}
.vs-hint{margin:0;font-size:13px;color:var(--ta-muted);display:inline-flex;align-items:center;gap:8px}
.vs-stage--msg{padding:28px 12px;text-align:center;color:var(--ta-muted)}
.vs-stage--msg .pi{font-size:28px;color:var(--ta-brand)}
.vs-stage--msg p{margin:0 0 6px;font-size:14px}
.vs-result{display:grid;grid-template-columns:auto 1fr;gap:14px;align-items:center;padding:16px;border-radius:14px;background:#eaf5ee;border:1px solid #bfe3cb}
.vs-av{width:48px;height:48px;border-radius:50%;background:var(--ta-brand);color:#fff;display:grid;place-items:center;font-weight:600;font-size:16px}
.vs-result__who{display:grid;gap:2px}
.vs-result__who b{font-size:16px}
.vs-result__who span{font-size:12.5px;color:var(--ta-muted)}
.vs-room{display:inline-flex;align-items:center;gap:6px;margin-top:4px;font-weight:600;color:var(--ta-brand)}
.vs-result .ta-btn{grid-column:1/-1;width:100%}
.vs-typed{display:grid;gap:6px;padding-top:14px;border-top:1px solid var(--ta-line)}
.vs-typed__row{display:grid;grid-template-columns:1fr auto;gap:8px}
</style>
