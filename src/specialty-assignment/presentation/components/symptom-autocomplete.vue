<script setup>
/**
 * Autocomplete for the coded symptom catalog.
 * The user searches by name (ES/EN) and the CODE travels, not the free text.
 */
import { ref, computed, onMounted } from 'vue'
import { SpecialtyAssignmentApi } from '../../infrastructure/specialty-assignment-api.js'
import { t } from '../../../shared/application/i18n.js'

const props = defineProps({
    modelValue: { type: Object, default: null }
    error: { type: Boolean, default: false }
})
const emit = defineEmits(['update:modelValue'])

const api = new SpecialtyAssignmentApi()
const catalog = ref([])
const query = ref('')
const open = ref(false)

const label = s => s[locale()] || s.es
const locale = () => (t('lang.label') === 'Idioma' ? 'es' : 'en')
const selectedSymptom = computed(() => props.modelValue)
const filtered = computed(() => {
    const q = query.value.trim().toLowerCase()
    if (!q) return []
    return catalog.value
        .filter(s => s.es.toLowerCase().includes(q) || s.en.toLowerCase().includes(q))
        .slice(0, 8)
})

onMounted(async () => {
    try {
        const r = await api.getSymptoms()
        catalog.value = r.data || []
        if (props.modelValue) query.value = label(props.modelValue)
    } catch (e) { console.error(e) }
})

function pick(s) {
    emit('update:modelValue', s)
    query.value = label(s)
    open.value = false
}
</script>

<template>
    <div class="sa-wrap">
        <input
            id="symptom"
            class="ta-input sa-input"
            :class="{ bad: error }"
            v-model="query"
            :placeholder="t('referral.symptomPh')"
            autocomplete="off"
            @focus="open = true"
            @input="open = true"
            @keyup.enter="filtered.length && pick(filtered[0])"
        />
        <ul v-if="open && filtered.length" class="sa-dropdown">
            <li v-for="s in filtered" :key="s.id" @mousedown.prevent="pick(s)">
                <code>{{ s.id }}</code> {{ label(s) }}
            </li>
        </ul>
        <p v-if="selectedSymptom" class="sa-selected"><i class="pi pi-check-circle"></i>{{ selectedSymptom.id }} — {{ label(selectedSymptom) }}</p>
    </div>
</template>

<style scoped>
.sa-wrap{position:relative}
.sa-input{width:100%}
.sa-dropdown{position:absolute;top:calc(100% + 6px);left:0;right:0;background:#fff;border:1px solid var(--ta-line);border-radius:12px;list-style:none;margin:0;padding:6px;z-index:20;max-height:250px;overflow:auto;box-shadow:0 16px 38px rgba(10,40,25,.16)}
.sa-dropdown li{display:flex;gap:10px;align-items:center;padding:10px 12px;font-size:12.5px;cursor:pointer;border-radius:8px;transition:background .15s ease,padding-left .15s ease}
.sa-dropdown li:hover{background:#eef7f2;padding-left:16px}
.sa-dropdown li code{font-family:var(--ta-mono);font-size:10px;color:var(--ta-brand);background:#e3f3ea;border-radius:999px;padding:2px 8px}
.sa-empty{position:absolute;top:calc(100% + 6px);left:0;right:0;background:#fff;border:1px solid var(--ta-line);border-radius:12px;padding:12px 14px;font-size:12px;color:var(--ta-muted);z-index:20;box-shadow:0 16px 38px rgba(10,40,25,.16)}
.sa-selected{margin:8px 0 0;font-size:12px;color:var(--ta-brand);display:flex;align-items:center;gap:6px}

/* dropdown and selected-chip animations */
.dd-enter-active{transition:opacity .18s ease,transform .18s cubic-bezier(.2,.9,.3,1.2)}
.dd-leave-active{transition:opacity .12s ease,transform .12s ease}
.dd-enter-from,.dd-leave-to{opacity:0;transform:translateY(-6px) scale(.98)}
.sel-enter-active{transition:opacity .25s ease .05s,transform .25s cubic-bezier(.2,.9,.3,1.2) .05s}
.sel-enter-from{opacity:0;transform:translateY(4px)}
</style>
