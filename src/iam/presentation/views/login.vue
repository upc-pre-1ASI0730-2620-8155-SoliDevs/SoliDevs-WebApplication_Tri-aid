<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import AuthShell from '../../../shared/presentation/components/auth-shell.vue'
import { t } from '../../../shared/application/i18n.js'
import { iamStore } from '../../../iam/application/iam-store.js'
import { subscriptionStore } from '../../../subscription/application/subscription-store.js'
import { notify } from '../../../shared/application/toast-store.js'

const router = useRouter()
const user = ref('')
const pass = ref('')
const showPass = ref(false)
const loading = ref(false)
const features = computed(() => [
  { title: t('login.f1.t'), text: t('login.f1.d') },
  { title: t('login.f2.t'), text: t('login.f2.d') },
  { title: t('login.f3.t'), text: t('login.f3.d') }
])

const errorMsg = ref('')

async function submit() {
  loading.value = true
  errorMsg.value = ''
  try {
    await iamStore.signIn(user.value, pass.value)
    await subscriptionStore.load()
    router.push('/panel')
  } catch (e) {
    errorMsg.value = e.code === 'invalid-credentials'
      ? t('login.error')
      : t('login.errorApi')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AuthShell :title="t('login.title')" :lead="t('login.lead')" :features="features">
    <h2>{{ t('login.h') }}</h2>
    <p class="sub">{{ t('login.sub') }}</p>
    <form @submit.prevent="submit" novalidate>
      <div class="field"><label for="u">{{ t('login.user') }}</label><input id="u" v-model="user" autocomplete="username" /></div>
      <div class="field">
        <label for="p">{{ t('login.pass') }}</label>
        <div class="pass-wrap">
          <input id="p" :type="showPass ? 'text' : 'password'" v-model="pass" autocomplete="current-password" />
          <button type="button" class="pass-toggle" :aria-label="showPass ? t('login.hidePass') : t('login.showPass')" :title="showPass ? t('login.hidePass') : t('login.showPass')" @click="showPass = !showPass">
            <svg v-if="showPass" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
        </div>
      </div>
      <p v-if="errorMsg" class="err">{{ errorMsg }}</p>
      <button class="btn" :disabled="loading">{{ loading ? t('login.loading') : t('login.h') }}</button>
    </form>
    <router-link class="link" to="/recuperar">{{ t('login.forgot') }}</router-link>
  </AuthShell>
</template>

<style scoped>
.pass-wrap {
  position: relative;
  display: flex;
}

.pass-wrap input {
  width: 100%;
  padding-right: 2.6rem;
}

.pass-toggle {
  position: absolute;
  right: 0.45rem;
  top: 50%;
  transform: translateY(-50%);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: none;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  border-radius: 0.4rem;
}

.pass-toggle:hover {
  color: #1d6b4f;
  background: rgba(29, 107, 79, 0.08);
}

.pass-toggle svg {
  width: 1.1rem;
  height: 1.1rem;
}
</style>