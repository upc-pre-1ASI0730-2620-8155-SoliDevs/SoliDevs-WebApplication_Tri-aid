<script setup>
import { ref, computed } from 'vue'
import AuthShell from '../../../shared/presentation/components/auth-shell.vue'
import { t } from '../../../shared/application/i18n.js'

const email = ref('')
const error = ref(false)
const sent = ref(false)
const loading = ref(false)
const features = computed(() => [
  { icon: 'mail', title: t('fg.f1.t'), text: t('fg.f1.d') },
  { icon: 'clock', title: t('fg.f2.t'), text: t('fg.f2.d') },
  { icon: 'lock', title: t('fg.f3.t'), text: t('fg.f3.d') }
])

async function submit() {
  error.value = false
  if (!/^\S+@\S+\.\S+$/.test(email.value)) { error.value = true; return }
  loading.value = true
  // TODO: reemplazar por la llamada real al API de IAM
  await new Promise(r => setTimeout(r, 700))
  loading.value = false
  sent.value = true
}
</script>

<template>
  <AuthShell :title="t('fg.title')" :lead="t('fg.lead')" :features="features">
    <h2>{{ t('fg.h') }}</h2>
    <p class="sub">{{ t('fg.sub1') }}<br />{{ t('fg.sub2') }}</p>
    <form @submit.prevent="submit" novalidate>
      <div class="field"><label for="e">{{ t('fg.email') }}</label><input id="e" type="email" v-model="email" placeholder="name@hospital.gob.pe" /></div>
      <p v-if="error" class="err">{{ t('fg.err') }}</p>
      <p v-if="sent" class="ok">{{ t('fg.ok') }}</p>
      <button class="btn" :disabled="loading">{{ loading ? t('fg.sending') : t('fg.send') }}</button>
    </form>
    <router-link class="link" to="/login">{{ t('fg.back') }}</router-link>
  </AuthShell>
</template>