<script setup>
import { ref } from 'vue'
import AuthShell from '../../../shared/presentation/components/auth-shell.vue'

const email = ref('')
const error = ref('')
const sent = ref(false)
const loading = ref(false)
const features = [
  { icon: 'mail', title: 'Enlace al correo institucional', text: 'Solo se envía a la dirección registrada de tu cuenta.' },
  { icon: 'clock', title: 'Vigencia limitada', text: 'Si el enlace caduca, solicita uno nuevo desde esta misma pantalla.' },
  { icon: 'lock', title: 'Sin cambios hasta confirmar', text: 'Tu contraseña actual sigue activa hasta que completes el cambio.' }
]

async function submit() {
  error.value = ''
  if (!/^\S+@\S+\.\S+$/.test(email.value)) { error.value = 'Ingresa un correo válido.'; return }
  loading.value = true
  // TODO: reemplazar por la llamada real al API de IAM
  await new Promise(r => setTimeout(r, 700))
  loading.value = false
  sent.value = true
}
</script>

<template>
  <AuthShell title="Recupera el acceso a tu cuenta institucional." lead="El enlace de recuperación llega al correo registrado de tu cuenta y queda habilitado por tiempo limitado." :features="features">
    <h2>Recuperar contraseña</h2>
    <p class="sub">Te enviaremos un enlace de recuperación<br />a tu correo institucional.</p>
    <form @submit.prevent="submit" novalidate>
      <div class="field"><label for="e">Correo institucional</label><input id="e" type="email" v-model="email" placeholder="nombre@hospital.gob.pe" /></div>
      <p v-if="error" class="err">{{ error }}</p>
      <p v-if="sent" class="ok">Si el correo está registrado, recibirás el enlace en unos minutos.</p>
      <button class="btn" :disabled="loading">{{ loading ? 'Enviando…' : 'Enviar enlace de recuperación' }}</button>
    </form>
    <router-link class="link" to="/login">Volver a iniciar sesión</router-link>
  </AuthShell>
</template>