<script setup>
/**
 * Autocomplete for the coded symptom catalog.
 * The user searches by name (ES/EN) and the CODE travels, not the free text.
 */
import { ref, computed, onMounted } from 'vue'
import { SpecialtyAssignmentApi } from '../../infrastructure/specialty-assignment-api.js'
import { t } from '../../../shared/application/i18n.js'

const props = defineProps({
    modelValue: { type: Object, default: null }, // selected symptom {id, es, en, specialty}
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
