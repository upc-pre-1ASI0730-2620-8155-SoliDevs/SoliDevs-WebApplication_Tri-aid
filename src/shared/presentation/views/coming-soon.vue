<script setup>
import { useRoute } from 'vue-router'
const route = useRoute()
</script>

<template>
  <div class="ta-page">
    <section class="ta-card">
      <h3 class="ta-h">{{ route.meta.title }}</h3>
      <p class="ta-sub" style="margin:0">Módulo en desarrollo.</p>
    </section>
  </div>
</template>