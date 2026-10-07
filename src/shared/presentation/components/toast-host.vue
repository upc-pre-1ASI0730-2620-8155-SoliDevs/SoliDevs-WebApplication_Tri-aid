<script setup>
import { onBeforeUnmount } from 'vue'
import { gsap } from 'gsap'
import { toasts, dismiss } from '../../application/toast-store.js'

const icons = {
  success: 'M5 12.5l4.5 4.5L19 7.5',
  error: 'M7 7l10 10M17 7L7 17',
  warning: 'M12 6.5v7M12 17.5v.01',
  info: 'M12 7.5v.01M12 11v6'
}
const timers = new Map()
const reduce = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

function startTimer(el) {
  const id = Number(el.dataset.id)
  const t = toasts.find(x => x.id === id)
  const bar = el.querySelector('.tt-bar')
  if (!t || !bar) return
  timers.set(id, gsap.fromTo(bar, { scaleX: 1 }, { scaleX: 0, duration: t.duration / 1000, ease: 'none', onComplete: () => dismiss(id) }))
}

function onEnter(el, done) {
  if (reduce()) { done(); startTimer(el); return }
  gsap.timeline({ onComplete: done })
    .fromTo(el, { x: 90, opacity: 0, scale: 0.92, filter: 'blur(10px)' },
      { x: 0, opacity: 1, scale: 1, filter: 'blur(0px)', duration: 0.6, ease: 'back.out(1.5)', clearProps: 'filter' })
    .fromTo(el.querySelector('.tt-ico'), { scale: 0, rotate: -90 }, { scale: 1, rotate: 0, duration: 0.5, ease: 'back.out(2.2)' }, 0.1)
    .fromTo(el.querySelector('.tt-ring'), { scale: 0.7, opacity: 0.7 }, { scale: 1.9, opacity: 0, duration: 0.8, ease: 'power2.out' }, 0.2)
    .fromTo(el.querySelector('.tt-draw'), { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.5, ease: 'power2.out' }, 0.3)
    .fromTo(el.querySelectorAll('.tt-txt > *'), { opacity: 0, x: 14 }, { opacity: 1, x: 0, duration: 0.4, stagger: 0.07, ease: 'power3.out' }, 0.18)
  startTimer(el)
}

function onLeave(el, done) {
  const id = Number(el.dataset.id)
  timers.get(id)?.kill(); timers.delete(id)
  if (reduce()) { done(); return }
  const card = el.querySelector('.tt')
  gsap.timeline({ onComplete: done })
    .to(card, { x: 70, opacity: 0, scale: 0.94, filter: 'blur(6px)', duration: 0.38, ease: 'power3.in' })
    .set(el, { overflow: 'hidden' })
    .to(el, { height: 0, marginBottom: 0, duration: 0.3, ease: 'power2.inOut' }, '-=0.08')
}

const hold = id => timers.get(id)?.pause()
const release = id => timers.get(id)?.play()
onBeforeUnmount(() => { timers.forEach(t => t.kill()); timers.clear() })
</script>

<template>
  <TransitionGroup :css="false" tag="div" class="tt-host" aria-live="polite" @enter="onEnter" @leave="onLeave">
    <div v-for="t in toasts" :key="t.id" :data-id="t.id" class="tt-slot" @mouseenter="hold(t.id)" @mouseleave="release(t.id)">
      <div class="tt" :class="t.type" role="status">
        <span class="tt-ico">
          <span class="tt-ring"></span>
          <svg viewBox="0 0 24 24"><path class="tt-draw" pathLength="1" :d="icons[t.type]" /></svg>
        </span>
        <div class="tt-txt">
          <b>{{ t.title }}</b>
          <small v-if="t.detail">{{ t.detail }}</small>
        </div>
        <button class="tt-x" aria-label="Cerrar" @click="dismiss(t.id)">×</button>
        <span class="tt-bar"></span>
      </div>
    </div>
  </TransitionGroup>
</template>

<style>
.tt-host{position:fixed;top:68px;right:24px;z-index:100;width:340px;max-width:calc(100vw - 32px);pointer-events:none;font-family:var(--ta-font);text-align:left;letter-spacing:0}
.tt-slot{margin-bottom:10px;pointer-events:auto}
.tt{--c:var(--ta-accent);position:relative;display:flex;align-items:center;gap:13px;padding:14px 38px 17px 14px;border-radius:16px;overflow:hidden;color:#fff;border:1px solid rgba(255,255,255,.09);background:radial-gradient(120% 220% at 0% 50%,color-mix(in srgb,var(--c) 26%,transparent),transparent 55%),var(--ta-ink);box-shadow:0 22px 50px -14px rgba(5,25,16,.55),0 4px 12px rgba(5,25,16,.18)}
.tt.error{--c:#ff6b5e}
.tt.warning{--c:#f2b632}
.tt.info{--c:#6cb8ff}
.tt-ico{position:relative;flex:none;width:36px;height:36px;border-radius:12px;display:grid;place-items:center;color:var(--c);background:color-mix(in srgb,var(--c) 16%,transparent);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--c) 30%,transparent)}
.tt-ico svg{width:19px;height:19px;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}
.tt-draw{stroke-dasharray:1;stroke-dashoffset:0}
.tt-ring{position:absolute;inset:0;border-radius:12px;border:1.5px solid var(--c);opacity:0;pointer-events:none}
.tt-txt{min-width:0;display:grid;gap:2px}
.tt-txt b{font-size:13.5px;font-weight:600;line-height:1.25}
.tt-txt small{font-size:11.5px;color:#9dbbab;line-height:1.3}
.tt-x{position:absolute;top:9px;right:10px;width:22px;height:22px;border:0;border-radius:50%;background:none;color:#7fa392;font-size:17px;line-height:1;cursor:pointer;transition:background .2s,color .2s}
.tt-x:hover{background:rgba(255,255,255,.09);color:#fff}
.tt-x:focus-visible{outline:2px solid var(--c);outline-offset:1px}
.tt-bar{position:absolute;left:0;right:0;bottom:0;height:3px;background:var(--c);transform-origin:left;opacity:.9}
</style>