import { ChevronLeft, ChevronRight } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { Volume2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { Insignia } from "@/components/Insignia"
import { Diff, Eyebrow, MicButton, Panel, StatTile, Verdict } from "@/components/shared"
import { useCards } from "@/lib/cards"
import { hookFor } from "@/lib/hooks"
import * as L from "@/lib/ocs.js"
import { speak } from "@/lib/speech"
import { getStore, update, useStore } from "@/lib/store"
import type { Card, Score } from "@/lib/types"

// Each rung is strictly harder: more words blanked, then the letter cues go, then typing it cold.
const RANK_SECS = ["nve", "nvo", "mce", "mco"]
const LEVELS = ["Read it", "Some words", "Most words", "All words", "From memory"]
const FRAC = [0, 0.35, 0.7, 1, 1]
// stage is the level a card is due to be tried at next; lvl overrides it for one card (Next level up / Easier)
type Item = { uid: number; id: string; stage: number; missed?: boolean; lvl?: number; redo?: boolean }
type Trail = { item: Item; fin: boolean } // a card you just answered, and whether that answer cleared it
type Session = { queue: Item[]; total: number; done: number; miss: number }
let uid = 1
const today = () => L.ymd(new Date())
// Next-letter hint for the typed answer: what comes next, without showing more than one letter.
function nextLetter(c: Card, typed: string): string {
  const greet = (w: string) => w === "sir" || w === "maam"
  const u = L.words(typed).filter((w: string, i: number, a: string[]) => !(greet(w) && a.slice(0, i).every(greet)))
  const lead = L.words(c.lead || "").filter((w: string) => !greet(w))
  const exp: string[] = lead.length && u[0] === lead[0] ? [...lead, ...L.words(c.key)] : L.words(c.key)
  const midWord = typed.length > 0 && !/\s$/.test(typed)
  const done = midWord ? u.slice(0, -1) : u
  for (let i = 0; i < done.length; i++) if (done[i] !== exp[i]) return `Word ${i + 1} is off. Fix it before going on.`
  if (midWord && u.length) {
    const w = u[u.length - 1], e = exp[done.length]
    if (!e) return "You already have every word."
    if (w === e) return done.length + 1 >= exp.length ? "You already have every word." : `Next word starts with "${exp[done.length + 1][0]}".`
    return e.startsWith(w) ? `Next letter: "${e[w.length]}"` : `Word ${done.length + 1} is off. Fix it before going on.`
  }
  const e = exp[done.length]
  return e ? `Next word starts with "${e[0]}".` : "You already have every word."
}
const peekScore = (c: Card): Score => ({ ok: false, ratio: 0, expected: L.words(c.key), hit: L.words(c.key).map(() => false), extra: [] })

function logResult(ok: boolean) {
  update((s) => {
    const d = today()
    let e = s.log.find((x) => x.d === d)
    if (!e) { e = { d, n: 0, ok: 0 }; s.log.push(e) }
    e.n++; if (ok) e.ok++
    if (s.log.length > 400) s.log.shift()
    return s
  })
}

export default function Study() {
  const store = useStore()
  const { order: every, secIdx } = useCards()
  // Ranks are learned in the Ranks tab (pictures, groups, recall), so Study leaves them out.
  const order = useMemo(() => every.filter((c) => !RANK_SECS.includes(c.sec)), [every])
  const byId = useMemo(() => new Map(order.map((c) => [c.id, c])), [order])
  const [s, setS] = useState<Session | null>(null)
  const [manual, setManual] = useState<number | null>(null)
  const [trail, setTrail] = useState<Trail[]>([])

  const [day, setDay] = useState(today())
  useEffect(() => {
    const f = () => setDay(today())
    document.addEventListener("visibilitychange", f); window.addEventListener("focus", f)
    return () => { document.removeEventListener("visibilitychange", f); window.removeEventListener("focus", f) }
  }, [])
  const due = useMemo(() => order.filter((c) => store.cards[c.id]?.due && store.cards[c.id].due <= day), [order, store.cards, day])
  const fresh = useMemo(() => order.filter((c) => !store.cards[c.id]), [order, store.cards])

  // The session is what is due today (plus any cards you pinned). New cards come in only when you ask, or when nothing is due so the screen is never empty.
  const start = (extra: number, withNew = false) => {
    const t = today()
    const intro = getStore().intro.date === t ? getStore().intro : { date: t, n: 0 }
    if (intro !== getStore().intro) update((x) => { x.intro = intro; return x })
    const pins = getStore().pinned || []
    const pinned: Item[] = pins.filter((id) => byId.has(id)).map((id) => ({ uid: uid++, id, stage: store.cards[id] ? (store.cards[id].box >= 2 ? 4 : 2) : 0 }))
    if (pins.length) update((x) => { x.pinned = []; return x })
    const reviews: Item[] = due.filter((c) => !pins.includes(c.id))
      .sort((a, b) => store.cards[a.id].due.localeCompare(store.cards[b.id].due) || store.cards[a.id].box - store.cards[b.id].box)
      .slice(0, store.settings.maxReviews ?? 60).map((c) => ({ uid: uid++, id: c.id, stage: store.cards[c.id].box >= 2 ? 4 : 2 }))
    const room = Math.max(0, store.settings.newPerDay + extra - intro.n)
    const news: Item[] = !withNew && pinned.length + reviews.length > 0 ? [] : fresh.filter((c) => !pins.includes(c.id)).slice(0, room).map((c) => ({ uid: uid++, id: c.id, stage: 0 }))
    setTrail([])
    setS({ queue: [...pinned, ...reviews, ...news], total: pinned.length + reviews.length + news.length, done: 0, miss: 0 })
  }
  const started = useRef(false)
  // "Learn this next" pins added while a session is open go to the front of the queue.
  useEffect(() => {
    const pins = (store.pinned || []).filter((id) => byId.has(id))
    if (!started.current || !s || !pins.length) return
    const add: Item[] = pins.map((id) => ({ uid: uid++, id, stage: store.cards[id] ? (store.cards[id].box >= 2 ? 4 : 2) : 0 }))
    setS({ ...s, queue: [...add, ...s.queue.filter((i) => !pins.includes(i.id))], total: s.total + add.length })
    update((x) => { x.pinned = []; return x })
  }, [store.pinned]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!started.current) { started.current = true; start(0) } })

  const requeue = (q: Item[], item: Item, gap: number) => { const at = Math.min(q.length, gap); q.splice(at, 0, item) }

  const advance = (item: Item, ok: boolean, level = 4) => {
    if (!s) return
    setManual(null) // a leftover manual level must not trap the session below level 4
    if (item.stage === 0 && ok) return introduce(item)
    const c = byId.get(item.id)!
    const q = s.queue.slice(1)
    let { done, miss } = s
    let fin = false
    if (!ok) {
      miss++
      requeue(q, { uid: uid++, id: c.id, stage: Math.max(1, level - 1), missed: true }, 3)
    } else if (level === 0) {
      requeue(q, { uid: uid++, id: c.id, stage: item.stage, missed: item.missed }, 4) // reading it is not a pass
    } else if (level < 4) {
      requeue(q, { uid: uid++, id: c.id, stage: Math.min(4, Math.max(item.stage, level) + 1), missed: item.missed }, 4)
    } else {
      fin = true
      if (!item.redo) update((st) => {
        let cs = st.cards[c.id] || { box: 0, reps: 0, lapses: 0, due: today(), misses: 0 }
        if (item.missed && cs.reps > 0) cs = { ...cs, box: 1, lapses: cs.lapses + 1 }
        st.cards[c.id] = { misses: cs.misses || 0, ...L.schedule(cs, true, today(), st.settings.ship) }
        return st
      })
      done++
    }
    setTrail((t) => [...t.slice(-19), { item, fin }])
    setS({ queue: q, total: s.total, done, miss })
  }

  // Skip: nothing is scored, the card just moves to the other end.
  const skip = () => {
    if (!s || s.queue.length < 2) return
    setS({ ...s, queue: [...s.queue.slice(1), s.queue[0]] })
  }
  // Back: reopen the card you just answered (not the one skipped to the end). If it was already cleared, redoing it does not move its schedule again.
  const back = () => {
    if (!s || !trail.length) return
    const last = trail[trail.length - 1]
    const rest = s.queue.filter((i) => i.id !== last.item.id)
    setS({ ...s, queue: [{ ...last.item, uid: uid++, redo: last.fin || last.item.redo }, ...rest], done: last.fin ? s.done - 1 : s.done })
    setTrail(trail.slice(0, -1))
    setManual(null)
  }

  const setLevel = (item: Item, lv: number) => {
    if (s) setS({ ...s, queue: [{ ...item, uid: uid++, lvl: lv }, ...s.queue.slice(1)] })
  }

  const introduce = (item: Item) => {
    if (!s) return
    update((st) => {
      if (!st.cards[item.id]) {
        st.cards[item.id] = { box: 0, reps: 0, lapses: 0, due: today(), misses: 0 }
        st.intro = { date: today(), n: (st.intro.date === today() ? st.intro.n : 0) + 1 }
      }
      return st
    })
    const q = s.queue.slice(1)
    requeue(q, { uid: uid++, id: item.id, stage: 1 }, 3)
    setS({ ...s, queue: q })
  }

  const solid = order.filter((c) => (store.cards[c.id]?.box || 0) >= 4).length
  const startedN = order.length - fresh.length
  const item = s?.queue[0]
  const c = item ? byId.get(item.id) : undefined
  const level = item ? (manual ?? item.lvl ?? item.stage) : 0

  return (
    <div className="space-y-4">
      <div className="flex gap-3 pb-1">
        <StatTile value={due.length} label="Due today" tone="text-gold" />
        <StatTile value={startedN} label={`of ${order.length} started`} />
        <StatTile value={solid} label="Solid" tone="text-ok" />
      </div>

      {s && item && c ? (
        <Panel>
          <div className="mb-1 flex justify-between text-xs text-muted-foreground"><span>{s.queue.length} left</span><span>{s.done} of {s.total} cleared</span></div>
          <Progress value={s.total ? (s.done / s.total) * 100 : 0} className="mb-3 h-1.5 [&>div]:bg-gold" />
          <div className="mb-4 flex gap-3">
            <Button variant="outline" size="sm" className="flex-1" onClick={back} disabled={!trail.length}><ChevronLeft />Back</Button>
            <Button variant="outline" size="sm" className="flex-1" onClick={skip} disabled={s.queue.length < 2}>Skip<ChevronRight /></Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Eyebrow>{c.secName}</Eyebrow>
            <Badge variant="outline" className="rounded-none uppercase tracking-wider">{LEVELS[level]}</Badge>
            {item.missed && <Badge variant="destructive" className="rounded-sm uppercase tracking-wider">Retry</Badge>}
          </div>
          <h2 className="slab mt-3 mb-4 text-4xl font-bold leading-none">{c.prompt}</h2>
          <div className="mb-5 border border-border bg-black/25 p-3">
            <div className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-[0.12em]">
              <span className="text-muted-foreground">Fill in the blank</span>
              <span className="text-gold">{LEVELS[level]}{manual === null ? " (auto)" : ""}</span>
            </div>
            <Slider min={0} max={4} step={1} value={[level]} onValueChange={(v) => setManual(v[0])} aria-label="How much to fill in" aria-valuetext={LEVELS[level]} />
            <div className="mt-2 flex justify-between text-xs uppercase tracking-wider text-muted-foreground"><span>Nothing blank</span><span>Everything blank</span></div>
            <label className="mt-3 flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" className="size-5 accent-[#D8B24A]" checked={store.settings.letters !== false} onChange={(e) => update((st) => { st.settings.letters = e.target.checked; return st })} />Show the first letter in each blank</label>
            {manual !== null && <Button variant="ghost" size="sm" className="mt-1 px-0" onClick={() => setManual(null)}>Back to auto</Button>}
          </div>
          <Step key={item.uid + "-" + level} item={item} level={level} card={c} hook={hookFor(c, secIdx(c))} onIntro={() => introduce(item)} onHarder={() => setLevel(item, level + 1)} onEasier={() => setLevel(item, level - 1)} onNext={(ok) => advance(item, ok, level)} />
        </Panel>
      ) : s ? (
        <Panel>
          <Eyebrow>Session complete</Eyebrow>
          <h2 className="slab mt-2 text-2xl font-bold">{s.done} of {s.total} cleared</h2>
          <p className="mt-1 text-muted-foreground">{s.miss} misses. {fresh.length} cards unseen. {due.length} due now.</p>
          {fresh.length > 0 && <Button className="mt-4 mr-3" onClick={() => start(getStore().intro.n, true)}>Learn {store.settings.newPerDay} more</Button>}
          <Button variant="outline" className="mt-4" onClick={() => start(0)}>Check due cards</Button>
        </Panel>
      ) : null}
    </div>
  )
}

function Step({ item, level, card: c, hook, onIntro, onHarder, onEasier, onNext }: { item: Item; level: number; card: Card; hook: string; onIntro: () => void; onHarder: () => void; onEasier: () => void; onNext: (ok: boolean) => void }) {
  const [hint, setHint] = useState(false)
  const [peek, setPeek] = useState<string | null>(null)
  const store = useStore()
  const [res, setRes] = useState<{ r: Score; note?: string; peeked?: boolean } | null>(null)
  const [text, setText] = useState("")
  const [tainted, setTainted] = useState(false) // a failed or peeked attempt can never graduate the card
  const [vals, setVals] = useState<Record<number, string>>({})
  const toks = useMemo(() => (level >= 1 && level <= 3 ? L.cloze(c, FRAC[level], item.uid) : []), [level, c, item.uid])

  const record = (r: Score, note?: string, peeked?: boolean) => {
    if (!r.ok) update((st) => { if (st.cards[c.id]) st.cards[c.id].misses = (st.cards[c.id].misses || 0) + 1; return st })
    logResult(r.ok)
    setRes({ r, note, peeked })
  }

  if (level === 0) {
    return (
      <div>
        {c.lead && <p className="italic text-muted-foreground">{c.lead}</p>}
        <p className="text-lg leading-relaxed">{c.answer}</p>
        <Insignia card={c} />
        {hook && <Hook text={hook} />}
        <p className="mt-4 text-sm text-muted-foreground">Read it, then say it out loud once without looking.</p>
        <div className="mt-2 flex flex-wrap gap-3">
          {item.stage === 0 ? <><Button onClick={onIntro}>I said it aloud</Button><Button variant="outline" onClick={onHarder}>Make it harder</Button></> : <Button onClick={() => onNext(true)}>Next card</Button>}
          <Button variant="outline" onClick={() => speak((c.lead ? c.lead + " " : "") + c.answer, store.settings.rate)}><Volume2 /> Hear it</Button>
        </div>
      </div>
    )
  }

  const check = () => {
    if (level < 4) {
      const blanks = toks.filter((t: { blank: boolean }) => t.blank)
      let good = 0
      blanks.forEach((t: { text: string }, i: number) => { if (L.norm(vals[i] || "") === L.norm(t.text)) good++ })
      const ok = good === blanks.length
      const base = peekScore(c)
      record({ ...base, ok, ratio: blanks.length ? good / blanks.length : 1, hit: base.hit.map(() => ok) }, `${good} of ${blanks.length} blanks right`)
    } else record(L.score(c, text))
  }

  let bi = 0
  return (
    <div>
      {c.lead && <p className="italic text-muted-foreground">{level < 4 ? c.lead : "Start with: " + c.lead}</p>}
      {level < 4 ? (
        <p className="text-xl leading-[2.4]">
          {toks.map((t: { text: string; blank: boolean }, i: number) => {
            if (!t.blank) return <span key={i}>{t.text} </span>
            const k = bi++
            const state = res ? (L.norm(vals[k] || "") === L.norm(t.text) ? "border-b-ok bg-ok/15" : "border-b-destructive bg-destructive/15") : "border-b-gold"
            return (
              <input key={i} value={vals[k] || ""} disabled={!!res} autoFocus={k === 0}
                onChange={(e) => setVals({ ...vals, [k]: e.target.value })}
                size={Math.min(Math.max(3, L.norm(t.text).length), 14)}
                autoCapitalize="none" autoComplete="off" autoCorrect="off" spellCheck={false} aria-label={`blank ${k + 1}`}
                placeholder={level >= 1 && store.settings.letters !== false ? t.text.replace(/^[^A-Za-z0-9]*/, "").slice(0, 1) : ""}
                className={`mx-1 min-h-11 rounded-none border-0 border-b-2 bg-secondary px-2 py-1 text-center text-xl text-foreground outline-none placeholder:text-gold placeholder:font-bold focus:bg-muted ${state}`} />
            )
          })}
        </p>
      ) : (
        <Textarea value={text} disabled={!!res} onChange={(e) => { setText(e.target.value); setPeek(null) }} autoFocus autoCapitalize="none" autoCorrect="off" spellCheck={false} aria-label="Your recital"
          placeholder="Type it, or use the keyboard microphone (dictation)" className="min-h-32 bg-background/60 text-lg" />
      )}
      {res ? (
        <div>
          <Verdict ok={res.r.ok} note={hint && level === 4 && res.r.ok ? "Correct, but you used the hint, so it does not count. Try it again without." : res.note} />
          <Diff r={res.r} />
          <Insignia card={c} />
          {!res.r.ok && hook && <Hook text={hook} />}
          <div className="mt-4 flex flex-col gap-6">
            <Button onClick={() => onNext(res.r.ok && !(hint && level === 4) && !tainted)} autoFocus>Next</Button>
            {res.r.ok && level < 4 && <Button variant="outline" onClick={onHarder}>Next level up</Button>}
            {!res.r.ok && level > 1 && <Button variant="outline" onClick={onEasier}>Easier level</Button>}
            {!res.r.ok && <Button variant="outline" onClick={() => { setTainted(true); setRes(null); setText(""); setVals({}) }}>Try again</Button>}
            {!res.r.ok && !res.peeked && level < 4 && <Button variant="outline" onClick={() => onNext(true)}>Count as correct</Button>}
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap gap-3">
          {hint && hook && level < 4 && <div className="w-full"><Hook text={hook} /></div>}
          {level === 4 && peek && <p className="w-full text-gold">{peek}</p>}
          <Button onClick={check}>Check</Button>
          {level === 4 && <MicButton onText={(t) => setText(t)} />}
          {level === 4
            ? <Button variant="outline" onClick={() => { setHint(true); setPeek(nextLetter(c, text)) }}>Hint</Button>
            : hook && <Button variant="outline" onClick={() => setHint(true)} disabled={hint}>Hint</Button>}
          <Button variant="outline" onClick={() => record(peekScore(c), undefined, true)}>Show answer</Button>
        </div>
      )}
    </div>
  )
}

function Hook({ text }: { text: string }) {
  return (
    <div className="mt-4 border border-gold/50 bg-black/20 p-3 text-[0.95rem] text-foreground">
      <div className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-gold">Memory hook</div>
      {text}
    </div>
  )
}
