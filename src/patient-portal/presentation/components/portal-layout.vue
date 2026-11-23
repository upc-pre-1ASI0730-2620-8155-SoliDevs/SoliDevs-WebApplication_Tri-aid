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
.pp{min-height:100vh;min-height:100dvh;display:flex;flex-direction:column;background:var(--ta-bg);color:var(--ta-text);font-family:var(--ta-font);letter-spacing:0;line-height:1.45}
.pp__head{position:sticky;top:0;z-index:40;border-bottom:1px solid var(--ta-line);background:color-mix(in srgb,var(--ta-surface) 92%,transparent);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)}
.pp__head-in{max-width:1360px;margin:0 auto;display:grid;grid-template-columns:auto auto 1fr;align-items:center;gap:28px;padding:10px 40px}
.pp__brand{display:inline-flex;align-items:center;gap:10px;text-decoration:none}
.pp__brand-mark{width:26px;height:26px;border-radius:7px;background:var(--ta-brand);color:#eafff3;display:grid;place-items:center}
.pp__brand-mark svg{width:22px;height:22px}
.pp__brand-name{font-family:var(--ta-font);font-weight:600;font-size:15.5px;color:var(--ta-text)}
.pp__tabs{display:flex;gap:4px}
.pp__tab{display:inline-flex;align-items:center;gap:7px;padding:8px 12px;border-radius:10px;font-size:14px;font-weight:500;color:var(--ta-muted);text-decoration:none;transition:color .2s,background .2s}
.pp__tab .pi{font-size:15px}
.pp__tab:focus{outline:none}.pp__tab:focus-visible{outline:2px solid var(--ta-accent);outline-offset:2px}
.pp__tab:hover{color:var(--ta-text);background:#e7f0ea}
.pp__tab--active{color:var(--ta-brand);background:#d3f1d9}
.pp__head-right{justify-self:end;display:inline-flex;align-items:center;gap:14px}
.pp__user{display:inline-flex;align-items:center;gap:10px;padding:5px 6px 5px 5px;border:1px solid var(--ta-line);border-radius:999px;background:var(--ta-surface);font-size:13.5px}
.pp__av{width:28px;height:28px;border-radius:50%;background:#d3f1d9;color:var(--ta-brand);display:grid;place-items:center;font-family:var(--ta-font);font-weight:600;font-size:12.5px}
.pp__nm{padding-right:4px;font-weight:500}
.pp__out{display:inline-flex;align-items:center;gap:5px;padding:6px 10px;border:0;border-radius:999px;background:transparent;color:var(--ta-muted);font-size:13px;cursor:pointer;transition:background .2s,color .2s;font-family:inherit}
.pp__out:hover{background:#e7f0ea;color:var(--ta-text)}
.pp__out .pi{font-size:13px}
.pp__main{flex:1;width:100%;max-width:1360px;margin:0 auto;padding:28px 40px 40px}
.pp__tabbar{position:fixed;left:0;right:0;bottom:0;z-index:40;display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid var(--ta-line);background:color-mix(in srgb,var(--ta-surface) 94%,transparent);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);padding-bottom:env(safe-area-inset-bottom);box-shadow:0 -8px 24px -16px rgba(16,46,36,.18)}
.pp__tabbar-link:focus{outline:none}.pp__tabbar-link:focus-visible{outline:2px solid var(--ta-accent);outline-offset:-2px}
.pp__tabbar-link{display:grid;justify-items:center;gap:4px;min-height:56px;padding:9px 0 8px;font-size:12px;font-weight:500;color:var(--ta-muted);text-decoration:none;white-space:nowrap}
.pp__tabbar-link .pi{font-size:19px}
.pp__tabbar-link--active{color:var(--ta-brand)}

/* page transition between tabs */
.pp-page-enter-active,.pp-page-leave-active{transition:opacity .18s ease,transform .18s ease}
.pp-page-enter-from{opacity:0;transform:translateY(8px)}
.pp-page-leave-to{opacity:0;transform:translateY(-6px)}

@media (max-width:879px){
  .pp__head-in{grid-template-columns:auto 1fr;gap:14px;padding:10px 18px}
  .pp__nm{display:none}
  .pp__out span{display:none}
  .pp__main{padding:18px 18px calc(96px + env(safe-area-inset-bottom))}
}
</style>
