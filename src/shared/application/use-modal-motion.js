import { onMounted, onBeforeUnmount, ref } from 'vue'
import { gsap } from 'gsap'

/**
 * Enter/leave motion for any fixed-position dialog. Attach `card` to the inner
 * panel and `backdrop` to the overlay; both animate on mount. Returns `close()`,
 * which plays the leave animation and then emits through `onClosed`.
 * Respects prefers-reduced-motion (no animation, immediate close).
 */
export function useModalMotion(onClosed) {
  const card = ref(null)
  const backdrop = ref(null)
  const closing = ref(false)
  const reduce = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

  onMounted(() => {
    if (reduce() || !backdrop.value) return
    gsap.fromTo(backdrop.value, { opacity: 0 }, { opacity: 1, duration: .22, ease: 'power2.out', clearProps: 'opacity' })
    if (card.value) gsap.fromTo(card.value, { opacity: 0, y: 24, scale: .96 }, { opacity: 1, y: 0, scale: 1, duration: .4, ease: 'power3.out', clearProps: 'transform,opacity' })
  })

  function close() {
    if (closing.value) return
    closing.value = true
    if (reduce() || !card.value) { onClosed(); return }
    gsap.to(card.value, { opacity: 0, y: 12, scale: .97, duration: .2, ease: 'power2.in' })
    gsap.to(backdrop.value, { opacity: 0, duration: .2, ease: 'power2.in', onComplete: onClosed })
  }

  onBeforeUnmount(() => { gsap.killTweensOf([card.value, backdrop.value].filter(Boolean)) })
  return { card, backdrop, close }
}
