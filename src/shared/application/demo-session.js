import { reactive } from 'vue'

/**
 * Active demo session. No session until IAM (login) is connected;
 * there is no default demo user.
 */
export const session = reactive({ name: '', initials: '', unit: '', shift: '' })