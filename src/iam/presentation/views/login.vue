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
      <div class="field"><label for="p">{{ t('login.pass') }}</label><input id="p" type="password" v-model="pass" autocomplete="current-password" /></div>
      <p v-if="errorMsg" class="err">{{ errorMsg }}</p>
      <button class="btn" :disabled="loading">{{ loading ? t('login.loading') : t('login.h') }}</button>
    </form>
    <router-link class="link" to="/recuperar">{{ t('login.forgot') }}</router-link>
  </AuthShell>
</template>