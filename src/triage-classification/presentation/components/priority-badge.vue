<script setup>
// Insignia visual del nivel de prioridad: circulo con el codigo, nombre y descripcion.
defineProps({
    level: { type: Object, required: true } // { code, name, desc }
})
</script>

<template>
    <div class="pb-wrap">
        <div class="pb-circle" :style="{ background: level.color }">{{ level.code }}</div>
        <div class="pb-name">{{ level.name }}</div>
        <p class="pb-desc">{{ level.desc }}</p>
    </div>
</template>

<style scoped>
.pb-wrap{display:grid;justify-items:center;text-align:center;gap:6px}
.pb-circle{width:64px;height:64px;border-radius:50%;display:grid;place-items:center;font-size:24px;font-weight:700;color:#fff}
.pb-name{font-size:17px;font-weight:600}
.pb-desc{margin:0;font-size:12.5px;color:var(--ta-muted);line-height:1.5;max-width:34ch}
</style>
