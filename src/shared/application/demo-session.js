import { reactive } from 'vue'

// Sin sesión activa hasta conectar IAM (login). No hay usuario de demostración.
// Cuando exista el login real, rellenar estos campos con el usuario autenticado.
export const session = reactive({ name: '', initials: '', unit: '', shift: '' })