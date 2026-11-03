import { onBeforeUnmount, onMounted, ref } from 'vue'

/**
 * Tracks whether a bar should be tucked away: hidden after scrolling down a little (including
 * auto-scroll), shown again as soon as the reader scrolls up a little or returns to the top.
 */
export function useHideOnScroll({ threshold = 12, topZone = 80 } = {}) {
  const hidden = ref(false)
  let lastY = 0
  let travel = 0

  function onScroll() {
    const y = window.scrollY
    const delta = y - lastY
    lastY = y
    if (y < topZone) {
      hidden.value = false
      travel = 0
      return
    }
    // Restart the count whenever the direction changes, so small wobbles don't toggle it
    if (Math.sign(delta) !== Math.sign(travel)) travel = 0
    travel += delta
    if (travel > threshold) hidden.value = true
    else if (travel < -threshold) hidden.value = false
  }

  onMounted(() => {
    lastY = window.scrollY
    window.addEventListener('scroll', onScroll, { passive: true })
  })

  onBeforeUnmount(() => window.removeEventListener('scroll', onScroll))

  return { hidden }
}
