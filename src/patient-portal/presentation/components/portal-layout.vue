<script setup>
/**
 * Layout of the patient portal. Separate from the staff shell: no sidebar, no
 * notification bell, no subscription banner. The header carries the brand, the
 * three portal tabs (inline on desktop, bottom tab bar on mobile) and the
 * patient chip with sign-out.
 */
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { patientPortalStore } from '../../application/patient-portal-store.js'
import '../styles/portal.css'
import LangSwitch from '../../../shared/presentation/components/lang-switch.vue'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const store = patientPortalStore
const isMobile = ref(false)
const mq = window.matchMedia('(max-width: 879px)')

const tabs = [
  { to: '/portal/estado', key: 'status', icon: 'pi-wave-pulse' },
  { to: '/portal/turno', key: 'turn', icon: 'pi-clock' },
  { to: '/portal/comprobante', key: 'voucher', icon: 'pi-qrcode' }
]

function update() { isMobile.value = mq.matches }
onMounted(() => { update(); mq.addEventListener('change', update) })
onBeforeUnmount(() => mq.removeEventListener('change', update))

function signOut() {
  store.signOut()
  router.push('/portal')
}

watch(() => route.fullPath, () => window.scrollTo({ top: 0 }))
</script>

<template>
  <div class="pp">
    <header class="pp__head">
      <div class="pp__head-in">
        <span class="pp__brand">
          <span class="pp__brand-mark"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M6 17h5l2-6 4 10 2-6h7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
          <span class="pp__brand-name">Tri-Aid</span>
        </span>

        <nav v-if="!isMobile" class="pp__tabs" aria-label="Portal del paciente">
          <router-link v-for="tab in tabs" :key="tab.key" :to="tab.to" class="pp__tab" active-class="pp__tab--active" exact-active-class="pp__tab--active">
            <i class="pi" :class="tab.icon"></i><span>{{ t(`portal.nav.${tab.key}`) }}</span>
          </router-link>
        </nav>

        <span class="pp__head-right">
          <span class="pp__user">
          <span class="pp__av">{{ store.session?.initials || store.overview?.patient?.initials || '…' }}</span>
          <span class="pp__nm">{{ store.session?.fullName || store.overview?.patient?.fullName }}</span>
          <button class="pp__out" type="button" @click="signOut">
            <i class="pi pi-sign-out"></i><span>{{ t('portal.signOut') }}</span>
          </button>
          </span>
          <LangSwitch />
        </span>
      </div>
    </header>

    <main class="pp__main">
      <router-view v-slot="{ Component, route: r }">
        <transition name="pp-page" mode="out-in"><component :is="Component" :key="r.path" /></transition>
      </router-view>
    </main>

    <nav v-if="isMobile" class="pp__tabbar" aria-label="Portal del paciente">
      <router-link v-for="tab in tabs" :key="tab.key" :to="tab.to" class="pp__tabbar-link" active-class="pp__tabbar-link--active">
        <i class="pi" :class="tab.icon"></i><span>{{ t(`portal.nav.${tab.key}`) }}</span>
      </router-link>
    </nav>
  </div>
</template>

<style scoped>
.pp__tabbar-link:focus{outline:none}.pp__tabbar-link:focus-visible{outline:2px solid var(--ta-accent);outline-offset:-2px}

/* page transition between tabs */
.pp-page-enter-active,.pp-page-leave-active{transition:opacity .18s ease,transform .18s ease}
.pp-page-enter-from{opacity:0;transform:translateY(8px)}
.pp-page-leave-to{opacity:0;transform:translateY(-6px)}

@media (max-width:879px){
      .pp__out span{display:none}
  }
</style>
