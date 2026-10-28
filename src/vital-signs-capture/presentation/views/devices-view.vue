<script setup>
import { ref } from 'vue'
import { deviceStore as store, addDevice, removeDevice, setDeviceOnline } from '../../application/device-store.js'
import { DeviceType as vitalTypes } from '../../domain/model/device-type.js'
import { t } from '../../../shared/application/i18n.js'
import { notify } from '../../../shared/application/toast-store.js'

/** Preloaded devices to ease automatic linking. */
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

function handleAddCustom() {
  if (!newModel.value.trim()) {
    notify({ type: 'error', title: t('pf.errModel') })
    return
  }
  addDevice(newType.value, newModel.value.trim())
  notify({ type: 'success', title: t('devices.toastLinked') })
  newModel.value = ''
}

function handleRemove(id) {
  removeDevice(id)
  notify({ type: 'info', title: t('devices.toastUnlinked') })
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

    <!-- Formulario para Vincular Dispositivo Personalizado -->
    <section class="ta-card fi-in" style="--d:2">
      <h4 class="dev-subtitle">{{ t("devices.manual") }}</h4>
      <div class="dev-form">
        <select class="ta-select" v-model="newType">
          <option v-for="vt in vitalTypes" :key="vt.key" :value="vt.key">
            {{ vt.device }} ({{ vt.label }})
          </option>
        </select>
        <input class="ta-input" v-model="newModel" :placeholder="t('devices.modelPh')" @keyup.enter="handleAddCustom" />
        <button class="ta-btn" @click="handleAddCustom">{{ t("devices.linkDevice") }}</button>
      </div>
    </section>

    <!-- Listado de Dispositivos Actualmente Sincronizados -->
    <section class="ta-card fi-in" style="--d:3">
      <h4 class="dev-subtitle">{{ t("devices.sync") }} ({{ store.devices.length }})</h4>

      <TransitionGroup v-if="store.devices.length" name="list" tag="ul" class="fd-list">
        <li v-for="d in store.devices" :key="d.id">
          <span class="fd-ico"><svg viewBox="0 0 24 24" v-html="icons[d.type]"></svg></span>
          <div class="fd-info">
            <b>{{ getVitalInfo(d.type).device }} · {{ d.model }}</b>
            <small>{{ d.lastUse ? t('devices.lastUse', { time: d.lastUse }) : t('devices.noReads') }}</small>
          </div>
          <button class="fd-badge" :class="d.online ? 'on' : 'off'" @click="toggleOnline(d)">
            <i></i>{{ d.online ? t('devices.online') : t('devices.offline') }}
          </button>
          <button class="fd-x" :title="t('devices.unlink')" @click="handleRemove(d.id)">×</button>
        </li>
      </TransitionGroup>

      <p v-else class="fd-empty">{{ t("devices.empty") }}</p>
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

.fd-list, .fd-ico, .fd-info, .fd-badge, .fd-x, .fd-empty { all: revert; }

.fd-list { list-style: none; margin: 12px 0 0; padding: 0; display: grid; gap: 8px; }
.fd-list li { display: flex; align-items: center; gap: 12px; padding: 12px; border: 1px solid var(--ta-line); border-radius: 10px; background: #fff; flex-wrap: wrap; }
.fd-ico { width: 30px; height: 30px; border-radius: 8px; background: #e3f3ea; color: var(--ta-brand); display: grid; place-items: center; flex: none; }
.fd-ico svg { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; }
.fd-info { flex: 1; min-width: 160px; display: grid; }
.fd-info b { font-size: 13px; font-weight: 500; }
.fd-info small { font-family: var(--ta-mono); font-size: 10px; color: var(--ta-muted); }
.fd-badge { display: flex; align-items: center; gap: 6px; border: 0; font: inherit; font-size: 11px; padding: 3px 10px; border-radius: 999px; cursor: pointer; transition: background .2s, color .2s; }
.fd-badge i { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.fd-badge.on { background: #e3f3ea; color: var(--ta-brand); }
.fd-badge.off { background: #eef0f2; color: var(--ta-muted); }
.fd-x { border: 0; background: none; font-size: 20px; line-height: 1; color: var(--ta-muted); cursor: pointer; transition: color .2s; }
.fd-x:hover { color: var(--ta-danger); }
.fd-empty { margin: 16px 0 0; font-size: 12px; color: var(--ta-muted); text-align: center; }

@media(max-width: 760px) {
  .dev-form { grid-template-columns: 1fr; }
}
</style>