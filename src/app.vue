<script setup>
import TheSidebar from './shared/presentation/components/sidebar.vue';
</script>

<template>
  <div class="flex min-h-screen surface-ground">


    <TheSidebar />


    <main class="flex-grow-1 p-4 overflow-auto">
      <h1 class="text-primary">Tri-Aid Workspace</h1>
      <p>Aquí se renderizarán todas las pantallas mediante Vue Router.</p>
    </main>

  </div>
</template>

<style>
body {
  margin: 0;
  font-family: var(--font-family, sans-serif);
}
</style>