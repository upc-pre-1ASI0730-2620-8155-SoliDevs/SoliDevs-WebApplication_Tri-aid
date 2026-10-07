import { createI18n } from 'vue-i18n'
import en from '../../locales/en.json'
import es from '../../locales/es.json'

/**
 * Idioma por defecto: inglés. La elección del usuario se recuerda en
 * localStorage.
 */
const KEY = 'triaid.locale'
const read = () => { try { return localStorage.getItem(KEY) === 'es' ? 'es' : 'en' } catch { return 'en' } }

// Las claves son planas con puntos ("nav.panel"): se buscan por nombre exacto, sin anidar.
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
  try { localStorage.setItem(KEY, locale.value) } catch { /* sin storage */ }
  document.documentElement.lang = locale.value
}

// t('clave') o t('clave', { n: 3 }) para los {marcadores}
export const t = (key, p) => (p ? i18n.global.t(key, p) : i18n.global.t(key))

// "M"/"F" -> texto traducido; valores antiguos se muestran tal cual
export const sexLabel = v => { const k = 'sex.' + v; const s = t(k); return s === k ? v : s }