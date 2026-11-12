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

// Rank wording shows one labelled part per line (display only; the card text is unchanged).
export const lines = (t: string) => t.replace(/ (?=(?:Collar|Shoulder board|Sleeve|Insignia):)/g, "\n")
export const startsLine = (t: string, next?: string) => /^(?:Collar|Sleeve|Insignia):$/.test(t) || (t === "Shoulder" && next === "board:")

// Cards titled by a number (General Order #2, Code of Conduct, Article 2, Article II of the Constitution, Chain of Command #4).
// In the fill-in levels the number is a blank to fill instead of being handed over in the title and lead.
const WORDS = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen"]
const ORD = ["", "first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth", "eleventh", "twelfth", "thirteenth", "fourteenth", "fifteenth", "sixteenth", "seventeenth", "eighteenth"]
const ROMAN = ["", "i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x", "xi", "xii", "xiii", "xiv", "xv", "xvi", "xvii", "xviii"]
export function numbered(prompt: string) {
  const m = /^(.*?)(,?\s*(?:#|Article)\s*)(\d+|[IVX]+)\b(.*)$/.exec(prompt)
  if (!m) return null
  const n = /^\d+$/.test(m[3]) ? +m[3] : ROMAN.indexOf(m[3].toLowerCase())
  if (n < 1 || n > 18) return null
  const tailName = /^(.*\bthe) (.+)$/.exec(m[4].trim()) // "of the Constitution": the name comes after the number
  const head = m[1].trim()
  return {
    num: m[3], alts: [String(n), ROMAN[n], WORDS[n], ORD[n]],
    marker: m[2].trim().replace(/^,/, "").trim(), // "#" or "Article"
    name: head || tailName?.[2] || "", nameFirst: !!head, tailLead: head ? m[4].trim() : tailName?.[1] ?? "", sep: head && m[2].trim().startsWith(",") ? "," : "",
  }
}
// The lead says "the second general order"; with the number being asked for, that word is blanked.
export const hideOrdinal = (lead: string) => lead.replace(new RegExp(`\\b(${ORD.slice(1).join("|")})\\b`, "i"), "___")
