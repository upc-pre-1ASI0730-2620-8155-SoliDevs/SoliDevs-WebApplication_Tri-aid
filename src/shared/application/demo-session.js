import { reactive } from 'vue'

/** Session fields mirror the signed-in IAM user for the app shell. */
export const session = reactive({ name: '', initials: '', unit: '', shift: '', institution: '' })