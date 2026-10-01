<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import AuthShell from '../../../shared/presentation/components/auth-shell.vue'

const router = useRouter()
const user = ref('')
const pass = ref('')
const loading = ref(false)
const features = [
  { title: 'Cola en tiempo real', text: 'Espera, prioridad y alertas de cada paciente, siempre visibles.' },
  { title: 'Clasificación NT-158', text: 'Niveles I-V con guía en pantalla y captura de signos vitales.' },
  { title: 'Trazabilidad completa', text: 'Derivación, comprobantes y reportes del turno, sin hojas sueltas.' }
]

async function submit() {
  loading.value = true
  // TODO IAM: validar credenciales con el API. Por ahora entra directo.
  await new Promise(r => setTimeout(r, 400))
  router.push('/panel')
}
</script>

<template>
  <AuthShell title="El instrumento de triaje del servicio de emergencias." lead="Registra ingresos, clasifica con la escala NT-158 y mantén la cola monitoreada durante todo el turno." :features="features">
    <h2>Iniciar sesión</h2>
    <p class="sub">Panel de triaje · Personal de emergencias</p>
    <form @submit.prevent="submit" novalidate>
      <div class="field"><label for="u">Usuario</label><input id="u" v-model="user" autocomplete="username" /></div>
      <div class="field"><label for="p">Contraseña</label><input id="p" type="password" v-model="pass" autocomplete="current-password" /></div>
      <button class="btn" :disabled="loading">{{ loading ? 'Ingresando…' : 'Iniciar sesión' }}</button>
    </form>
    <router-link class="link" to="/recuperar">Olvidé mi contraseña</router-link>
  </AuthShell>
</template>