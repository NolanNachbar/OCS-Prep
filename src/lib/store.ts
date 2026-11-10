import { useSyncExternalStore } from "react"
import type { Store } from "./types"

const KEY = "ocsprep.v1"
const defaults = (): Store => ({
  v: 1,
  settings: { ship: "2027-01-01", newPerDay: 5, rate: 1, gap: 6 },
  cards: {},
  intro: { date: "", n: 0 },
  edits: {},
  log: [],
})

const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x)

// Keep only well-typed fields so a bad save or import can never white-screen the app.
export function sanitize(raw: unknown): Store {
  const d = defaults()
  if (!isObj(raw)) return d
  const st = isObj(raw.settings) ? raw.settings : {}
  const num = (v: unknown, fb: number, lo: number, hi: number) => (typeof v === "number" && isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fb)
  const settings = {
    ...d.settings,
    ship: typeof st.ship === "string" && /^\d{4}-\d{2}-\d{2}$/.test(st.ship) ? st.ship : d.settings.ship,
    newPerDay: num(st.newPerDay, d.settings.newPerDay, 1, 30),
    rate: num(st.rate, d.settings.rate, 0.5, 2),
    gap: num(st.gap, d.settings.gap, 2, 30),
    ...(st.maxReviews === undefined ? {} : { maxReviews: num(st.maxReviews, 60, 10, 200) }),
  }
  const cards: Store["cards"] = {}
  if (isObj(raw.cards)) for (const [id, v] of Object.entries(raw.cards)) {
    if (!isObj(v) || typeof v.due !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v.due)) continue
    const n = (x: unknown) => (typeof x === "number" && isFinite(x) && x >= 0 ? x : 0)
    cards[id] = { box: n(v.box), reps: n(v.reps), lapses: n(v.lapses), misses: n(v.misses), due: v.due }
  }
  const edits: Store["edits"] = {}
  if (isObj(raw.edits)) for (const [id, v] of Object.entries(raw.edits)) if (typeof v === "string") edits[id] = v
  const intro = isObj(raw.intro) && typeof raw.intro.date === "string" && typeof raw.intro.n === "number" ? { date: raw.intro.date, n: raw.intro.n } : d.intro
  const out: Store = { ...d, settings, cards, edits, intro, log: Array.isArray(raw.log) ? (raw.log as Store["log"]) : [] }
  if (Array.isArray(raw.pinned)) out.pinned = raw.pinned.filter((x): x is string => typeof x === "string")
  if (Array.isArray(raw.testIds)) out.testIds = raw.testIds.filter((x): x is string => typeof x === "string")
  if (isObj(raw.runs)) out.runs = raw.runs as Store["runs"]
  return out
}

function read(): Store {
  try { return sanitize(JSON.parse(localStorage.getItem(KEY) || "null")) } catch { /* private mode or empty storage */ }
  return defaults()
}

let state: Store = read()
const subs = new Set<() => void>()

export let saveFailed = false
function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); saveFailed = false } catch { saveFailed = true }
}
// Another tab or the installed app wrote: take its state instead of overwriting it on our next save.
if (typeof window !== "undefined") window.addEventListener("storage", (e) => {
  if (e.key !== KEY) return
  state = read()
  subs.forEach((f) => f())
})
export function update(fn: (s: Store) => Store | void) {
  const next = fn(structuredClone(state))
  state = next || state
  persist()
  subs.forEach((f) => f())
}
export function replace(s: Store) { update(() => sanitize(s)) }
export function reset() { update(() => defaults()) }
export const getStore = () => state
export function useStore(): Store {
  return useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f) }, () => state)
}
