const keep: SpeechSynthesisUtterance[] = [] // hold a reference so the browser does not drop onend
export function speak(text: string, rate = 1, done?: () => void) {
  if (!("speechSynthesis" in window)) { done?.(); return }
  const u = new SpeechSynthesisUtterance(text)
  u.rate = rate
  const drop = () => { const i = keep.indexOf(u); if (i >= 0) keep.splice(i, 1) }
  keep.push(u)
  u.onend = () => { drop(); done?.() }
  u.onerror = () => { drop(); done?.() }
  speechSynthesis.speak(u)
}
export function stopSpeaking() { if ("speechSynthesis" in window) speechSynthesis.cancel() }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const w = window as any
export const SR: (new () => any) | undefined = w.SpeechRecognition || w.webkitSpeechRecognition
