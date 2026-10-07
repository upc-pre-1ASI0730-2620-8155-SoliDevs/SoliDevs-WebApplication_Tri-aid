<script setup>
import { reactive, computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { registerEpisode, findPatient } from '../../application/patient-store.js'
import { docTypes, docTypeOf } from '../../application/document-types.js'
import { notify } from '../../../shared/application/toast-store.js'
import { t } from '../../../shared/application/i18n.js'

const router = useRouter()
const blank = () => ({ sinDni: false, docType: 'dni', dni: '', names: '', surnames: '', birth: '', sex: '', phone: '', address: '' })
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

function submit() {
  if (!validate()) return
  const ep = registerEpisode({
    sinDni: f.sinDni,
    docType: f.docType,
    dni: f.sinDni ? '' : f.dni,
    names: f.names.trim(),
    surnames: f.surnames.trim(),
    birth: f.birth,
    sex: f.sex,
    phone: f.phone,
    address: f.address.trim()
  })
  router.push(`/patient-registration/${ep.id}`)
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
        <!-- Móvil: selector desplegable nativo -->
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
          <label class="ta-label" for="phone">{{ t('rg.phone') }}</label>
          <input id="phone" class="ta-input" :class="{ bad: err.phone }" v-model="f.phone" inputmode="numeric" maxlength="9" placeholder="987654321" @keyup.enter="submit" />
          <small v-if="err.phone" class="ta-err">{{ err.phone }}</small>
        </div>
        <div class="rg-f rg-wide">
          <label class="ta-label" for="address">{{ t('rg.address') }}</label>
          <input id="address" class="ta-input" v-model="f.address" @keyup.enter="submit" />
        </div>
      </div>

      <label class="rg-check">
        <input type="checkbox" v-model="f.sinDni" @change="toggleSin" />
        <span>{{ t('rg.noDoc') }}</span>
      </label>

      <div class="rg-actions">
        <button class="ta-btn" @click="submit">{{ t('rg.submit') }}</button>
      </div>
    </section>
  </div>
</template>

<style>
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

/* Móvil: volver arriba (solo icono), limpiar arriba derecha, registrar abajo */
@media(max-width:760px){
  .rg-head{flex-wrap:wrap;gap:10px}
  .rg-titlebox{flex:1 1 calc(100% - 100px)}
  .rg-clearbtn span{display:none}
}
@media(max-width:760px){.rg-grid{grid-template-columns:1fr}}
</style>