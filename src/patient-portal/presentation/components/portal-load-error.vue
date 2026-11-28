<script setup>
/**
 * Shown by the portal views when the overview could not be loaded: a message
 * and a retry instead of a blank page. An expired session sends the patient
 * back to the sign-in.
 */
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { patientPortalStore } from '../../application/patient-portal-store.js'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const store = patientPortalStore
const message = computed(() => {
  if (store.loadError === 'sessionExpired') return t('portal.error.sessionExpired')
  if (store.loadError === 'notFound') return t('portal.error.notFound')
  return t('portal.error.network')
})
const retrying = computed(() => store.loading)

async function retry() {
  const r = await store.loadOverview()
  if (r?.ok) store.loadError = null
}

onMounted(() => { if (store.loadError === 'sessionExpired') store.signOut() })
</script>

<template>
  <div class="pp-error">
    <span class="pp-error__icon"><i class="pi pi-exclamation-circle"></i></span>
    <h2 class="pp-error__title">{{ t('portal.error.title') }}</h2>
    <p class="pp-error__text">{{ message }}</p>
    <button v-if="store.loadError !== 'sessionExpired'" class="pp-error__btn" type="button" :disabled="retrying" @click="retry">
      <i class="pi" :class="retrying ? 'pi-spin pi-spinner' : 'pi-refresh'"></i>{{ t('portal.error.retry') }}
    </button>
    <button v-else class="pp-error__btn" type="button" @click="router.push('/portal')">{{ t('portal.error.signIn') }}</button>
  </div>
</template>

<style scoped>
.pp-error{max-width:420px;margin:12vh auto 0;text-align:center;display:grid;justify-items:center;gap:10px;padding:28px 24px;background:#fff;border:1px solid #e3e8e5;border-radius:18px}
.pp-error__icon{width:44px;height:44px;border-radius:12px;background:#fff1f0;color:#b42318;display:grid;place-items:center;font-size:20px}
.pp-error__title{margin:0;font-size:18px;font-weight:700;color:#15291f}
.pp-error__text{margin:0;font-size:13.5px;color:#5f6b66;line-height:1.5}
.pp-error__btn{margin-top:6px;border:0;border-radius:10px;padding:10px 18px;font-weight:600;font-size:13.5px;background:#0f6b45;color:#fff;display:inline-flex;align-items:center;gap:8px;cursor:pointer}
.pp-error__btn:disabled{opacity:.7;cursor:default}
</style>
