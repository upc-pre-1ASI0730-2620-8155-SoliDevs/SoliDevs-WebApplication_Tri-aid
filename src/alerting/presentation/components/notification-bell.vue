<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { gsap } from 'gsap'
import { alertStore, unreadCount } from '../../application/alert-store.js'

const open = ref(false)
const root = ref(null)
const bell = ref(null)
let rings = null

const latest = computed(() => alertStore.items.slice(0, 5))
const reduce = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

function toggle() {
  open.value = !open.value
  if (open.value && !reduce()) {
    gsap.timeline()
      .set(bell.value, { transformOrigin: '50% 8%' })
      .to(bell.value, { rotation: -16, duration: 0.1 })
      .to(bell.value, { rotation: 12, duration: 0.12 })
      .to(bell.value, { rotation: -7, duration: 0.12 })
      .to(bell.value, { rotation: 0, duration: 0.3, ease: 'elastic.out(1,.4)' })
  }
}

function onEnter(el, done) {
  if (reduce()) { done(); return }
  const items = el.querySelectorAll('[data-in]')
  gsap.timeline({ onComplete: done })
    .fromTo(el,
      { opacity: 0, y: -14, scale: 0.9, filter: 'blur(8px)' },
      { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', duration: 0.5, ease: 'back.out(1.5)', clearProps: 'transform,filter' })
    .fromTo(items,
      { opacity: 0, y: 12 },
      { opacity: 1, y: 0, duration: 0.45, stagger: 0.07, ease: 'power3.out' }, 0.12)
  const rg = el.querySelectorAll('.nb-ring')
  if (rg.length) {
    rings = gsap.fromTo(rg,
      { scale: 0.55, opacity: 0.55 },
      { scale: 1.7, opacity: 0, duration: 2.2, ease: 'power1.out', repeat: -1, stagger: 0.73 })
  }
}

function onLeave(el, done) {
  rings?.kill(); rings = null
  gsap.killTweensOf([el, ...el.querySelectorAll('[data-in]')])
  if (reduce()) { done(); return }
  gsap.to(el, { opacity: 0, y: -8, scale: 0.95, filter: 'blur(4px)', duration: 0.22, ease: 'power2.in', onComplete: done })
}

function onDoc(e) { if (open.value && root.value && !root.value.contains(e.target)) open.value = false }
function onKey(e) { if (e.key === 'Escape') open.value = false }
onMounted(() => {
  document.addEventListener('pointerdown', onDoc)
  document.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDoc)
  document.removeEventListener('keydown', onKey)
  rings?.kill()
})
</script>

<template>
  <div ref="root" class="nb">
    <button class="nb__btn" :class="{ on: open }" aria-label="Alertas" aria-haspopup="dialog" :aria-expanded="open" @click="toggle">
      <i ref="bell" class="pi pi-bell"></i>
      <span v-if="unreadCount" class="nb__count">{{ unreadCount > 9 ? '9+' : unreadCount }}</span>
    </button>

    <Transition :css="false" @enter="onEnter" @leave="onLeave">
      <div v-if="open" class="nb__panel" role="dialog" aria-label="Alertas">
        <header class="nb__head" data-in>
          <div>
            <strong>Alertas</strong>
            <small>{{ unreadCount ? `${unreadCount} sin leer` : 'Todo al día' }}</small>
          </div>
          <span class="nb__chip" :class="{ live: unreadCount }">{{ unreadCount }}</span>
        </header>

        <ul v-if="latest.length" class="nb__list">
          <li v-for="a in latest" :key="a.id" data-in class="nb__item" :class="a.level">
            <span class="nb__dot"></span>
            <div><b>{{ a.title }}</b><small>{{ a.detail }}</small></div>
            <time>{{ a.time }}</time>
          </li>
        </ul>

        <div v-else class="nb__empty">
          <div class="nb__art" data-in>
            <span class="nb__ring nb-ring"></span>
            <span class="nb__ring nb-ring"></span>
            <span class="nb__ring nb-ring"></span>
            <span class="nb__core"><i class="pi pi-bell"></i></span>
          </div>
          <b data-in>Sin alertas por ahora</b>
          <p data-in>Cuando haya novedades, las verás aquí.</p>
        </div>

        <footer class="nb__foot" data-in>
          <router-link to="/alerting" @click="open = false">Ir a Alertas <i class="pi pi-arrow-right"></i></router-link>
        </footer>
      </div>
    </Transition>
  </div>
</template>

<style>
.nb{position:relative;z-index:30}
.nb__btn{position:relative;width:36px;height:36px;border:0;border-radius:50%;background:none;color:var(--ta-muted);font-size:16px;cursor:pointer;display:grid;place-items:center;transition:background .2s,color .2s}
.nb__btn i{display:inline-block}
.nb__btn:hover,.nb__btn.on{background:#eef4f0;color:var(--ta-brand)}
.nb__btn:focus-visible{outline:2px solid var(--ta-accent);outline-offset:2px}
.nb__count{position:absolute;top:2px;right:0;min-width:16px;height:16px;padding:0 4px;box-sizing:border-box;border-radius:999px;background:var(--ta-danger);color:#fff;border:2px solid var(--ta-surface);font-size:9px;font-weight:600;display:grid;place-items:center;line-height:1}

.nb__panel{position:absolute;top:calc(100% + 14px);right:-6px;width:344px;max-width:calc(100vw - 24px);background:var(--ta-surface);border:1px solid var(--ta-line);border-radius:18px;box-shadow:0 24px 60px -12px rgba(8,40,26,.35),0 4px 14px rgba(8,40,26,.08);transform-origin:90% 0;text-align:left;font-family:var(--ta-font)}
.nb__panel::before{content:'';position:absolute;top:-6px;right:20px;width:12px;height:12px;background:var(--ta-ink);transform:rotate(45deg);border-radius:3px 0 0 0}
.nb__head{display:flex;align-items:center;justify-content:space-between;padding:16px 18px;border-radius:17px 17px 0 0;color:#fff;background:radial-gradient(90% 180% at 0% 100%,rgba(52,210,123,.3),transparent 60%),var(--ta-ink)}
.nb__head strong{display:block;font-size:14px;font-weight:600}
.nb__head small{display:block;margin-top:2px;font-size:11px;color:#8fb3a1}
.nb__chip{min-width:26px;height:26px;padding:0 8px;box-sizing:border-box;border-radius:999px;display:grid;place-items:center;background:rgba(255,255,255,.08);color:#a9c2b4;font-family:var(--ta-mono);font-size:12px;font-weight:600}
.nb__chip.live{background:var(--ta-danger);color:#fff}

.nb__empty{padding:26px 24px 20px;text-align:center}
.nb__art{position:relative;width:96px;height:96px;margin:0 auto 14px;display:grid;place-items:center}
.nb__ring{position:absolute;inset:0;border-radius:50%;border:1.5px solid var(--ta-accent);opacity:0}
.nb__core{position:relative;width:52px;height:52px;border-radius:16px;background:linear-gradient(145deg,#e3f3ea,#d6eedd);color:var(--ta-brand);font-size:20px;display:grid;place-items:center;box-shadow:inset 0 0 0 1px rgba(10,107,56,.12),0 8px 18px -6px rgba(10,107,56,.35)}
.nb__empty b{display:block;font-size:14px;font-weight:600;color:var(--ta-text)}
.nb__empty p{margin:4px 0 0;font-size:12px;color:var(--ta-muted)}

.nb__list{list-style:none;margin:0;padding:0}
.nb__item{display:grid;grid-template-columns:10px 1fr auto;gap:12px;align-items:start;padding:12px 18px;border-bottom:1px solid var(--ta-line)}
.nb__dot{width:8px;height:8px;margin-top:5px;border-radius:50%;background:var(--ta-accent)}
.nb__item.critical .nb__dot{background:var(--ta-danger)}
.nb__item.warning .nb__dot{background:#e8a317}
.nb__item b{display:block;font-size:12.5px;font-weight:600;color:var(--ta-text)}
.nb__item small{display:block;margin-top:2px;font-size:11px;color:var(--ta-muted)}
.nb__item time{font-family:var(--ta-mono);font-size:10px;color:var(--ta-muted)}

.nb__foot{border-top:1px solid var(--ta-line);border-radius:0 0 17px 17px;background:#f7faf8}
.nb__foot a{display:flex;align-items:center;justify-content:space-between;padding:13px 18px;border-radius:0 0 17px 17px;color:var(--ta-brand);font-size:12.5px;font-weight:500;text-decoration:none}
.nb__foot a i{font-size:11px;transition:transform .2s}
.nb__foot a:hover i{transform:translateX(3px)}
.nb__foot a:focus-visible{outline:2px solid var(--ta-accent);outline-offset:-2px}
</style>