import { createI18n } from 'vue-i18n'
import en from '../../locales/en.json'
import es from '../../locales/es.json'

/**
 * Default language: English. The user's choice is persisted in
 * localStorage.
 */
const KEY = 'triaid.locale'
const read = () => { try { return localStorage.getItem(KEY) === 'es' ? 'es' : 'en' } catch { return 'en' } }

export const i18n = createI18n({
  legacy: false,
  locale: read(),
  fallbackLocale: 'en',
  missingWarn: false,
  fallbackWarn: false,
  messages: { en, es },
  messageResolver: (obj, path) => obj[path] ?? null
})

export const locale = i18n.global.locale
document.documentElement.lang = locale.value

export function setLocale(l) {
  locale.value = l === 'es' ? 'es' : 'en'
  try { localStorage.setItem(KEY, locale.value) } catch { }
  document.documentElement.lang = locale.value
}

/**
 * Translates a key. Supports placeholders, e.g. t('key', { n: 3 }).
 */
export const t = (key, p) => (p ? i18n.global.t(key, p) : i18n.global.t(key))

/**
 * Maps "M"/"F" to its translated label; unknown values are returned as-is.
 */
export const sexLabel = v => { const k = 'sex.' + v; const s = t(k); return s === k ? v : s }