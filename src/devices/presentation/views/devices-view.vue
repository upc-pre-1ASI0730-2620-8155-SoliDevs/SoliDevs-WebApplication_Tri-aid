<script setup>
import { ref } from 'vue'
import { store, vitalTypes, addDevice, removeDevice, setDeviceOnline } from '../../../patient-registration/application/patient-store.js'
import { t } from '../../../shared/application/i18n.js'
import { notify } from '../../../shared/application/toast-store.js'

// Dispositivos precargados para facilitar la vinculación automatica
const defaultTemplates = [
  { type: 'pa', model: 'Omron Hem-7120' },
  { type: 'spo2', model: 'Contec CMS50D' },
  { type: 'fc', model: 'Polar H10' },
  { type: 'temp', model: 'Braun ThermoScan 7' }
]

const newType = ref('pa')
const newModel = ref('')

const icons = {
  pa: '<circle cx="12" cy="12" r="9"/><path d="M12 12l4-3"/>',
  spo2: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
  fc: '<path d="M3 12h4l2-6 4 12 2-6h6"/>',
  temp: '<path d="M10 14V5a2 2 0 0 1 4 0v9a4 4 0 1 1-4 0z"/>'
}

const getVitalInfo = (key) => vitalTypes.find(v => v.key === key) || {}

function isLinked(model) {
  return store.devices.some(d => d.model === model)
}

function handleAddCustom() {
  if (!newModel.value.trim()) {
    notify({ type: 'error', title: t('pf.errModel') || 'Ingrese un modelo válido' })
    return
  }
  addDevice(newType.value, newModel.value.trim())
  notify({ type: 'success', title: 'Dispositivo vinculado con éxito' })
  newModel.value = ''
}

function quickLink(template) {
  if (isLinked(template.model)) return
  addDevice(template.type, template.model)
  notify({ type: 'success', title: `Dispositivo ${template.model} vinculado` })
}

function handleRemove(id) {
  removeDevice(id)
  notify({ type: 'info', title: 'Dispositivo desvinculado' })
}

function toggleOnline(d) {
  setDeviceOnline(d.id, !d.online)
}
</script>

<template>
  <div class="ta-page fi">
    <!-- Encabezado del Módulo de Dispositivos -->
    <section class="ta-card fi-in" style="--d:0">
      <h3 class="ta-h">{{ t('nav.devices') }}</h3>
      <p class="ta-sub">{{ t('devices.sub') }}</p>
    </section>

    <!-- Catálogo de Dispositivos Recomendados / Predeterminados -->
    <section class="ta-card fi-in" style="--d:1">
      <h4 class="dev-subtitle">{{ t('devices.catalog') }}</h4>
      <div class="dev-templates-grid">
        <div v-for="item in defaultTemplates" :key="item.model" class="dev-template-card">
          <div class="dev-ico"><svg viewBox="0 0 24 24" v-html="icons[item.type]"></svg></div>
          <div class="dev-template-info">
            <b>{{ getVitalInfo(item.type).device }}</b>
            <small>{{ item.model }} ({{ getVitalInfo(item.type).unit }})</small>
          </div>
          <button
              class="ta-btn ta-btn--sm"
              :class="{ 'ta-btn--ghost': isLinked(item.model) }"
              :disabled="isLinked(item.model)"
              @click="quickLink(item)">
            {{ isLinked(item.model) ? t('devices.linked') : t('devices.link') }}
          </button>
        </div>
      </div>
    </section>

    <!-- Formulario para Vincular Dispositivo Personalizado -->
    <section class="ta-card fi-in" style="--d:2">
      <h4 class="dev-subtitle">Vincular Dispositivo Manual</h4>
      <div class="dev-form">
        <select class="ta-select" v-model="newType">
          <option v-for="vt in vitalTypes" :key="vt.key" :value="vt.key">
            {{ vt.device }} ({{ vt.label }})
          </option>
        </select>
        <input class="ta-input" v-model="newModel" placeholder="Ej. Omron X7 Smart" @keyup.enter="handleAddCustom" />
        <button class="ta-btn" @click="handleAddCustom">Vincular Dispositivo</button>
      </div>
    </section>

    <!-- Listado de Dispositivos Actualmente Sincronizados -->
    <section class="ta-card fi-in" style="--d:3">
      <h4 class="dev-subtitle">Dispositivos Sincronizados ({{ store.devices.length }})</h4>

      <TransitionGroup v-if="store.devices.length" name="list" tag="ul" class="fd-list">
        <li v-for="d in store.devices" :key="d.id">
          <span class="fd-ico"><svg viewBox="0 0 24 24" v-html="icons[d.type]"></svg></span>
          <div class="fd-info">
            <b>{{ getVitalInfo(d.type).device }} · {{ d.model }}</b>
            <small>{{ d.lastUse ? `Última lectura: ${d.lastUse}` : 'Sin lecturas recientes' }}</small>
          </div>
          <button class="fd-badge" :class="d.online ? 'on' : 'off'" @click="toggleOnline(d)">
            <i></i>{{ d.online ? 'En línea' : 'Desconectado' }}
          </button>
          <button class="fd-x" title="Desvincular" @click="handleRemove(d.id)">×</button>
        </li>
      </TransitionGroup>

      <p v-else class="fd-empty">No hay dispositivos vinculados actualmente.</p>
    </section>
  </div>
</template>

<style scoped>
.dev-subtitle { font-size: 14px; font-weight: 600; margin-bottom: 12px; }
.dev-templates-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; }
.dev-template-card { display: flex; align-items: center; gap: 10px; border: 1px solid var(--ta-line); padding: 10px 12px; border-radius: 10px; background: #fff; }
.dev-ico { width: 32px; height: 32px; border-radius: 8px; background: #e3f3ea; color: var(--ta-brand); display: grid; place-items: center; flex: none; }
.dev-ico svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; }
.dev-template-info { display: grid; flex: 1; min-width: 0; }
.dev-template-info b { font-size: 12.5px; font-weight: 600; }
.dev-template-info small { font-size: 10.5px; color: var(--ta-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dev-form { display: grid; grid-template-columns: 200px 1fr auto; gap: 10px; }

@media(max-width: 760px) {
  .dev-form { grid-template-columns: 1fr; }
}
</style>