// Plays a card's recorded clip (the same prompt-then-answer recording Listen uses). One clip at a time.
let cur: { a: HTMLAudioElement; done?: (ok: boolean) => void } | null = null

export function stopClip() {
  const c = cur
  cur = null
  if (c) { c.a.pause(); c.done?.(true) }
}

export function playClip(id: string, rate = 1, done?: (ok: boolean) => void) {
  stopClip()
  const a = new Audio(`${import.meta.env.BASE_URL}audio/cards/${id}-read.mp3`)
  a.playbackRate = rate
  const me = { a, done }
  cur = me
  const end = (ok: boolean) => { if (cur === me) { cur = null; done?.(ok) } }
  a.onended = () => end(true)
  a.onerror = () => end(false)
  a.play().catch(() => end(false))
}
