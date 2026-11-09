import { useSyncExternalStore } from "react"
import type { Store } from "./types"

const KEY = "ocsprep.v1"
const defaults = (): Store => ({
  v: 1,
  settings: { ship: "2027-04-01", newPerDay: 5, threshold: 0.95, rate: 1, gap: 6 },
  cards: {},
  intro: { date: "", n: 0 },
  edits: {},
  log: [],
})

function read(): Store {
  const d = defaults()
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || "null")
    if (s && typeof s === "object") return { ...d, ...s, settings: { ...d.settings, ...(s.settings || {}) } }
  } catch {
    /* private mode or empty storage */
  }
  return d
}

let state: Store = read()
const subs = new Set<() => void>()

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* storage unavailable */ }
}
export function update(fn: (s: Store) => Store | void) {
  const next = fn(structuredClone(state))
  state = next || state
  persist()
  subs.forEach((f) => f())
}
export function replace(s: Store) { update(() => ({ ...defaults(), ...s })) }
export function reset() { update(() => defaults()) }
export const getStore = () => state
export function useStore(): Store {
  return useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f) }, () => state)
}
