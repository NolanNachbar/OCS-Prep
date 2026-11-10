export type Card = { id: string; sec: string; secName: string; prompt: string; full: string; lead: string; answer: string; key: string }
export type CardState = { box: number; reps: number; lapses: number; due: string; misses: number }
export type Settings = { ship: string; newPerDay: number; rate: number; gap: number; maxReviews?: number; letters?: boolean }
export type LogEntry = { d: string; n: number; ok: number }
export type Store = {
  v: 1
  settings: Settings
  cards: Record<string, CardState>
  intro: { date: string; n: number }
  pinned?: string[]
  testIds?: string[]
  runs?: Record<string, { streak: number; clean: number; last: string }>
  edits: Record<string, string>
  log: LogEntry[]
}
export type Score = { ok: boolean; ratio: number; expected: string[]; hit: boolean[]; extra: string[] }
