<script setup>
import { reactive, computed, ref, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { registerEpisode, findPatient } from '../../application/patient-store.js'
import { docTypes, docTypeOf } from '../../application/document-types.js'
import { notify } from '../../../shared/application/toast-store.js'
import { t } from '../../../shared/application/i18n.js'
import { gsap } from 'gsap'
import { useModalMotion } from '../../../shared/application/use-modal-motion.js'

const router = useRouter()
const blank = () => ({ sinDni: false, docType: 'dni', dni: '', names: '', surnames: '', birth: '', sex: '', phone: '', address: '', email: '' })
const f = reactive(blank())
const err = reactive({})
const today = new Date().toISOString().slice(0, 10)
const doc = computed(() => docTypeOf(f.docType))
const docName = computed(() => t('doc.' + f.docType + '.label'))

const found = ref(null)
const FILL = ['names', 'surnames', 'birth', 'sex', 'phone', 'address']
function clearFilled() {
  if (!found.value) return
  FILL.forEach(k => (f[k] = ''))
  found.value = null
}
function lookup() {
  if (!doc.value.pattern.test(f.dni)) { clearFilled(); return }
  const p = findPatient(f.docType, f.dni)
  if (!p) { clearFilled(); return }
  FILL.forEach(k => (f[k] = p[k] || ''))
  Object.keys(err).forEach(k => delete err[k])
  found.value = p
  notify({ type: 'success', title: t('toast.found'), detail: t('toast.loaded') })
}

function pick(key) {
  if (f.sinDni) return
  f.docType = key
  clearFilled()
  f.dni = ''
  delete err.dni
}
function onDoc(e) {
  const v = e.target.value
  f.dni = doc.value.numeric ? v.replace(/\D/g, '') : v.toUpperCase().replace(/[^A-Z0-9]/g, '')
  lookup()
}
function toggleSin() { f.dni = ''; delete err.dni; clearFilled() }

function validate() {
  Object.keys(err).forEach(k => delete err[k])
  if (!f.sinDni && !doc.value.pattern.test(f.dni)) err.dni = t('doc.' + f.docType + '.msg')
  if (!f.names.trim()) err.names = t('rg.e.names')
  if (!f.surnames.trim()) err.surnames = t('rg.e.surnames')
  if (!f.birth || f.birth > today) err.birth = t('rg.e.birth')
  if (!f.sex) err.sex = t('rg.e.sex')
  if (f.phone && !/^\d{9}$/.test(f.phone)) err.phone = t('rg.e.phone')
  return !Object.keys(err).length
}

const saving = ref(false)
// Render puts the API to sleep after idle time; the first request of the day can take about a minute.
const wakingUp = ref(false)
const issuedCode = ref(null)
const { card: issuedCard, backdrop: issuedBackdrop, close: closeIssued } = useModalMotion(() => { issuedCode.value = null })
const copied = ref(false)
async function copyCode() {
  try { await navigator.clipboard.writeText(issuedCode.value.code) } catch { /* clipboard unavailable: the code stays visible */ }
  copied.value = true; setTimeout(() => { copied.value = false }, 1800)
}

// The dialog is rendered through v-if, so its entrance is choreographed here on
// every appearance: backdrop, badge with a pulse ring, copy cascading up, and the
// code flipping in tile by tile under a light sweep.
watch(issuedCode, async (code) => {
  if (!code) return
  await nextTick()
  const card = issuedCard.value, backdrop = issuedBackdrop.value
  if (!card || !backdrop) return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  gsap.killTweensOf([card, backdrop])
  const badge = card.querySelector('.rg-issued-badge'), ring = card.querySelector('.rg-issued-ring')
  const tiles = card.querySelectorAll('.rg-issued__ch'), els = card.querySelectorAll('.rg-issued-el')
  gsap.set(card, { opacity: 0, y: 28, scale: .94 })
  gsap.set(badge, { scale: 0, rotation: -30 })
  gsap.set(els, { opacity: 0, y: 14 })
  gsap.set(tiles, { opacity: 0, rotationX: -90, y: 10, transformPerspective: 400 })
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
  tl.fromTo(backdrop, { opacity: 0 }, { opacity: 1, duration: .28 })
    .to(card, { opacity: 1, y: 0, scale: 1, duration: .5, ease: 'back.out(1.4)' }, .05)
    .to(badge, { scale: 1, rotation: 0, duration: .55, ease: 'back.out(2.2)' }, .22)
    .fromTo(ring, { scale: .6, opacity: .55 }, { scale: 2.1, opacity: 0, duration: .9, ease: 'power2.out' }, .45)
    .to(els, { opacity: 1, y: 0, duration: .38, stagger: .07 }, .3)
    .to(tiles, { opacity: 1, rotationX: 0, y: 0, duration: .45, stagger: .045, ease: 'back.out(1.6)' }, .5)
})
function goToFile() { router.push(`/patient-registration/${issuedCode.value?.episodeId || ''}`) }
async function submit() {
  if (!validate() || saving.value) return
  saving.value = true
  const wakeTimer = setTimeout(() => { wakingUp.value = true }, 4000)
  try {
    const ep = await registerEpisode({
      sinDni: f.sinDni,
      docType: f.docType,
      dni: f.sinDni ? '' : f.dni,
      names: f.names.trim(),
      surnames: f.surnames.trim(),
      birth: f.birth,
      sex: f.sex,
      phone: f.phone,
      address: f.address.trim(),
      email: (f.email || '').trim()
    })
    // The API returns the one-time portal code only on creation: show it now,
    // before leaving, so admission can hand it to the patient.
    const issued = ep.patient?.portalPassword
    if (issued) {
      issuedCode.value = { code: issued, email: ep.patient?.email || '', episodeId: ep.id, dni: ep.patient?.dni || '' }
      return
    }
    router.push(`/patient-registration/${ep.id}`)
  } catch (e) {
    notify({ type: 'error', title: t('rg.e.save'), detail: e.response?.data?.message })
  } finally {
    clearTimeout(wakeTimer)
    wakingUp.value = false
    saving.value = false
  }
}

function reset() {
  Object.assign(f, blank())
  found.value = null
  Object.keys(err).forEach(k => delete err[k])
}
</script>

<template>
  <div class="ta-page">
    <section class="ta-card">
      <div class="rg-head">
        <router-link to="/patient-registration" class="rg-backlink" :aria-label="t('rg.back')">
          <i class="pi pi-arrow-left"></i>
        </router-link>
        <div class="rg-titlebox">
          <h3 class="ta-h">{{ t('rg.title') }}</h3>
          <p class="ta-sub">{{ t('rg.sub') }}</p>
        </div>
        <button class="ta-btn ta-btn--ghost ta-btn--sm rg-clearbtn" @click="reset"><i class="pi pi-filter-slash"></i>{{ t('rg.clear') }}</button>
      </div>

      <div class="rg-field">
        <span class="ta-label">{{ t('rg.docType') }}</span>
        <div class="rg-seg" role="tablist" :aria-label="t('rg.docType')" :class="{ off: f.sinDni }">
          <template v-for="(dt, i) in docTypes" :key="dt.key">
            <span v-if="i" class="rg-sep"></span>
            <button type="button" role="tab" :aria-selected="f.docType === dt.key" :class="{ on: f.docType === dt.key }" :disabled="f.sinDni" :title="t('doc.' + dt.key + '.full')" @click="pick(dt.key)">{{ t('doc.' + dt.key + '.label') }}</button>
          </template>
        </div>
        <!-- Mobile: native dropdown selector -->
        <select class="ta-select rg-seg--mobile" :aria-label="t('rg.docType')" :disabled="f.sinDni" :value="f.docType" @change="pick($event.target.value)">
          <option v-for="dt in docTypes" :key="dt.key" :value="dt.key">{{ t('doc.' + dt.key + '.full') }}</option>
        </select>
      </div>

      <div class="rg-grid">
        <div class="rg-f">
          <label class="ta-label" for="doc">{{ t('rg.docNumber', { doc: docName }) }}</label>
          <input id="doc" class="ta-input" :class="{ bad: err.dni }" :value="f.dni" :disabled="f.sinDni" :inputmode="doc.numeric ? 'numeric' : 'text'" :maxlength="doc.max" :placeholder="f.sinDni ? t('rg.noDocPh') : doc.ph" autocomplete="off" @input="onDoc" @keyup.enter="submit" />
          <small v-if="err.dni" class="ta-err">{{ err.dni }}</small>
          <small v-else-if="!f.sinDni" class="rg-hint">{{ t('doc.' + f.docType + '.hint') }}</small>
        </div>
        <div class="rg-f">
          <label class="ta-label" for="birth">{{ t('rg.birth') }}</label>
          <input id="birth" type="date" class="ta-input" :class="{ bad: err.birth }" v-model="f.birth" :max="today" />
          <small v-if="err.birth" class="ta-err">{{ err.birth }}</small>
        </div>
        <div class="rg-f">
          <label class="ta-label" for="names">{{ t('rg.names') }}</label>
          <input id="names" class="ta-input" :class="{ bad: err.names }" v-model="f.names" @keyup.enter="submit" />
          <small v-if="err.names" class="ta-err">{{ err.names }}</small>
        </div>
        <div class="rg-f">
          <label class="ta-label" for="surnames">{{ t('rg.surnames') }}</label>
          <input id="surnames" class="ta-input" :class="{ bad: err.surnames }" v-model="f.surnames" @keyup.enter="submit" />
          <small v-if="err.surnames" class="ta-err">{{ err.surnames }}</small>
        </div>
        <div class="rg-f">
          <label class="ta-label" for="sex">{{ t('rg.sex') }}</label>
          <select id="sex" class="ta-select" :class="{ bad: err.sex }" v-model="f.sex">
            <option value="" disabled>{{ t('rg.select') }}</option>
            <option value="F">{{ t('sex.F') }}</option>
            <option value="M">{{ t('sex.M') }}</option>
          </select>
          <small v-if="err.sex" class="ta-err">{{ err.sex }}</small>
        </div>
        <div class="rg-f">
          <label class="ta-label" for="phone">{{ t('rg.phone') }} <small class="opt">{{ t('rg.optional') }}</small></label>
          <input id="phone" class="ta-input" :class="{ bad: err.phone }" v-model="f.phone" inputmode="numeric" maxlength="9" placeholder="987654321" @keyup.enter="submit" />
          <small v-if="err.phone" class="ta-err">{{ err.phone }}</small>
        </div>
        <div class="rg-f">
          <label class="ta-label" for="address">{{ t('rg.address') }} <small class="opt">{{ t('rg.optional') }}</small></label>
          <input id="address" class="ta-input" v-model="f.address" @keyup.enter="submit" />
          <small v-if="err.address" class="ta-err">{{ err.address }}</small>
        </div>
        <div class="rg-f">
          <label class="ta-label" for="email">{{ t('rg.email') }} <small class="opt">{{ t('rg.optional') }}</small></label>
          <input id="email" type="email" class="ta-input" v-model="f.email" placeholder="correo@ejemplo.com" @keyup.enter="submit" />
          <small v-if="err.email" class="ta-err">{{ err.email }}</small>
        </div>
      </div>

      <label class="rg-check">
        <input type="checkbox" v-model="f.sinDni" @change="toggleSin" />
        <span>{{ t('rg.noDoc') }}</span>
      </label>

      <div class="rg-actions">
        <button class="ta-btn" :disabled="saving" @click="submit">{{ wakingUp ? t('rg.wakingUp') : t('rg.submit') }}</button>
      </div>
    </section>

    <!-- Código de portal recién emitido: se muestra una sola vez -->
    <div v-if="issuedCode" ref="issuedBackdrop" class="rg-modal" role="dialog" aria-modal="true" aria-labelledby="rg-issued-title">
      <div ref="issuedCard" class="rg-modal__card ta-card rg-issued-card">
        <span class="rg-issued-badge"><i class="pi pi-qrcode"></i><span class="rg-issued-ring"></span></span>
        <h3 id="rg-issued-title" class="ta-h rg-issued-el">{{ t('rg.issued.title') }}</h3>
        <p class="ta-sub rg-issued-el">{{ t('rg.issued.sub') }}</p>
        <div class="rg-issued">
          <div class="rg-issued-row rg-issued-el">
            <span class="rg-issued-label">{{ t('rg.issued.user') }}</span>
            <b class="rg-issued-value">{{ issuedCode.dni }}{{ issuedCode.email ? ' · ' + issuedCode.email : '' }}</b>
          </div>
          <div class="rg-issued-row rg-issued-el">
            <span class="rg-issued-label">{{ t('rg.issued.code') }}</span>
            <div class="rg-issued-code">
              <div class="rg-issued__code">
                <span v-for="(ch, i) in issuedCode.code" :key="i" class="rg-issued__ch" :style="{ '--i': i }">{{ ch }}</span>
              </div>
              <button class="ta-btn ta-btn--ghost ta-btn--sm" type="button" @click="copyCode"><i class="pi" :class="copied ? 'pi-check' : 'pi-copy'"></i>{{ copied ? t('rg.issued.copied') : t('rg.issued.copy') }}</button>
            </div>
          </div>
        </div>
        <p class="rg-modal__note rg-issued-el">{{ t('rg.issued.note') }}</p>
        <button class="ta-btn rg-modal__btn rg-issued-el" type="button" @click="closeIssued(); goToFile()">{{ t('rg.issued.go') }}</button>
        </div>
    </div>
  </div>
</template>

<style>
/* Código de portal recién emitido */
.rg-modal{position:fixed;inset:0;z-index:60;display:grid;place-items:center;padding:20px;background:rgba(10,33,24,.45);backdrop-filter:blur(3px)}
.rg-modal__card{width:min(420px,100%);display:grid;gap:6px;padding:26px 28px;text-align:center}
.rg-modal__ic{width:52px;height:52px;margin:0 auto 6px;border-radius:14px;background:#d6eedd;color:var(--ta-brand);display:grid;place-items:center;font-size:22px}
.rg-modal__card .ta-sub{margin:0}
.rg-issued{margin:14px 0 0;display:grid;gap:12px}
.rg-issued-row{display:grid;gap:6px;padding:10px 12px;border:1px solid var(--ta-line);border-radius:12px;background:#fafcfb}
.rg-issued-label{font-size:11px;letter-spacing:.04em;text-transform:uppercase;color:var(--ta-muted)}
.rg-issued-value{font-size:14px;font-weight:600;word-break:break-all}
.rg-issued-code{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.rg-issued__code{position:relative;display:flex;flex-wrap:wrap;gap:5px;font-family:var(--ta-mono)}
.rg-issued__ch{display:inline-grid;place-items:center;min-width:26px;height:36px;padding:0 7px;border-radius:8px;background:var(--ta-brand-soft,#e8f3ec);color:var(--ta-brand);font-weight:700;font-size:21px;line-height:1;transform-style:preserve-3d;box-shadow:inset 0 -2px 0 rgba(0,0,0,.04)}

.rg-modal__note{margin:4px 0 10px;font-size:.78rem;color:var(--ta-muted)}
.rg-modal__btn{width:100%}
.rg-field{display:grid;gap:8px;margin-bottom:18px}
.rg-seg{display:inline-flex;align-items:center;gap:2px;padding:4px;border-radius:12px;background:#fff;border:1px solid var(--ta-line);width:fit-content;max-width:100%;flex-wrap:wrap;transition:opacity .2s}
.rg-seg.off{opacity:.45}
.rg-seg button{border:1px solid transparent;background:none;font:inherit;font-size:12.5px;font-weight:500;color:var(--ta-muted);padding:7px 18px;border-radius:9px;cursor:pointer;transition:background .2s,color .2s,border-color .2s,box-shadow .2s}
.rg-seg button:hover:not(:disabled){color:var(--ta-brand)}
.rg-seg button.on{background:#fff;color:var(--ta-brand);border-color:var(--ta-brand);box-shadow:0 0 0 3px rgba(10,107,56,.12)}
.rg-seg button:disabled{cursor:not-allowed}
.rg-seg button:focus-visible{outline:2px solid var(--ta-accent);outline-offset:2px}
.rg-seg--mobile{display:none;max-width:280px}
.rg-seg--mobile:disabled{opacity:.45;cursor:not-allowed}
@media(max-width:760px){
  .rg-seg{display:none}
  .rg-seg--mobile{display:block}
}
.rg-sep{width:1px;height:16px;background:var(--ta-line)}
.rg-hint{font-size:11px;color:var(--ta-muted)}

.rg-check{display:flex;align-items:center;gap:8px;font-size:12.5px;color:var(--ta-muted);margin-top:18px;cursor:pointer}
.rg-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px 20px}
.rg-f{display:grid;gap:6px;align-content:start}
.rg-wide{grid-column:1/-1}
.rg-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:22px}
.rg-actions .ta-btn{text-decoration:none}
.rg-head{display:flex;align-items:flex-start;gap:14px;margin-bottom:18px}
.rg-backlink{display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;font-size:13px;color:var(--ta-muted);text-decoration:none;border-radius:8px;border:1px solid var(--ta-line);background:#fff;transition:color .2s,background .2s,border-color .2s;flex:none;margin-top:2px}
.rg-backlink:hover{color:var(--ta-brand);background:#f2f8f4;border-color:var(--ta-brand)}
.rg-titlebox{flex:1;min-width:0}
.rg-titlebox .ta-h{margin-bottom:2px}
.rg-titlebox .ta-sub{margin-bottom:0}
.rg-clearbtn{flex:none}

/* Mobile: scroll-to-top (icon only), clear top right, register bottom */
@media(max-width:760px){
  .rg-head{flex-wrap:wrap;gap:10px}
  .rg-titlebox{flex:1 1 calc(100% - 100px)}
  .rg-clearbtn span{display:none}
}
@media(max-width:760px){.rg-grid{grid-template-columns:1fr}}
.opt{font-weight:400;opacity:.6;text-transform:none}
</style>