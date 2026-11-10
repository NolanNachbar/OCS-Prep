import type { KeyboardEvent } from "react"

// Move between fill-in boxes from the keyboard: space, Enter or the arrows. Enter in the last box checks the answer.
export function onBlankKey(e: KeyboardEvent<HTMLInputElement>, submit: () => void) {
  const el = e.currentTarget
  const all = Array.from(document.querySelectorAll<HTMLInputElement>("input[data-blank]:not(:disabled)"))
  const i = all.indexOf(el)
  const go = (n: number) => { const t = all[n]; if (!t) return; e.preventDefault(); t.focus(); t.select() }
  const atStart = el.selectionStart === 0 && el.selectionEnd === 0
  const atEnd = el.selectionStart === el.value.length && el.selectionEnd === el.value.length
  if (e.key === " " || e.key === "ArrowDown" || (e.key === "ArrowRight" && atEnd)) { e.preventDefault(); go(i + 1) }
  else if (e.key === "ArrowUp" || (e.key === "ArrowLeft" && atStart)) go(i - 1)
  else if (e.key === "Enter") { e.preventDefault(); if (i < all.length - 1) go(i + 1); else submit() }
}
