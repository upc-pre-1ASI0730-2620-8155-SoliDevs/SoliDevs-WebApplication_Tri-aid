<script setup>
import { ref } from 'vue';

// Rutas basadas en tus Bounded Contexts
const menuItems = ref([
  { label: 'Cola de Triaje', icon: 'pi pi-list', route: '/triage-queue' },
  { label: 'Registro de Paciente', icon: 'pi pi-user-plus', route: '/patient-registration' },
  { label: 'Centro de Alertas', icon: 'pi pi-bell', route: '/alerting' },
  { label: 'Derivación', icon: 'pi pi-directions', route: '/speciality-assignment' },
  { label: 'Suscripción', icon: 'pi pi-credit-card', route: '/subscriptions' },
  { label: 'Portal Paciente', icon: 'pi pi-mobile', route: '/patient-portal' }
]);
</script>

<template>
  <aside class="w-18rem min-h-screen flex flex-column text-white" style="background-color: #0b3d2c;">

    <!-- Header del Sidebar -->
    <div class="p-4 flex align-items-center justify-content-center border-bottom-1 border-gray-700">
      <h2 class="m-0 font-bold">TRI-AID</h2>
    </div>

    <!-- Navegación -->
    <div class="flex-grow-1 py-4">
      <ul class="list-none p-0 m-0">
        <li v-for="item in menuItems" :key="item.label" class="mb-2">
          <!-- Próximamente cambiaremos esta etiqueta 'a' por 'router-link' -->
          <a class="flex align-items-center cursor-pointer p-3 hover:bg-white-alpha-10 transition-colors border-round mx-2 text-white no-underline">
            <i :class="item.icon" class="mr-3 text-xl"></i>
            <span class="font-medium">{{ item.label }}</span>
          </a>
        </li>
      </ul>
    </div>

    <!-- Cierre de sesión -->
    <div class="p-4 border-top-1 border-gray-700">
      <a class="flex align-items-center cursor-pointer p-2 hover:bg-white-alpha-10 transition-colors border-round text-white">
        <i class="pi pi-sign-out mr-3 text-xl"></i>
        <span class="font-medium">Cerrar sesión</span>
      </a>
    </div>

  </aside>
</template>