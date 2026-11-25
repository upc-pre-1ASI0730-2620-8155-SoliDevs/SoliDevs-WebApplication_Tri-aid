<script setup>
/**
 * Voucher scanner for the admission desk. Three ways in, one way out:
 *   1. the device camera reads the QR on the patient's phone,
 *   2. the staff uploads a photo or screenshot of the QR,
 * Any of them resolves through the API and opens the patient file.
 */
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { gsap } from 'gsap'
import { Html5Qrcode } from 'html5-qrcode/cjs'
// Pure ESM decoder for uploaded images (no DOM element needed).
import jsQR from 'jsqr'
import { SpecialtyAssignmentApi } from '../../../specialty-assignment/infrastructure/specialty-assignment-api.js'

const emit = defineEmits(['close'])
const router = useRouter()
const { t } = useI18n()

const card = ref(null)
const readerEl = ref(null)
const fileInput = ref(null)
const status = ref('starting')    // starting | scanning | found | notFound | error | noCamera
const result = ref(null)
const api = new SpecialtyAssignmentApi()

const reduce = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
const fmtTime = iso => iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'

onMounted(async () => {
  if (!reduce()) {
    gsap.fromTo(card.value, { opacity: 0, y: 24, scale: .96 }, { opacity: 1, y: 0, scale: 1, duration: .4, ease: 'power3.out', clearProps: 'transform,opacity' })
  }
  await startCamera()
})

let reader = null
let lastCode = null

async function startCamera() {
  status.value = 'starting'
  try {
    reader = new Html5Qrcode('voucher-reader')
    await reader.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 220, height: 220 } },
      code => { if (status.value === 'scanning' && code !== lastCode) { lastCode = code; verify(code) } },
      () => {}
    )
    status.value = 'scanning'
  } catch {
    status.value = 'noCamera'
  }
}

async function stopCamera() {
  try { if (reader?.isScanning) await reader.stop() } catch {}
  try { reader?.clear() } catch {}
  reader = null
}

async function verify(code) {
  await stopCamera()
  status.value = 'found'
  try {
    const r = await api.verifyVoucher(code)
    result.value = r.data
    if (!reduce() && card.value) gsap.fromTo(card.value, { scale: .98 }, { scale: 1, duration: .35, ease: 'back.out(2)' })
  } catch (e) {
    result.value = null
    status.value = e?.response?.status === 404 ? 'notFound' : 'error'
  }
}

/** Decodes a QR from an uploaded image with the same library (no server round trip). */
/** Decodes a QR from an uploaded image on a canvas: no server, no camera element. */
async function onFile(e) {
  const file = e.target.files?.[0]
  if (!file) return
  await stopCamera()
  status.value = 'starting'
  try {
    const img = await createImageBitmap(file)
    const canvas = document.createElement('canvas')
    canvas.width = img.width; canvas.height = img.height
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, 0, 0)
    const { data, width, height } = ctx.getImageData(0, 0, img.width, img.height)
    const code = jsQR(data, width, height)
    if (!code?.data) { status.value = 'notReadable'; return }
    await verify(code.data)
  } catch {
    status.value = 'notReadable'
  } finally {
    e.target.value = ''
  }
}

async function reset() {
  result.value = null
  lastCode = null
  await startCamera()
}

function goToFile() {
  if (!result.value) return
  emit('close')
  router.push(`/patient-registration/${result.value.episodeId}`)
}

onBeforeUnmount(stopCamera)
</script>

<template>
  <div class="vs-backdrop" @click.self="emit('close')">
    <div ref="card" class="ta-card vs-card" role="dialog" aria-modal="true">
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
        <div id="voucher-reader" ref="readerEl" class="vs-reader"></div>
        <p v-if="status === 'starting'" class="vs-hint"><i class="pi pi-spin pi-spinner"></i>{{ t('scanner.starting') }}</p>
        <p v-else class="vs-hint"><i class="pi pi-qrcode"></i>{{ t('scanner.hint') }}</p>
      </div>

      <!-- sin cámara / error -->
      <div v-else-if="status !== 'found'" class="vs-stage vs-stage--msg">
        <i class="pi" :class="status === 'noCamera' ? 'pi-camera' : 'pi-exclamation-circle'"></i>
        <p>{{ status === 'noCamera' ? t('scanner.noCamera') : status === 'notFound' ? t('scanner.notFound') : status === 'notReadable' ? t('scanner.notReadable') : t('scanner.error') }}</p>
        <button class="ta-btn ta-btn--ghost ta-btn--sm" type="button" @click="reset">
          <i class="pi pi-refresh"></i>{{ t('scanner.again') }}
        </button>
      </div>

      <!-- alternativa sin cámara: subir la imagen del QR -->
      <div class="vs-alt">
        <button class="ta-btn ta-btn--ghost" type="button" @click="fileInput?.click()">
          <i class="pi pi-upload"></i>{{ t('scanner.upload') }}
        </button>
        <input ref="fileInput" type="file" accept="image/*" capture="environment" hidden @change="onFile" />
      </div>
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
.vs-stage--msg{padding:22px 12px;text-align:center;color:var(--ta-muted)}
.vs-stage--msg .pi{font-size:28px;color:var(--ta-brand)}
.vs-stage--msg p{margin:0 0 6px;font-size:14px}
.vs-result{display:grid;grid-template-columns:auto 1fr;gap:14px;align-items:center;padding:16px;border-radius:14px;background:#eaf5ee;border:1px solid #bfe3cb}
.vs-av{width:48px;height:48px;border-radius:50%;background:var(--ta-brand);color:#fff;display:grid;place-items:center;font-weight:600;font-size:16px}
.vs-result__who{display:grid;gap:2px}
.vs-result__who b{font-size:16px}
.vs-result__who span{font-size:12.5px;color:var(--ta-muted)}
.vs-room{display:inline-flex;align-items:center;gap:6px;margin-top:4px;font-weight:600;color:var(--ta-brand)}
.vs-result .ta-btn{grid-column:1/-1;width:100%}
.vs-alt{display:grid;gap:10px;padding-top:14px;border-top:1px solid var(--ta-line)}
.vs-alt > .ta-btn{width:100%}
@media(max-width:760px){.vs-backdrop{padding:10px}.vs-card{padding:18px}}
</style>
