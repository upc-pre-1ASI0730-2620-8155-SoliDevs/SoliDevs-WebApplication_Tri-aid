<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { gsap } from 'gsap'
import { subscriptionStore } from '../../../subscription/application/subscription-store.js'
import { iamStore } from '../../../iam/application/iam-store.js'

const { t } = useI18n()
const router = useRouter()
const card = ref(null)
const lock = ref(null)
const reduce = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

onMounted(() => {
  if (reduce()) return
  gsap.fromTo(card.value, { y: 34, opacity: 0, scale: 0.96 },
    { y: 0, opacity: 1, scale: 1, duration: 0.55, ease: 'back.out(1.5)' })
  gsap.fromTo(lock.value, { rotate: -12, scale: 0.6 },
    { rotate: 0, scale: 1, duration: 0.6, delay: 0.15, ease: 'back.out(2)' })
})

function goPay() { router.push('/subscriptions') }

// Solo el administrador gestiona la suscripcion: el personal ve la
// indicacion de contactarlo en lugar de un enlace que el RBAC expulsaria.
const isAdmin = computed(() => iamStore.isAdmin)
</script>

<template>
  <div class="sus">
    <div ref="card" class="ta-card sus__card">
      <div ref="lock" class="sus__lock"><i class="pi pi-lock"></i></div>
      <h2>{{ t('suspended.title') }}</h2>
      <p class="sus__lead">{{ t('suspended.lead', { institution: subscriptionStore.subscription?.institution ?? '' }) }}</p>
      <ul class="sus__points">
        <li>{{ t('suspended.point1') }}</li>
        <li>{{ t('suspended.point2') }}</li>
      </ul>
      <button v-if="isAdmin" class="ta-btn sus__cta" @click="goPay">
        <i class="pi pi-credit-card"></i>{{ t('suspended.regularize') }}
      </button>
      <p v-else class="sus__contact">
        <i class="pi pi-info-circle"></i>{{ t('suspended.contactAdmin') }}
      </p>
      <p class="sus__note">{{ t('suspended.note') }}</p>
    </div>
  </div>
</template>

<style scoped>
.sus{min-height:100vh;display:grid;place-items:center;background:var(--ta-bg);padding:24px;box-sizing:border-box;font-family:var(--ta-font)}
.sus__card{max-width:460px;width:100%;text-align:center;padding:38px 34px;display:flex;flex-direction:column;gap:14px;align-items:center}
.sus__lock{width:64px;height:64px;border-radius:18px;background:var(--ta-danger-bg);color:var(--ta-danger);display:grid;place-items:center;font-size:1.6rem}
.sus__card h2{margin:0;color:var(--ta-text);font-size:1.4rem}
.sus__lead{margin:0;color:var(--ta-muted);font-size:.92rem;line-height:1.5}
.sus__points{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:8px;font-size:.86rem;color:var(--ta-text);text-align:left}
.sus__points li{padding-left:22px;position:relative}
.sus__points li::before{content:'✕';position:absolute;left:0;color:var(--ta-danger);font-weight:700;font-size:.8rem;top:2px}
.sus__cta{justify-content:center;display:inline-flex;gap:8px;margin-top:6px}
.sus__contact{margin:6px 0 0;display:inline-flex;align-items:center;gap:8px;padding:10px 16px;border-radius:10px;background:#eef5f1;border:1px solid var(--ta-line);color:var(--ta-muted);font-size:.86rem}
.sus__note{margin:0;font-size:.76rem;color:var(--ta-muted)}
</style>
