import { reactive } from 'vue'

/**
 * Active demo session. No session until IAM (login) is connected;
 * there is no default demo user.
 */
// Cuando exista el login real, rellenar estos campos con el usuario autenticado.
export const session = reactive({ name: '', initials: '', unit: '', shift: '' })