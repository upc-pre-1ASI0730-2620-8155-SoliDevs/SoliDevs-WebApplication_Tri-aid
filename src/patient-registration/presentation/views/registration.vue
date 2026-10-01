<script setup>
import { reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { registerEpisode } from '../../application/patient-store.js'
import { docTypes, docTypeOf } from '../../application/document-types.js'

const router = useRouter()
const blank = () => ({ sinDni: false, docType: 'dni', dni: '', names: '', surnames: '', birth: '', sex: '', phone: '', address: '' })
const f = reactive(blank())
const err = reactive({})
const today = new Date().toISOString().slice(0, 10)
const doc = computed(() => docTypeOf(f.docType))

function pick(key) {
  if (f.sinDni) return
  f.docType = key
  f.dni = ''
  delete err.dni
}
function onDoc(e) {
  const v = e.target.value
  f.dni = doc.value.numeric ? v.replace(/\D/g, '') : v.toUpperCase().replace(/[^A-Z0-9]/g, '')
}
function toggleSin() { f.dni = ''; delete err.dni }

function validate() {
  Object.keys(err).forEach(k => delete err[k])
  if (!f.sinDni && !doc.value.pattern.test(f.dni)) err.dni = doc.value.msg
  if (!f.names.trim()) err.names = 'Ingresa los nombres'
  if (!f.surnames.trim()) err.surnames = 'Ingresa los apellidos'
  if (!f.birth || f.birth > today) err.birth = 'Fecha de nacimiento inválida'
  if (!f.sex) err.sex = 'Selecciona el sexo'
  if (f.phone && !/^\d{9}$/.test(f.phone)) err.phone = 'El teléfono debe tener 9 dígitos'
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
  Object.keys(err).forEach(k => delete err[k])
}
</script>

<template>
  <div class="ta-page">
    <section class="ta-card">
      <h3 class="ta-h">Registro de paciente</h3>
      <p class="ta-sub">Completa los datos del paciente para abrir un nuevo episodio de triaje</p>

      <div class="rg-field">
        <span class="ta-label">Tipo de documento</span>
        <div class="rg-seg" role="tablist" aria-label="Tipo de documento" :class="{ off: f.sinDni }">
          <template v-for="(t, i) in docTypes" :key="t.key">
            <span v-if="i" class="rg-sep"></span>
            <button type="button" role="tab" :aria-selected="f.docType === t.key" :class="{ on: f.docType === t.key }" :disabled="f.sinDni" :title="t.full || t.label" @click="pick(t.key)">{{ t.label }}</button>
          </template>
        </div>
      </div>

      <div class="rg-grid">
        <div class="rg-f">
          <label class="ta-label" for="doc">Número de {{ doc.label }}</label>
          <input id="doc" class="ta-input" :class="{ bad: err.dni }" :value="f.dni" :disabled="f.sinDni" :inputmode="doc.numeric ? 'numeric' : 'text'" :maxlength="doc.max" :placeholder="f.sinDni ? 'Sin documento' : doc.ph" autocomplete="off" @input="onDoc" @keyup.enter="submit" />
          <small v-if="err.dni" class="ta-err">{{ err.dni }}</small>
          <small v-else-if="!f.sinDni" class="rg-hint">{{ doc.hint }}</small>
        </div>
        <div class="rg-f">
          <label class="ta-label" for="birth">Fecha de nacimiento</label>
          <input id="birth" type="date" class="ta-input" :class="{ bad: err.birth }" v-model="f.birth" :max="today" />
          <small v-if="err.birth" class="ta-err">{{ err.birth }}</small>
        </div>
        <div class="rg-f">
          <label class="ta-label" for="names">Nombres</label>
          <input id="names" class="ta-input" :class="{ bad: err.names }" v-model="f.names" @keyup.enter="submit" />
          <small v-if="err.names" class="ta-err">{{ err.names }}</small>
        </div>
        <div class="rg-f">
          <label class="ta-label" for="surnames">Apellidos</label>
          <input id="surnames" class="ta-input" :class="{ bad: err.surnames }" v-model="f.surnames" @keyup.enter="submit" />
          <small v-if="err.surnames" class="ta-err">{{ err.surnames }}</small>
        </div>
        <div class="rg-f">
          <label class="ta-label" for="sex">Sexo</label>
          <select id="sex" class="ta-select" :class="{ bad: err.sex }" v-model="f.sex">
            <option value="" disabled>Seleccionar</option>
            <option>Femenino</option>
            <option>Masculino</option>
          </select>
          <small v-if="err.sex" class="ta-err">{{ err.sex }}</small>
        </div>
        <div class="rg-f">
          <label class="ta-label" for="phone">Teléfono (opcional)</label>
          <input id="phone" class="ta-input" :class="{ bad: err.phone }" v-model="f.phone" inputmode="numeric" maxlength="9" placeholder="987654321" @keyup.enter="submit" />
          <small v-if="err.phone" class="ta-err">{{ err.phone }}</small>
        </div>
        <div class="rg-f rg-wide">
          <label class="ta-label" for="address">Dirección (opcional)</label>
          <input id="address" class="ta-input" v-model="f.address" @keyup.enter="submit" />
        </div>
      </div>

      <label class="rg-check">
        <input type="checkbox" v-model="f.sinDni" @change="toggleSin" />
        <span>Sin documento por ahora (se creará un perfil temporal)</span>
      </label>

      <div class="rg-actions">
        <router-link to="/patient-registration" class="ta-btn ta-btn--ghost">Volver al listado</router-link>
        <button class="ta-btn ta-btn--ghost" @click="reset">Limpiar</button>
        <button class="ta-btn" @click="submit">Registrar ingreso</button>
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
.rg-sep{width:1px;height:16px;background:var(--ta-line)}
.rg-hint{font-size:11px;color:var(--ta-muted)}
.rg-check{display:flex;align-items:center;gap:8px;font-size:12.5px;color:var(--ta-muted);margin-top:18px;cursor:pointer}
.rg-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px 20px}
.rg-f{display:grid;gap:6px;align-content:start}
.rg-wide{grid-column:1/-1}
.rg-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:22px;flex-wrap:wrap}
.rg-actions .ta-btn{text-decoration:none}
@media(max-width:760px){.rg-grid{grid-template-columns:1fr}}
</style>