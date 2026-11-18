export type Card = { id: string; sec: string; secName: string; prompt: string; full: string; lead: string; answer: string; key: string }
export type CardState = { box: number; reps: number; lapses: number; due: string; misses: number; last?: string }
export type Settings = { ship: string; newPerDay: number; rate: number; gap: number; maxReviews?: number; learn?: "topic" | "count"; letters?: boolean; seenIntro?: boolean }
export type LogEntry = { d: string; n: number; ok: number }
export type Store = {
  v: 1
  settings: Settings
  cards: Record<string, CardState>
  intro: { date: string; n: number }
  studyReq?: { ids: string[] } // "Learn this" from Cards or after a miss: Study starts a session on exactly these, then clears it
  take?: { date: string; sec: string; n: number } // learn-fewer pick, for today only
  testIds?: string[]
  runs?: Record<string, { streak: number; clean: number; last: string }>
  edits: Record<string, string>
  log: LogEntry[]
}
export type Score = { ok: boolean; ratio: number; expected: string[]; hit: boolean[]; extra: string[] }
