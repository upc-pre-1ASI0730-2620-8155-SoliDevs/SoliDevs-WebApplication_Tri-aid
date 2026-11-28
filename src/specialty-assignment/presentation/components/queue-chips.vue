<script setup>
/** Patients waiting per specialty. */
defineProps({
    queues: { type: Array, default: () => [] },
    label: { type: Function, required: true } // translates a specialty key into its display name
})
</script>

<template>
    <div class="qc-chips">
        <span v-for="q in queues" :key="q.key" class="qc-chip"><span>{{ label(q.key) }}</span><b>{{ q.waiting }}</b></span>
    </div>
</template>

<style scoped>
.qc-chips{display:grid;grid-template-columns:repeat(auto-fill,minmax(126px,1fr));gap:10px;margin-top:12px}
.qc-chip{border:1px solid var(--ta-line);border-radius:12px;padding:10px 14px;font-size:12.5px;background:#fff;display:flex;align-items:center;justify-content:space-between;gap:8px;min-width:0}
.qc-chip span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.qc-chip b{color:var(--ta-brand);background:#e8f3ec;border-radius:999px;padding:2px 10px;font-size:12px;line-height:1.3}
</style>
