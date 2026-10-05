<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useConfirm } from 'primevue/useconfirm';
import { AlertingService } from '../../infrastructure/alerting.service.js';
import { session } from '../../../shared/application/demo-session.js';

const { t } = useI18n();
const confirm = useConfirm();
const activeAlerts = ref([]);
const alertingService = new AlertingService();
const router = useRouter();

// Variable para controlar el filtro seleccionado por defecto
const activeFilter = ref('all');

// Auditoria cronologica por rango de fechas (US29)
const auditFrom = ref('');
const auditTo = ref('');

// Notificacion sonora real (US26): bip de dos tonos via WebAudio.
function playAlertSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(660, ctx.currentTime + 0.18);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.connect(gain).connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.4);
  } catch (e) { /* audio no disponible */ }
}

const nurseName = computed(() => session.name || t('alerting.nurse'));
const nurseInitials = computed(() => (session.name || t('alerting.nurse'))
  .split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase());

onMounted(async () => {
  try {
    const response = await alertingService.getActiveAlerts();
    activeAlerts.value = response.data;
    if (activeAlerts.value.some(a => a.severity === 'critical')) playAlertSound();
  } catch (error) {
    console.error("Error al cargar alertas:", error);
  }
});

const criticalCount = computed(() => activeAlerts.value.filter(a => a.severity !== 'resolved' && a.severity !== 'escalated').length);

// Lógica combinada: Filtra primero, ordena después
const displayAlerts = computed(() => {
  // 1. Filtrado dinámico
  let filtered = activeAlerts.value;
  if (activeFilter.value === 'critical') {
    filtered = filtered.filter(a => a.severity === 'critical');
  } else if (activeFilter.value === 'unresolved') {
    filtered = filtered.filter(a => a.severity !== 'resolved');
  }

  // Auditoria: rango de fechas sobre la hora LOCAL de creacion (US29)
  const localDay = a => new Date(a.createdAt).toLocaleDateString('en-CA');
  if (auditFrom.value) filtered = filtered.filter(a => localDay(a) >= auditFrom.value);
  if (auditTo.value) filtered = filtered.filter(a => localDay(a) <= auditTo.value);

  // 2. Orden cronológico dentro de la severidad, severidades agrupadas al frente
  return [...filtered].sort((a, b) => {
    const group = { critical: 0, warning: 1, escalated: 2, resolved: 3 };
    if (group[a.severity] !== group[b.severity]) return group[a.severity] - group[b.severity];

    const priorityWeight = { 'I': 3, 'II': 2, 'III': 1 };
    const weightA = priorityWeight[a.priority] || 0;
    const weightB = priorityWeight[b.priority] || 0;
    if (weightA !== weightB) return weightB - weightA;

    return String(a.createdAt).localeCompare(String(b.createdAt));
  });
});

const acknowledgeAlert = (id) => {
  confirm.require({
    message: t('alerting.confirmMsg'),
    header: t('alerting.confirmTitle'),
    icon: 'pi pi-exclamation-triangle',
    rejectProps: {
      label: t('alerting.no'),
      outlined: true,
      class: 'border-round-2xl px-4 py-2 text-gray-800 border-gray-300 hover:bg-gray-100'
    },
    acceptProps: {
      label: t('alerting.yes'),
      severity: 'danger',
      class: 'border-round-2xl px-4 py-2 border-none'
    },
    accept: async () => {
      const r = await alertingService.acknowledgeAlert(id, session.name || null);
      if (r.ok) {
        const i = activeAlerts.value.findIndex(a => String(a.id) === String(id));
        if (i !== -1) {
          activeAlerts.value[i] = r.data;
          if (!r.data.value.includes(t('alerting.backToNormal'))) {
            activeAlerts.value[i].value = `${t('alerting.backToNormal')} · ${r.data.value}`;
          }
        }
      }
    }
  });
};

const escalateToEmergency = async (id) => {
  const r = await alertingService.escalateAlert(id, {
    userId: session.name || null,
    to: 'Trauma Shock'
  });
  if (r.ok) {
    const i = activeAlerts.value.findIndex(a => String(a.id) === String(id));
    if (i !== -1) activeAlerts.value[i] = r.data;
  }
};
</script>

<template>
  <div class="ta-page al-page">
    <!-- Cabecera: titulo, filtros, auditoria y enfermera de turno -->
    <section class="ta-card al-head al-in" style="--d:0">
      <div class="al-head__main">
        <h3 class="ta-h">{{ t('alerting.title') }}</h3>

        <div class="al-filters">
          <button class="al-pill" :class="{ on: activeFilter === 'all' }" @click="activeFilter = 'all'">
            {{ t('alerting.filterAll') }}
          </button>
          <button class="al-pill al-pill--critical" :class="{ on: activeFilter === 'critical' }" @click="activeFilter = 'critical'">
            {{ t('alerting.filterCritical') }}
          </button>
          <button class="al-pill" :class="{ on: activeFilter === 'unresolved' }" @click="activeFilter = 'unresolved'">
            {{ t('alerting.filterUnresolved') }}
          </button>
        </div>

        <div class="al-audit">
          <input type="date" v-model="auditFrom" class="ta-input al-date" :aria-label="t('alerting.auditFrom')" />
          <span class="al-audit-arrow">→</span>
          <input type="date" v-model="auditTo" class="ta-input al-date" :aria-label="t('alerting.auditTo')" />
        </div>
      </div>

      <div class="al-nurse">
        <span class="al-count" :class="{ crit: criticalCount > 0 }">{{ criticalCount }} {{ t('alerting.active') }}</span>
        <span class="al-av">{{ nurseInitials }}</span>
        <span class="al-nname">{{ nurseName }}</span>
      </div>
    </section>

    <!-- Tarjetas de alertas -->
    <TransitionGroup name="al" tag="div" class="al-stack">
      <article v-for="alert in displayAlerts" :key="alert.id"
               class="ta-card al-card"
               :class="'sev--' + alert.severity">

        <div class="al-row">
          <i class="pi pi-circle-fill al-dot"></i>
          <span class="al-name">{{ alert.patientName }}</span>
          <span class="al-prio">{{ alert.priority }}</span>
          <span v-if="alert.severity === 'critical'" class="al-sound">
            <i class="pi pi-volume-up"></i>{{ t('alerting.soundActive') }}
          </span>
          <span v-if="alert.severity === 'escalated'" class="al-esc">{{ alert.escalatedTo }}</span>
          <span v-if="alert.severity === 'resolved'" class="al-res">{{ t('alerting.resolved') }}</span>
        </div>

        <div class="al-meta">
          {{ alert.vitalSign }} · DNI {{ alert.dni }} · {{ alert.episode }} · {{ t('alerting.generated') }} {{ alert.time }}
        </div>

        <div class="al-value">
          <span v-if="alert.severity === 'resolved'" class="al-ok"><i class="pi pi-check-circle"></i> {{ alert.value }}</span>
          <template v-else>
            <b class="al-val">{{ alert.value }}</b>
            <span class="al-safe">· {{ t('alerting.safeRange') }} {{ alert.safeRange }}</span>
          </template>
        </div>

        <div class="al-actions" v-if="alert.severity !== 'resolved'">
          <button class="ta-btn ta-btn--ghost ta-btn--sm" @click="acknowledgeAlert(alert.id)">
            {{ t('alerting.acknowledge') }}
          </button>
          <button class="ta-btn ta-btn--sm al-btn-esc" @click="escalateToEmergency(alert.id)">
            {{ t('alerting.escalate') }}
          </button>
        </div>
      </article>
    </TransitionGroup>

    <p v-if="!displayAlerts.length" class="ta-card al-none">{{ t('bell.empty') }}</p>

    <ConfirmDialog
        :pt="{
          root: { class: 'border-round-2xl shadow-4 border-none' },
          header: { class: 'border-bottom-1 border-300 pb-3 pt-4 px-4' },
          content: { class: 'pt-4 px-4 text-gray-800 text-lg' },
          footer: { class: 'pt-3 pb-4 px-4' },
          mask: { class: 'bg-black-alpha-40' }
        }"
    ></ConfirmDialog>
  </div>
</template>

<style scoped>
.al-page{display:grid;gap:16px}
.al-head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;padding:16px 20px;flex-wrap:wrap}
.al-head__main{display:grid;gap:12px}
.al-filters{display:flex;gap:8px;flex-wrap:wrap}
.al-pill{border:1px solid var(--ta-line);background:#fff;color:var(--ta-muted);font:inherit;font-size:11px;font-weight:600;padding:4px 12px;border-radius:999px;cursor:pointer;transition:all .15s ease}
.al-pill:hover{border-color:var(--ta-brand);color:var(--ta-brand)}
.al-pill.on{background:var(--ta-ink);border-color:var(--ta-ink);color:#fff}
.al-pill--critical.on{background:#b42318;border-color:#b42318;color:#fff}
.al-audit{display:flex;align-items:center;gap:8px}
.al-date{height:32px;font-size:11.5px;width:auto;padding:0 8px}
.al-audit-arrow{color:var(--ta-muted);font-size:11px}
.al-nurse{display:flex;align-items:center;gap:10px}
.al-count{font-size:12px;font-weight:600;padding:4px 12px;border-radius:999px;background:#eef0f2;color:var(--ta-muted)}
.al-count.crit{background:var(--ta-danger-bg);color:var(--ta-danger)}
.al-av{width:30px;height:30px;border-radius:50%;background:#e3f3ea;color:var(--ta-brand);display:grid;place-items:center;font-size:10.5px;font-weight:700}
.al-nname{font-size:12.5px;font-weight:600;color:var(--ta-text)}
.al-stack{display:grid;gap:12px}
.al-card{display:grid;gap:8px;padding:16px 18px;border-left:4px solid var(--ta-line)}
.al-card.sev--critical{border-left-color:#b42318;background:var(--ta-danger-bg)}
.al-card.sev--warning{border-left-color:#d97706}
.al-card.sev--escalated{border-left-color:#6d28d9}
.al-card.sev--resolved{border-left-color:var(--ta-brand)}
.al-row{display:flex;align-items:center;gap:9px;flex-wrap:wrap}
.al-dot{font-size:8px;color:var(--ta-muted)}
.sev--critical .al-dot{color:#b42318;animation:al-pulse 1.6s infinite}
.sev--warning .al-dot{color:#d97706}
.sev--escalated .al-dot{color:#6d28d9}
.sev--resolved .al-dot{color:var(--ta-brand)}
@keyframes al-pulse{0%{opacity:1}50%{opacity:.35}100%{opacity:1}}
.al-name{font-size:14px;font-weight:600;color:var(--ta-text)}
.al-prio{font-size:10.5px;font-weight:700;padding:2px 8px;border-radius:999px;background:#eef0f2;color:var(--ta-muted)}
.al-sound{display:inline-flex;align-items:center;gap:5px;font-size:10.5px;font-weight:600;color:#b42318;background:#fee4e2;border-radius:999px;padding:3px 9px}
.al-esc{font-size:10.5px;font-weight:600;color:#6d28d9;background:#ede9fe;border-radius:999px;padding:3px 9px}
.al-res{font-size:10.5px;color:var(--ta-muted)}
.al-meta{font-family:var(--ta-mono);font-size:10px;color:var(--ta-muted)}
.al-value{font-size:13px;display:flex;align-items:center;gap:6px}
.al-val{font-weight:600}
.sev--critical .al-val{color:#b42318}
.sev--warning .al-val{color:#d97706}
.al-safe{color:var(--ta-muted);font-size:11.5px}
.al-ok{color:var(--ta-brand);display:inline-flex;align-items:center;gap:6px}
.al-actions{display:flex;gap:10px;margin-top:2px}
.al-btn-esc{background:var(--ta-ink);border-color:var(--ta-ink);color:#fff}
.al-btn-esc:hover{background:#000;border-color:#000}
.al-none{padding:22px;text-align:center;color:var(--ta-muted);font-size:12.5px}

/* animaciones de entrada/salida de las tarjetas */
.al-enter-active{transition:opacity .3s ease,transform .3s cubic-bezier(.2,.9,.3,1.1)}
.al-leave-active{transition:opacity .18s ease,transform .18s ease;position:absolute;width:100%}
.al-enter-from,.al-leave-to{opacity:0;transform:translateY(8px)}
.al-move{transition:transform .3s ease}
</style>
