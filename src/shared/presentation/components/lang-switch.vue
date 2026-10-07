<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { gsap } from 'gsap'
import { locale, setLocale, t } from '../../application/i18n.js'

const langs = ['en', 'es']
const active = ref(locale.value)
const thumb = ref(null)
const globe = ref(null)
const btns = []
const reduce = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

function place(l, animate) {
  const b = btns[langs.indexOf(l)]
  if (!b || !thumb.value) return
  const to = { x: b.offsetLeft, width: b.offsetWidth }
  if (!animate || reduce()) { gsap.set(thumb.value, to); return }
  gsap.to(thumb.value, { ...to, duration: 0.6, ease: 'back.out(1.7)' })
  gsap.fromTo(thumb.value, { scaleY: 0.72 }, { scaleY: 1, duration: 0.7, ease: 'elastic.out(1,.45)' })
}

function pick(l) {
  if (l === active.value) return
  active.value = l
  place(l, true)
  setLocale(l)
  if (!reduce()) gsap.to(globe.value, { rotation: '+=360', duration: 0.8, ease: 'power3.inOut' })
}

const onResize = () => place(active.value, false)
onMounted(async () => {
  await nextTick()
  place(active.value, false)
  document.fonts?.ready.then(() => place(active.value, false))
  window.addEventListener('resize', onResize)
})
onBeforeUnmount(() => window.removeEventListener('resize', onResize))
</script>

<template>
  <div class="ls" role="group" :aria-label="t('lang.label')">
    <i ref="globe" class="pi pi-globe ls__g"></i>
    <div class="ls__track">
      <span ref="thumb" class="ls__thumb"></span>
      <button v-for="(l, i) in langs" :key="l" :ref="el => (btns[i] = el)" class="ls__btn" :class="{ on: active === l }" :aria-pressed="active === l" @click="pick(l)">{{ l.toUpperCase() }}</button>
    </div>
  </div>
</template>

<style>
.ls{display:flex;align-items:center;gap:8px;font-family:var(--ta-font)}
.ls__g{font-size:14px;color:var(--ta-muted)}
.ls__track{position:relative;display:flex;padding:3px;border-radius:999px;background:#eef4f0;border:1px solid var(--ta-line)}
.ls__thumb{position:absolute;top:3px;bottom:3px;left:0;width:36px;border-radius:999px;background:linear-gradient(135deg,var(--ta-brand),#10924f);box-shadow:0 4px 12px -2px rgba(10,107,56,.55),inset 0 1px 0 rgba(255,255,255,.25)}
.ls__btn{position:relative;z-index:1;min-width:38px;padding:5px 10px;border:0;border-radius:999px;background:none;font:inherit;font-size:11px;font-weight:600;letter-spacing:.08em;color:var(--ta-muted);cursor:pointer;transition:color .3s}
.ls__btn:hover:not(.on){color:var(--ta-brand)}
.ls__btn.on{color:#fff}
.ls__btn:focus-visible{outline:2px solid var(--ta-accent);outline-offset:2px}
.ls--float{position:fixed;top:18px;right:22px;z-index:50}
</style>