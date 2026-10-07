<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { gsap } from 'gsap';
import { AlertingService } from '../../infrastructure/alerting.service.js';
import { SpecialtyAssignmentService } from '../../../specialty-assignment/infrastructure/specialty-assignment.service.js';
import { findEpisode, saveEpisode } from '../../../patient-registration/application/patient-store.js';
import { releaseEpisodeDevices } from '../../../vital-signs-capture/application/vitals-store.js';
import { session } from '../../../shared/application/demo-session.js';
import { notify } from '../../../shared/application/toast-store.js';

const { t } = useI18n();
const activeAlerts = ref([]);
const alertingService = new AlertingService();
const router = useRouter();
const doneId = ref(null);
const pendingId = ref(null);
const reduce = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

/** Combined logic: filter first, sort afterwards. */
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
  pendingId.value = id;
};

const pendingEsc = ref(null);
const escalateAlertPrompt = (id) => { pendingEsc.value = id; };
const cancelEscalate = () => { pendingEsc.value = null; };
const specialtyService = new SpecialtyAssignmentService();

const confirmEscalate = async () => {
  const alert = activeAlerts.value.find(a => String(a.id) === String(pendingEsc.value));
  pendingEsc.value = null;
  if (!alert) return;
  try {
    // Direct emergency referral to the Trauma Shock critical care room
    const specs = await specialtyService.getSpecialties();
    const trauma = (specs.data || []).find(s => s.key === 'TraumaShock');
    if (trauma) {
      const r = await specialtyService.refer(alert.episode, {
        specialtyRef: trauma,
        symptom: `EMERGENCIA — ${alert.vitalSign} ${alert.value}`
      });
      if (!r.ok) { notify({ type: 'error', title: t(r.error) }); return; }
      const ep = findEpisode(alert.episode);
      if (ep) { ep.referred = true; saveEpisode(ep); }
    }
    // Seal this alert as escalated and close the remaining ones
    const up = await alertingService.escalateAlert(alert.id, { userId: session.name || null, to: 'Trauma Shock' });
    if (up.ok) {
      const i = activeAlerts.value.findIndex(a => String(a.id) === String(alert.id));
      if (i !== -1) activeAlerts.value[i] = up.data;
    }
    await alertingService.resolveByEpisode(alert.episode);
    releaseEpisodeDevices(alert.episode);
    notify({ type: 'success', title: t('alerting.escDone'), detail: 'Trauma Shock · TS-1' });
  } catch (e) { console.error(e); notify({ type: 'error', title: t('alerting.escError') }); }
};

const cancelAcknowledge = () => { pendingId.value = null; };

const confirmAcknowledge = async () => {
  const id = pendingId.value;
  pendingId.value = null;

  // 1) Celebrar primero, con la tarjeta en su posicion actual
  doneId.value = id;
  await new Promise(r => setTimeout(r, 1500));

  // 2) Recien entonces actualizar el estado (la tarjeta se mueve/desaparece)
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
  setTimeout(() => { if (String(doneId.value) === String(id)) doneId.value = null; }, 400);
};

/** GSAP enter/leave animations (based on the gsap-alert-animation repository). */
const onCardEnter = (el, done) => {
  if (reduce()) { done(); return; }
  gsap.fromTo(el, { opacity: 0, y: -14 }, { opacity: 1, y: 0, duration: 0.45, ease: 'power3.out', clearProps: 'transform,opacity', onComplete: done });
};

const onCardLeave = (el, done) => {
  if (reduce()) { done(); return; }
  gsap.set(el, { overflow: 'hidden' });
  gsap.timeline({ onComplete: done })
    .to(el, { x: 56, opacity: 0, scale: 0.97, duration: 0.4, ease: 'power3.in' })
    .to(el, { height: 0, paddingTop: 0, paddingBottom: 0, marginBottom: 0, borderWidth: 0, duration: 0.35, ease: 'power2.inOut' }, '-=0.1');
};

const onModalEnter = (el, done) => {
  const box = el.querySelector('.al-dialog');
  const ico = el.querySelector('.al-dialog__ico');
  const rows = el.querySelectorAll('.al-dialog__title, .al-dialog__msg, .al-dialog__actions');
  if (reduce()) { done(); return; }
  gsap.timeline({ onComplete: done })
    .fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: 'power1.out' })
    .fromTo(box, { y: 28, scale: 0.92, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(1.6)' }, 0)
    .fromTo(ico, { scale: 0, rotate: -40 }, { scale: 1, rotate: 0, duration: 0.5, ease: 'back.out(2.4)' }, 0.12)
    .fromTo(rows, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.35, stagger: 0.06, ease: 'power3.out' }, 0.18);
};

const onModalLeave = (el, done) => {
  if (reduce()) { done(); return; }
  const box = el.querySelector('.al-dialog');
  gsap.timeline({ onComplete: done })
    .to(box, { y: 16, scale: 0.95, opacity: 0, duration: 0.2, ease: 'power2.in' })
    .to(el, { opacity: 0, duration: 0.2, ease: 'power1.in' }, 0.05);
};

const onDoneEnter = (el, done) => {
  const svg = el.querySelector('.al-done__svg');
  const disc = el.querySelector('.al-done__disc');
  const tick = el.querySelector('.al-done__tick');
  const pulse = el.querySelector('.al-done__pulse');
  const txt = el.querySelector('.al-done__txt');
  if (reduce()) {
    gsap.set(el, { clipPath: 'none' });
    done();
    return;
  }
  gsap.set(tick, { strokeDasharray: 1, strokeDashoffset: 1 });
  gsap.set(disc, { scale: 0, transformOrigin: '50% 50%' });
  gsap.set(pulse, { scale: 1, opacity: 0, transformOrigin: '50% 50%' });
  gsap.set(txt, { opacity: 0, y: 8 });
  gsap.timeline({ onComplete: done })
    .fromTo(el, { clipPath: 'circle(0% at 14% 88%)' }, { clipPath: 'circle(150% at 14% 88%)', duration: 0.6, ease: 'power3.inOut' })
    .to(disc, { scale: 1, duration: 0.5, ease: 'back.out(2)' }, 0.3)
    .to(tick, { strokeDashoffset: 0, duration: 0.38, ease: 'power2.out' }, 0.7)
    .fromTo(pulse, { scale: 1, opacity: 0.6 }, { scale: 1.7, opacity: 0, duration: 0.7, ease: 'power2.out' }, 0.95)
    .fromTo(svg, { scale: 1 }, { scale: 1.1, duration: 0.14, yoyo: true, repeat: 1, ease: 'power1.inOut' }, 0.95)
    .to(txt, { opacity: 1, y: 0, duration: 0.35, ease: 'power3.out' }, 1);
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

      <div class="al-status">
        <span class="al-count" :class="{ crit: criticalCount > 0 }">{{ criticalCount }} {{ t('alerting.active') }}</span>
      </div>
    </section>

    <!-- Tarjetas de alertas -->
    <TransitionGroup :css="false" tag="div" class="al-stack" @enter="onCardEnter" @leave="onCardLeave">
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
          <button v-if="alert.severity !== 'escalated'" class="ta-btn ta-btn--sm al-btn-esc" @click="escalateAlertPrompt(alert.id)">
            {{ t('alerting.escalate') }}
          </button>
        </div>

        <Transition :css="false" @enter="onDoneEnter">
          <div v-if="doneId === alert.id" class="al-done" aria-hidden="true">
            <svg class="al-done__svg" viewBox="0 0 72 72">
              <circle class="al-done__pulse" cx="36" cy="36" r="30" />
              <circle class="al-done__disc" cx="36" cy="36" r="30" />
              <path class="al-done__tick" d="M23 37l9 9 18-21" pathLength="1" />
            </svg>
            <span class="al-done__txt">{{ t('alerting.resolved') }}</span>
          </div>
        </Transition>
      </article>
    </TransitionGroup>

    <p v-if="!displayAlerts.length" class="ta-card al-none">{{ t('bell.empty') }}</p>

    <Transition :css="false" @enter="onModalEnter" @leave="onModalLeave">
      <div v-if="pendingId !== null || pendingEsc !== null" class="al-modal" @click.self="pendingId !== null ? cancelAcknowledge() : cancelEscalate()">
        <div class="al-dialog" role="alertdialog" aria-modal="true" aria-labelledby="al-dlg-title">
          <span class="al-dialog__ico" :class="{ danger: pendingEsc !== null }"><i class="pi" :class="pendingEsc !== null ? 'pi-bolt' : 'pi-bell-slash'"></i></span>
          <h3 id="al-dlg-title" class="al-dialog__title">{{ pendingEsc !== null ? t('alerting.escTitle') : t('alerting.confirmTitle') }}</h3>
          <p class="al-dialog__msg">{{ pendingEsc !== null ? t('alerting.escMsg') : t('alerting.confirmMsg') }}</p>
          <div class="al-dialog__actions">
            <button class="ta-btn ta-btn--ghost" @click="pendingId !== null ? cancelAcknowledge() : cancelEscalate()">{{ t('alerting.no') }}</button>
            <button class="ta-btn" :class="{ 'al-btn-esc': pendingEsc !== null }" @click="pendingId !== null ? confirmAcknowledge() : confirmEscalate()">{{ pendingEsc !== null ? t('alerting.escYes') : t('alerting.yes') }}</button>
          </div>
        </div>
      </div>
    </Transition>
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
.al-status{display:flex;align-items:center;gap:10px}
.al-count{font-size:12px;font-weight:600;padding:4px 12px;border-radius:999px;background:#eef0f2;color:var(--ta-muted)}
.al-count.crit{background:var(--ta-danger-bg);color:var(--ta-danger)}
.al-stack{display:grid;gap:12px}
.al-card{display:grid;gap:8px;padding:16px 18px;border-left:4px solid var(--ta-line);position:relative;overflow:hidden}
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
.al-dialog__ico.danger{color:var(--ta-danger);background:linear-gradient(145deg,#fdecea,#fbd9d5);box-shadow:inset 0 0 0 1px rgba(200,55,45,.14)}
.al-btn-esc{background:var(--ta-danger);border-color:var(--ta-danger);color:#fff}
.al-btn-esc:hover{background:#a52a21;border-color:#a52a21}
.al-none{padding:22px;text-align:center;color:var(--ta-muted);font-size:12.5px}

/* animaciones de entrada/salida de las tarjetas */
.al-enter-active{transition:opacity .3s ease,transform .3s cubic-bezier(.2,.9,.3,1.1)}
.al-leave-active{transition:opacity .18s ease,transform .18s ease;position:absolute;width:100%}
.al-enter-from,.al-leave-to{opacity:0;transform:translateY(8px)}
.al-move{transition:transform .3s ease}

/** GSAP confirmation animations */
.al-done{position:absolute;inset:-1px;z-index:2;border-radius:inherit;display:grid;align-content:center;justify-items:center;gap:8px;color:#fff;background:radial-gradient(120% 170% at 50% 0%,var(--ta-brand),var(--ta-ink));clip-path:circle(0% at 14% 88%)}
.al-done__svg{width:72px;height:72px;overflow:visible}
.al-done__disc{fill:#fff}
.al-done__pulse{fill:none;stroke:#fff;stroke-width:2}
.al-done__tick{fill:none;stroke:var(--ta-brand);stroke-width:5;stroke-linecap:round;stroke-linejoin:round}
.al-done__txt{font-size:15px;font-weight:600;letter-spacing:.02em}
.al-modal{position:fixed;inset:0;z-index:200;display:grid;place-items:center;padding:16px;background:rgba(6,28,19,.55);backdrop-filter:blur(3px)}
.al-dialog{width:100%;max-width:400px;padding:26px 24px 22px;border-radius:20px;background:var(--ta-surface,#fff);border:1px solid var(--ta-line);box-shadow:0 30px 70px -20px rgba(5,25,16,.55);font-family:var(--ta-font);text-align:center}
.al-dialog__ico{width:52px;height:52px;margin:0 auto 14px;border-radius:16px;display:grid;place-items:center;font-size:20px;color:var(--ta-brand);background:linear-gradient(145deg,#e3f3ea,#d6eedd);box-shadow:inset 0 0 0 1px rgba(10,107,56,.14)}
.al-dialog__title{margin:0;font-size:17px;font-weight:600;color:var(--ta-text)}
.al-dialog__msg{margin:8px 0 0;font-size:13.5px;line-height:1.5;color:var(--ta-muted)}
.al-dialog__actions{display:flex;justify-content:center;gap:10px;margin-top:22px}
.al-dialog__actions .ta-btn{min-width:120px}
</style>
