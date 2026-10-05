<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useConfirm } from 'primevue/useconfirm';
import { AlertingService } from '../../infrastructure/alerting.service.js';
import { session } from '../../../shared/application/demo-session.js';

const { t } = useI18n();
const confirm = useConfirm();
const activeAlerts = ref([]);
const alertingService = new AlertingService();
const router = useRouter();

// Variable para controlar el filtro seleccionado por defecto
const activeFilter = ref('all');

// Auditoria cronologica por rango de fechas (US29)
const auditFrom = ref('');
const auditTo = ref('');

// Notificacion sonora real (US26): bip de dos tonos via WebAudio.
function playAlertSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(660, ctx.currentTime + 0.18);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.connect(gain).connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.4);
  } catch (e) { /* audio no disponible */ }
}

const nurseName = computed(() => session.name || t('alerting.nurse'));
const nurseInitials = computed(() => (session.name || t('alerting.nurse'))
  .split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase());

onMounted(async () => {
  try {
    const response = await alertingService.getActiveAlerts();
    activeAlerts.value = response.data;
    if (activeAlerts.value.some(a => a.severity === 'critical')) playAlertSound();
  } catch (error) {
    console.error("Error al cargar alertas:", error);
  }
});

const criticalCount = computed(() => activeAlerts.value.filter(a => a.severity !== 'resolved' && a.severity !== 'escalated').length);

// Lógica combinada: Filtra primero, ordena después
const displayAlerts = computed(() => {
  // 1. Filtrado dinámico
  let filtered = activeAlerts.value;
  if (activeFilter.value === 'critical') {
    filtered = filtered.filter(a => a.severity === 'critical');
  } else if (activeFilter.value === 'unresolved') {
    filtered = filtered.filter(a => a.severity !== 'resolved');
  }

  // Auditoria: rango de fechas sobre la hora de creacion (US29)
  if (auditFrom.value) filtered = filtered.filter(a => String(a.createdAt).slice(0, 10) >= auditFrom.value);
  if (auditTo.value) filtered = filtered.filter(a => String(a.createdAt).slice(0, 10) <= auditTo.value);

  // 2. Orden cronológico dentro de la severidad, severidades agrupadas al frente
  return [...filtered].sort((a, b) => {
    const group = { critical: 0, warning: 1, escalated: 2, resolved: 3 };
    if (group[a.severity] !== group[b.severity]) return group[a.severity] - group[b.severity];

    const priorityWeight = { 'I': 3, 'II': 2, 'III': 1 };
    const weightA = priorityWeight[a.priority] || 0;
    const weightB = priorityWeight[b.priority] || 0;
    if (weightA !== weightB) return weightB - weightA;

    return String(a.createdAt).localeCompare(String(b.createdAt));
  });
});

const acknowledgeAlert = (id) => {
  confirm.require({
    message: t('alerting.confirmMsg'),
    header: t('alerting.confirmTitle'),
    icon: 'pi pi-exclamation-triangle',
    rejectProps: {
      label: t('alerting.no'),
      outlined: true,
      class: 'border-round-2xl px-4 py-2 text-gray-800 border-gray-300 hover:bg-gray-100'
    },
    acceptProps: {
      label: t('alerting.yes'),
      severity: 'danger',
      class: 'border-round-2xl px-4 py-2 border-none'
    },
    accept: async () => {
      const r = await alertingService.acknowledgeAlert(id, session.name || null);
      if (r.ok) {
        const i = activeAlerts.value.findIndex(a => String(a.id) === String(id));
        if (i !== -1) {
          activeAlerts.value[i] = r.data;
          if (!r.data.value.includes(t('alerting.backToNormal'))) {
            activeAlerts.value[i].value = `${t('alerting.backToNormal')} · ${r.data.value}`;
          }
        }
      }
    }
  });
};

const escalateToEmergency = async (id) => {
  const r = await alertingService.escalateAlert(id, {
    userId: session.name || null,
    to: 'Trauma Shock'
  });
  if (r.ok) {
    const i = activeAlerts.value.findIndex(a => String(a.id) === String(id));
    if (i !== -1) activeAlerts.value[i] = r.data;
  }
};
</script>

<template>
  <div class="p-4 w-full">

    <!-- Cabecera -->
    <div class="flex justify-content-between align-items-center mb-4 border-bottom-1 border-300 pb-3">
      <div>
        <h2 class="text-2xl font-bold text-gray-900 m-0">{{ $t('alerting.title') }}</h2>

        <!-- Botones de filtrado tipo píldora -->
        <div class="flex gap-2 mt-3">
          <button @click="activeFilter = 'all'"
                  class="border-none border-round-2xl px-3 py-1 text-xs font-bold cursor-pointer transition-colors"
                  :class="activeFilter === 'all' ? 'bg-gray-800 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'">
            {{ $t('alerting.filterAll') }}
          </button>
          <button @click="activeFilter = 'critical'"
                  class="border-none border-round-2xl px-3 py-1 text-xs font-bold cursor-pointer transition-colors"
                  :class="activeFilter === 'critical' ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'">
            {{ $t('alerting.filterCritical') }}
          </button>
          <button @click="activeFilter = 'unresolved'"
                  class="border-none border-round-2xl px-3 py-1 text-xs font-bold cursor-pointer transition-colors"
                  :class="activeFilter === 'unresolved' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'">
            {{ $t('alerting.filterUnresolved') }}
          </button>
        </div>
        <div class="flex gap-2 mt-2 align-items-center">
          <input type="date" v-model="auditFrom" class="p-inputtext p-component text-xs px-2 py-1 border-round-lg" :aria-label="t('alerting.auditFrom')" />
          <span class="text-xs text-gray-500">→</span>
          <input type="date" v-model="auditTo" class="p-inputtext p-component text-xs px-2 py-1 border-round-lg" :aria-label="t('alerting.auditTo')" />
        </div>
      </div>

      <div class="flex align-items-center gap-3">
        <span class="text-red-600 font-bold bg-red-100 px-3 py-1 border-round-2xl text-sm">
          {{ criticalCount }} {{ $t('alerting.active') }}
        </span>
        <div class="flex align-items-center gap-2">
          <span class="bg-green-100 text-green-800 font-bold flex align-items-center justify-content-center border-circle text-xs" style="width: 30px; height: 30px;">
            {{ nurseInitials }}
          </span>
          <span class="font-bold text-gray-800 text-sm">{{ nurseName }}</span>
        </div>
      </div>
    </div>

    <!-- Lista de Tarjetas (Usando displayAlerts) -->
    <div class="flex flex-column gap-3">
      <div v-for="alert in displayAlerts" :key="alert.id"
           class="surface-card p-4 shadow-1 border-round-xl flex flex-column gap-3 bg-white border-1"
           :class="{
             'border-red-400': alert.severity === 'critical',
             'border-orange-400': alert.severity === 'warning',
             'border-purple-400': alert.severity === 'escalated',
             'border-green-500': alert.severity === 'resolved'
           }">

        <!-- Primera fila: Nombre, Prioridad y Badge Sonora -->
        <div class="flex align-items-center gap-2">
          <i class="pi pi-circle-fill text-xs"
             :class="{'text-red-500': alert.severity === 'critical', 'text-orange-500': alert.severity === 'warning', 'text-green-500': alert.severity === 'resolved'}"></i>
          <span class="font-bold text-lg text-gray-900">{{ alert.patientName }}</span>

          <span class="bg-gray-200 text-gray-700 px-2 py-1 border-round-2xl text-xs font-bold"
                :class="{'bg-red-100 text-red-700': alert.severity === 'critical', 'bg-orange-100 text-orange-700': alert.severity === 'warning'}">
            {{ alert.priority }}
          </span>

          <span v-if="alert.severity === 'critical'" class="bg-red-100 text-red-600 px-2 py-1 border-round-2xl text-xs font-bold flex align-items-center gap-1 ml-2">
            <i class="pi pi-volume-up text-xs"></i> {{ $t('alerting.soundActive') }}
          </span>
          <span v-if="alert.severity === 'resolved'" class="bg-gray-200 text-gray-700 px-2 py-1 border-round-2xl text-xs font-bold ml-2">
            {{ $t('alerting.resolved') }}
          </span>
        </div>

        <!-- Segunda fila: Datos del paciente -->
        <div class="text-500 text-sm">
          {{ alert.vitalSign }} · DNI {{ alert.dni }} · {{ alert.episode }} · {{ $t('alerting.generated') }} {{ alert.time }}
        </div>

        <!-- Tercera fila: Valores -->
        <div class="text-sm font-medium">
          <span v-if="alert.severity === 'resolved'" class="text-green-600 flex align-items-center gap-2">
            <i class="pi pi-check-circle"></i> {{ alert.value }}
          </span>
          <template v-else>
            <span class="font-bold" :class="{'text-red-500': alert.severity === 'critical', 'text-orange-500': alert.severity === 'warning'}">
              {{ alert.value }}
            </span>
            <span class="text-500 ml-1">· {{ $t('alerting.safeRange') }} {{ alert.safeRange }}</span>
          </template>
        </div>

        <!-- Cuarta fila: Botones de Acción -->
        <div class="flex gap-3 mt-1" v-if="alert.severity !== 'resolved'">
          <button @click="acknowledgeAlert(alert.id)"
                  class="p-button p-component p-button-outlined bg-white text-gray-800 border-gray-300 border-round-2xl px-3 py-2 cursor-pointer hover:bg-gray-100 transition-colors">
            <span class="text-sm font-bold">{{ $t('alerting.acknowledge') }}</span>
          </button>

          <button @click="escalateToEmergency(alert.id)"
                  class="p-button p-component text-white border-none border-round-2xl px-3 py-2 cursor-pointer hover:opacity-90 transition-opacity"
                  style="background-color: #0b3d2c;">
            <span class="text-sm font-bold">{{ $t('alerting.escalate') }}</span>
          </button>
        </div>

      </div>
    </div>
    <ConfirmDialog
        :pt="{
          root: { class: 'border-round-2xl shadow-4 border-none' },
          header: { class: 'border-bottom-1 border-300 pb-3 pt-4 px-4' },
          content: { class: 'pt-4 px-4 text-gray-800 text-lg' },
          footer: { class: 'pt-3 pb-4 px-4' },
          mask: { class: 'bg-black-alpha-40' }
        }"
    ></ConfirmDialog>
  </div>
</template>