import { reactive } from 'vue'

/**
 * Sesión demo del usuario activo. Sin sesión hasta conectar IAM (login);
 * no existe un usuario de demostración por defecto.
 */
// Cuando exista el login real, rellenar estos campos con el usuario autenticado.
export const session = reactive({ name: '', initials: '', unit: '', shift: '' })