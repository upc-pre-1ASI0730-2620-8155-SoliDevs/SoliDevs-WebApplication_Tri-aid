<script setup>
// Banner de paciente reutilizable por los bounded contexts del flujo clinico.
defineProps({
    initials: { type: String, required: true },
    name: { type: String, required: true },
    meta: { type: String, default: '' },
    badge: { type: String, default: '' },
    badgeColor: { type: String, default: '' }
})
</script>

<template>
    <section class="ta-card pb-head">
        <span class="pb-av">{{ initials }}</span>
        <div class="pb-id">
            <div class="fi-name">{{ name }}</div>
            <div class="fi-meta">{{ meta }}</div>
        </div>
        <span v-if="badge" class="fi-pill" :class="{ done: badgeColor }" :style="badgeColor ? { borderColor: badgeColor, color: badgeColor } : {}">{{ badge }}</span>
        <slot></slot>
    </section>
</template>

<style scoped>
.pb-head{display:flex;align-items:center;gap:14px;padding:16px 20px}
.pb-av{width:42px;height:42px;border-radius:50%;background:#e3f3ea;color:var(--ta-brand);display:grid;place-items:center;font-weight:600;flex:none}
.pb-id{display:grid;gap:2px;flex:1;min-width:0}
.fi-name{font-size:14.5px;font-weight:600}
.fi-meta{font-family:var(--ta-mono);font-size:10.5px;color:var(--ta-muted)}
.fi-pill{font-size:11px;padding:3px 10px;border-radius:999px;background:#eef0f2;color:var(--ta-muted);white-space:nowrap}
.fi-pill.done{background:#e3f3ea;color:var(--ta-brand);border:1.5px solid}
</style>
