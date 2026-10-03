<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { AlertingService } from '../../infrastructure/alerting.service.js';

const activeAlerts = ref([]);
const alertingService = new AlertingService();
const router = useRouter();

onMounted(async () => {
  try {
    const response = await alertingService.getActiveAlerts();
    activeAlerts.value = response.data;
  } catch (error) {
    console.error("Error al cargar alertas:", error);
  }
});

const criticalCount = computed(() => activeAlerts.value.filter(a => a.severity !== 'resolved').length);

// 1. Lógica del botón "Reconocer alerta"
const acknowledgeAlert = (id) => {
  const alertIndex = activeAlerts.value.findIndex(a => a.id === id);
  if (alertIndex !== -1) {
    // Cambiamos el estado localmente para simular la actualización del backend
    activeAlerts.value[alertIndex].severity = 'resolved';
    activeAlerts.value[alertIndex].value = 'Valor regresó al rango seguro · ' + activeAlerts.value[alertIndex].value;
  }
};

// 2. Lógica del botón "Escalar a atención inmediata"
const escalateToEmergency = (id) => {
  console.log(`Derivando alerta ${id} a Trauma Shock...`);
  // Redirigimos al Bounded Context correspondiente (ej. reports o derivación)
  router.push('/reports');
};
</script>

<template>
  <div class="p-4 w-full">

    <!-- Cabecera idéntica al mockup -->
    <div class="flex justify-content-between align-items-center mb-4 border-bottom-1 border-300 pb-3">
      <h2 class="text-2xl font-bold text-gray-900 m-0">Centro de alertas</h2>

      <div class="flex align-items-center gap-3">
        <span class="text-red-600 font-bold bg-red-100 px-3 py-1 border-round-2xl text-sm">
          {{ criticalCount }} activas
        </span>
        <div class="flex align-items-center gap-2">
          <span class="bg-green-100 text-green-800 font-bold flex align-items-center justify-content-center border-circle text-xs" style="width: 30px; height: 30px;">
            RP
          </span>
          <span class="font-bold text-gray-800 text-sm">Enf. Rocío Paredes</span>
        </div>
      </div>
    </div>

    <!-- Lista de Tarjetas (Diseño Refinado) -->
    <div class="flex flex-column gap-3">
      <div v-for="alert in activeAlerts" :key="alert.id"
           class="surface-card p-4 shadow-1 border-round-xl flex flex-column gap-3 bg-white border-1"
           :class="{
             'border-red-400': alert.severity === 'critical',
             'border-orange-400': alert.severity === 'warning',
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
            <i class="pi pi-volume-up text-xs"></i> Alerta sonora activa
          </span>
          <span v-if="alert.severity === 'resolved'" class="bg-gray-200 text-gray-700 px-2 py-1 border-round-2xl text-xs font-bold ml-2">
            Resuelta
          </span>
        </div>

        <!-- Segunda fila: Datos del paciente -->
        <div class="text-500 text-sm">
          {{ alert.vitalSign }} · DNI {{ alert.dni }} · {{ alert.episode }} · generada {{ alert.time }}
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
            <span class="text-500 ml-1">· rango seguro {{ alert.safeRange }}</span>
          </template>
        </div>

        <!-- Cuarta fila: Botones de Acción -->
        <div class="flex gap-3 mt-1" v-if="alert.severity !== 'resolved'">
          <button @click="acknowledgeAlert(alert.id)"
                  class="p-button p-component p-button-outlined bg-white text-gray-800 border-gray-300 border-round-2xl px-3 py-2 cursor-pointer hover:bg-gray-100 transition-colors">
            <span class="text-sm font-bold">Reconocer alerta</span>
          </button>

          <button @click="escalateToEmergency(alert.id)"
                  class="p-button p-component text-white border-none border-round-2xl px-3 py-2 cursor-pointer hover:opacity-90 transition-opacity"
                  style="background-color: #0b3d2c;">
            <span class="text-sm font-bold">Escalar a atención inmediata</span>
          </button>
        </div>

      </div>
    </div>
  </div>
</template>