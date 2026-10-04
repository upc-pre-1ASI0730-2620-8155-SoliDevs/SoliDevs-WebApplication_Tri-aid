<script setup>
/** Patients waiting per specialty (US34). */
defineProps({
    queues: { type: Array, default: () => [] },
    label: { type: Function, required: true } // translates a specialty key into its display name
})
</script>

<template>
    <div class="qc-chips">
        <span v-for="q in queues" :key="q.key" class="qc-chip">{{ label(q.key) }} <b>{{ q.waiting }}</b></span>
    </div>
</template>

<style scoped>
.qc-chips{display:flex;flex-wrap:wrap;gap:10px;margin-top:12px}
.qc-chip{border:1px solid var(--ta-line);border-radius:999px;padding:6px 14px;font-size:12.5px;background:#fff;display:inline-flex;gap:8px}
.qc-chip b{color:var(--ta-brand)}
</style>
