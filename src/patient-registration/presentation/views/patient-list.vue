<script setup>
import { ref, computed } from 'vue'
import { store, ageOf, fmtDateTime } from '../../application/patient-store.js'
import { docLabel } from '../../application/document-types.js'
import { t, sexLabel } from '../../../shared/application/i18n.js'

const q = ref('')

const rows = computed(() => {
  const map = new Map()
  for (const e of store.episodes) {
    const r = map.get(e.key)
    if (r) { r.visits++; r.last = e } else map.set(e.key, { key: e.key, visits: 1, last: e })
  }
  return [...map.values()].sort((a, b) => b.last.arrival.localeCompare(a.last.arrival))
})

const filtered = computed(() => {
  const s = q.value.trim().toLowerCase()
  if (!s) return rows.value
  return rows.value.filter(r => {
    const p = r.last.patient
    return [p.names, p.surnames, p.dni, r.last.id].join(' ').toLowerCase().includes(s)
  })
})

const count = computed(() => rows.value.length === 0 ? t('pl.count.none') : rows.value.length === 1 ? t('pl.count.one') : t('pl.count.many', { n: rows.value.length }))
const visitsText = n => (n === 1 ? t('pl.visit.one') : t('pl.visit.many', { n }))
const initials = p => ((p.names[0] || '') + (p.surnames[0] || '')).toUpperCase()
const fullName = p => `${p.surnames}, ${p.names}`
</script>

<template>
  <div class="ta-page">
    <section class="ta-card">
      <div class="pl-top">
        <div>
          <h3 class="ta-h">{{ t('nav.patients') }}</h3>
          <p class="ta-sub">{{ count }}</p>
        </div>
        <router-link to="/patient-registration/new" class="ta-btn"><i class="pi pi-plus"></i>{{ t('pl.new') }}</router-link>
      </div>

      <div v-if="rows.length" class="pl-search">
        <i class="pi pi-search"></i>
        <input class="ta-input" v-model="q" :placeholder="t('pl.search')" :aria-label="t('pl.search')" />
      </div>

      <TransitionGroup v-if="filtered.length" name="list" tag="div" class="pl-list">
        <router-link v-for="r in filtered" :key="r.key" :to="`/patient-registration/${r.last.id}`" class="pl-row">
          <span class="pl-av">{{ initials(r.last.patient) }}</span>
          <div class="pl-who">
            <b>{{ fullName(r.last.patient) }}</b>
            <small>{{ docLabel(r.last.patient) }} · {{ ageOf(r.last.patient.birth) }} {{ t('yrs') }} · {{ sexLabel(r.last.patient.sex) }}</small>
          </div>
          <div class="pl-ep">
            <span>{{ r.last.id }}</span>
            <small>{{ fmtDateTime(r.last.arrival) }}</small>
          </div>
          <span class="pl-visits">{{ visitsText(r.visits) }}</span>
          <span v-if="r.last.classifiedLevelCode" class="pl-lv" :style="{ background: r.last.classifiedLevelColor }">{{ r.last.classifiedLevelCode }}</span>
          <span class="pl-st" :class="{ ok: r.last.referred, warn: r.last.confirmed && !r.last.referred }">
            {{ r.last.referred ? t('pl.status.referred') : (r.last.confirmed ? t('pl.status.toRefer') : t('pl.status.pending')) }}
          </span>
          <i class="pi pi-angle-right pl-go"></i>
        </router-link>
      </TransitionGroup>

      <div v-else class="pl-empty">
        <i class="pi pi-users"></i>
        <b>{{ rows.length ? t('pl.noResults') : t('pl.empty') }}</b>
        <p>{{ rows.length ? t('pl.noResults.hint') : t('pl.empty.hint') }}</p>
      </div>
    </section>
  </div>
</template>

<style>
.pl-top{display:flex;align-items:flex-start;justify-content:space-between;gap:14px}
.pl-top .ta-btn{text-decoration:none}
.pl-search{position:relative;margin-bottom:14px}
.pl-search i{position:absolute;left:13px;top:50%;transform:translateY(-50%);font-size:13px;color:var(--ta-muted);pointer-events:none}
.pl-search .ta-input{padding-left:36px}
.pl-list{display:grid;gap:8px}
.pl-row{display:grid;grid-template-columns:36px minmax(0,1.6fr) minmax(0,1fr) auto auto 14px;gap:14px;align-items:center;padding:12px 14px;border:1px solid var(--ta-line);border-radius:12px;background:#fff;text-decoration:none;color:var(--ta-text);transition:border-color .2s,transform .2s,box-shadow .2s}
.pl-row:hover{border-color:var(--ta-brand);transform:translateY(-1px);box-shadow:0 8px 20px -10px rgba(10,107,56,.35)}
.pl-row:focus-visible{outline:2px solid var(--ta-accent);outline-offset:2px}
.pl-av{width:36px;height:36px;border-radius:10px;background:#d6eedd;color:var(--ta-brand);display:grid;place-items:center;font-size:12px;font-weight:600}
.pl-who,.pl-ep{display:grid;min-width:0}
.pl-who b{font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pl-who small,.pl-ep small{font-size:11px;color:var(--ta-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pl-ep span{font-family:var(--ta-mono);font-size:11.5px}
.pl-ep small{font-family:var(--ta-mono);font-size:10px}
.pl-visits{font-size:11px;color:var(--ta-muted);white-space:nowrap}
.pl-st{font-size:11px;padding:3px 10px;border-radius:999px;background:#eef0f2;color:var(--ta-muted);white-space:nowrap}
.pl-st.warn{background:#fff4e5;color:#b45309}
.pl-lv{color:#fff;font-weight:700;font-size:10.5px;border-radius:999px;padding:3px 9px}
.pl-st.ok{background:#e3f3ea;color:var(--ta-brand)}
.pl-go{font-size:14px;color:var(--ta-muted);transition:transform .2s,color .2s}
.pl-row:hover .pl-go{transform:translateX(3px);color:var(--ta-brand)}
.pl-empty{display:grid;justify-items:center;gap:6px;padding:34px 12px 18px;text-align:center}
.pl-empty>i{width:48px;height:48px;border-radius:14px;background:#e3f3ea;color:var(--ta-brand);font-size:20px;display:grid;place-items:center;margin-bottom:6px}
.pl-empty b{font-size:14px;font-weight:600}
.pl-empty p{margin:0 0 10px;font-size:12px;color:var(--ta-muted)}
.pl-empty .ta-btn{text-decoration:none}
@media(max-width:760px){.pl-row{grid-template-columns:36px minmax(0,1fr) 14px}.pl-ep,.pl-visits,.pl-st{display:none}}
</style>