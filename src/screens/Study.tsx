import { ChevronLeft, ChevronRight } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { Volume2 } from "lucide-react"
import { hideOrdinal, lines, numbered, onBlankKey, startsLine } from "@/lib/blanks"
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
import { isDue, sessionQueue, suggestion, topicStats } from "@/lib/queue.js"
import { speak } from "@/lib/speech"
import { getStore, update, useStore } from "@/lib/store"
import type { Card, Score } from "@/lib/types"

// Each rung is strictly harder: more words blanked, then the letter cues go, then typing it cold.
const RANK_SECS = ["nve", "nvo", "mce", "mco"]
const LEVELS = ["Read it", "Some words", "Most words", "All words", "From memory"]
const FRAC = [0, 0.35, 0.7, 1, 1]
// A short card blanks the same words at several rungs, so offer only the rungs that really differ.
const rungs = (c: Card): number[] => {
  const out = [0]
  let prev = 0
  for (const l of [1, 2, 3]) {
    const n = L.cloze(c, FRAC[l], 0).filter((t: { blank: boolean }) => t.blank).length
    if (n > prev) { out.push(l); prev = n }
  }
  return [...out, 4]
}
// stage is the level a card is due to be tried at next; lvl overrides it for one card (Next level up / Easier)
type Item = { uid: number; id: string; stage: number; missed?: boolean; lvl?: number; redo?: boolean }
type Trail = { item: Item; fin: boolean; skip?: boolean } // a card you just answered, and whether that answer cleared it
type Session = { queue: Item[]; total: number; done: number; miss: number; day: string }
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
  const byId = useMemo(() => new Map(every.map((c) => [c.id, c])), [every]) // "Learn this" may ask for a rank card too
  const [s, setS] = useState<Session | null>(null)
  const [manual, setManual] = useState<number | null>(null)
  const [trail, setTrail] = useState<Trail[]>([])

  const [day, setDay] = useState(today())
  useEffect(() => {
    const f = () => setDay(today())
    document.addEventListener("visibilitychange", f); window.addEventListener("focus", f)
    return () => { document.removeEventListener("visibilitychange", f); window.removeEventListener("focus", f) }
  }, [])
  const due = useMemo(() => order.filter((c) => isDue(store.cards[c.id], day)), [order, store.cards, day])
  const fresh = useMemo(() => order.filter((c) => !store.cards[c.id]), [order, store.cards])

  // A session is what the learner picked: a topic, the due reviews, or exactly the cards asked for from Cards / after a miss.
  const begin = (opt: { ids?: string[]; sec?: string; take?: number }) => {
    const t = today()
    const st = getStore()
    const q = sessionQueue({ order: opt.ids ? every : order, cards: st.cards, today: t, settings: st.settings, ...opt })
    const queue: Item[] = q.map((i: { id: string; stage: number }) => ({ uid: uid++, ...i }))
    setTrail([]); setManual(null); setOpen(null)
    setS({ queue, total: queue.length, done: 0, miss: 0, day: t })
    window.scrollTo(0, 0)
  }
  const [open, setOpen] = useState<string | null>(null)
  const [takes, setTakes] = useState<Record<string, number>>({})
  // "Learn this" (Cards, or after a miss): App has switched here; start on exactly those cards and clear the request.
  useEffect(() => {
    const req = store.studyReq
    if (!req) return
    update((x) => { delete x.studyReq; return x })
    if (req.ids.length) begin({ ids: req.ids })
  }, [store.studyReq]) // eslint-disable-line react-hooks/exhaustive-deps

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
      requeue(q, { uid: uid++, id: c.id, stage: Math.max(1, level - 1), missed: true, redo: item.redo }, 3)
    } else if (level === 0) {
      requeue(q, { uid: uid++, id: c.id, stage: item.stage, missed: item.missed, redo: item.redo }, 4) // reading it is not a pass
    } else if (level < 4) {
      requeue(q, { uid: uid++, id: c.id, stage: Math.min(4, Math.max(item.stage, level) + 1), missed: item.missed, redo: item.redo }, 4)
    } else {
      fin = true
      if (!item.redo) update((st) => {
        let cs = st.cards[c.id] || { box: 0, reps: 0, lapses: 0, due: today(), misses: 0 }
        if (item.missed && cs.reps > 0) cs = { ...cs, box: 1, lapses: cs.lapses + 1 }
        st.cards[c.id] = { ...L.schedule(cs, true, today(), st.settings.ship, c.id), misses: item.missed ? cs.misses || 0 : 0 } // a clean type-it-cold pass clears the weak count
        return st
      })
      done++
    }
    setTrail((t) => [...t.slice(-19), { item, fin }])
    setS({ ...s, queue: q, done, miss })
  }

  // Skip: nothing is scored, the card just moves to the other end.
  const skip = () => {
    if (!s || s.queue.length < 2) return
    setTrail((t) => [...t.slice(-19), { item: s.queue[0], fin: false, skip: true }])
    setManual(null)
    setS({ ...s, queue: [...s.queue.slice(1), s.queue[0]] })
  }
  // Back: reopen the card you just answered (not the one skipped to the end). If it was already cleared, redoing it does not move its schedule again.
  const back = () => {
    if (!s || !trail.length) return
    const last = trail[trail.length - 1]
    if (last.skip) { // undo a skip: the card went to the end of the queue, bring it back to the front
      const end = s.queue[s.queue.length - 1]
      if (end && end.id === last.item.id) setS({ ...s, queue: [end, ...s.queue.slice(0, -1)] })
      setTrail(trail.slice(0, -1)); setManual(null)
      return
    }
    const rest = s.queue.filter((i) => i.id !== last.item.id)
    setS({ ...s, queue: [{ ...last.item, uid: uid++, redo: last.fin || last.item.redo }, ...rest], done: last.fin ? s.done - 1 : s.done })
    setTrail(trail.slice(0, -1))
    setManual(null)
  }

  const setLevel = (item: Item, lv: number, miss = false) => {
    if (s) { setManual(null); setS({ ...s, miss: s.miss + (miss ? 1 : 0), queue: [{ ...item, uid: uid++, lvl: lv, missed: item.missed || miss }, ...s.queue.slice(1)] }) } // the slider's manual level would otherwise win over this one
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
    setTrail((t) => [...t.slice(-19), { item, fin: false }])
    setS({ ...s, queue: q })
  }

  const stats = useMemo(() => topicStats({ order, cards: store.cards, today: day }), [order, store.cards, day])
  const sug = useMemo(() => suggestion({ order, cards: store.cards, today: day }) as Sug, [order, store.cards, day])
  const takeOf = (sec: string, max: number) => Math.min(max, takes[sec] ?? max)
  const setTake = (sec: string, n: number) => setTakes((t) => ({ ...t, [sec]: n }))
  const solid = order.filter((c) => (store.cards[c.id]?.box || 0) >= 4).length
  const startedN = order.length - fresh.length
  const nextDue = sug.kind === "done" && sug.next ? sug.next : null
  const item = s?.queue[0]
  const c = item ? byId.get(item.id) : undefined
  const rg = c ? rungs(c) : [0, 1, 2, 3, 4]
  const want = item ? (manual ?? item.lvl ?? item.stage) : 0
  const level = rg.find((l) => l >= want) ?? 4 // a rung this card doesn't have rounds up to the next real one

  return (
    <div className="space-y-4">
      <div className="flex gap-3 pb-1">
        <StatTile value={due.length} label="Due today" tone="text-gold" />
        <StatTile value={startedN} label={`of ${order.length} started`} />
        <StatTile value={solid} label="Solid" tone="text-ok" />
      </div>

      {s && item && c ? (
        <Panel>
          <Button variant="ghost" size="sm" className="mb-2 min-h-11 px-0" data-testid="stop" onClick={() => { setS(null); setManual(null) }}><ChevronLeft />Stop, back to topics</Button>
          <div className="mb-1 flex justify-between text-xs text-muted-foreground"><span>{s.queue.length} left</span><span>{s.done} of {s.total} cleared</span></div>
          <Progress value={s.total ? (s.done / s.total) * 100 : 0} className="mb-3 h-1.5 [&>div]:bg-gold" />
          <div className="mb-4 flex gap-3">
            <Button variant="outline" size="sm" className="min-h-11 flex-1" onClick={back} disabled={!trail.length}><ChevronLeft />Back</Button>
            <Button variant="outline" size="sm" className="min-h-11 flex-1" onClick={skip} disabled={s.queue.length < 2}>Skip<ChevronRight /></Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Eyebrow>{c.secName}</Eyebrow>
            <Badge variant="outline" className="rounded-none uppercase tracking-wider">{LEVELS[level]}</Badge>
            {item.missed && <Badge variant="destructive" className="rounded-sm uppercase tracking-wider">Retry</Badge>}
          </div>
          <h2 className="slab mt-3 mb-4 text-4xl font-bold leading-none">{level >= 1 && level < 4 && numbered(c.prompt) ? "Which one?" : c.prompt}</h2>
          <div className="mb-5 border border-border bg-black/25 p-3">
            <div className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-[0.12em]">
              <span className="text-muted-foreground">Fill in the blank</span>
              <span className="text-gold">{LEVELS[level]}{manual === null ? " (auto)" : ""}</span>
            </div>
            <Slider min={0} max={rg.length - 1} step={1} value={[rg.indexOf(level)]} onValueChange={(v) => setManual(rg[v[0]])} aria-label="How much to fill in" aria-valuetext={LEVELS[level]} />
            <div className="mt-2 flex justify-between text-xs uppercase tracking-wider text-muted-foreground"><span>Nothing blank</span><span>Everything blank</span></div>
            <label className="mt-3 flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" className="size-5 accent-[#D8B24A]" checked={store.settings.letters !== false} onChange={(e) => update((st) => { st.settings.letters = e.target.checked; return st })} />Show the first letter in each blank</label>
            {manual !== null && <Button variant="ghost" size="sm" className="mt-1 px-0" onClick={() => setManual(null)}>Back to auto</Button>}
          </div>
          <Step key={item.uid + "-" + level} item={item} level={level} card={c} hook={hookFor(c, secIdx(c))} onIntro={() => introduce(item)} onHarder={() => setLevel(item, rg[rg.indexOf(level) + 1] ?? 4)} onEasier={rg.indexOf(level) > 1 ? () => setLevel(item, rg[rg.indexOf(level) - 1], true) : undefined} onNext={(ok) => advance(item, ok, level)} />
        </Panel>
      ) : s ? (
        <>
          <Panel>
            <Eyebrow>Session complete</Eyebrow>
            <h2 className="slab mt-2 text-2xl font-bold">{s.done} of {s.total} cleared</h2>
            <p className="mt-1 text-muted-foreground">{s.miss} misses. {fresh.length} cards unseen. {due.length} due now.</p>
            <Button className="mt-4 min-h-11" data-testid="back-topics" onClick={() => setS(null)}>Back to topics</Button>
          </Panel>
          {sug.kind !== "done" && <SuggestCard sug={sug} n={sug.kind === "topic" ? takeOf(sug.sec, sug.max) : 0} onPick={(n) => sug.kind === "topic" && setTake(sug.sec, n)}
            onStart={() => sug.kind === "topic" ? begin({ sec: sug.sec, take: takeOf(sug.sec, sug.max) }) : begin({})} nextDue={nextDue} />}
        </>
      ) : (
        <>
          <SuggestCard sug={sug} n={sug.kind === "topic" ? takeOf(sug.sec, sug.max) : 0} onPick={(n) => sug.kind === "topic" && setTake(sug.sec, n)}
            onStart={() => sug.kind === "topic" ? begin({ sec: sug.sec, take: takeOf(sug.sec, sug.max) }) : begin({})} nextDue={nextDue} />
          <Button variant="outline" className="min-h-11 w-full" data-testid="review-due" disabled={!due.length} onClick={() => begin({})}>Review due ({due.length})</Button>
          <Panel>
            <Eyebrow>Topics</Eyebrow>
            <ul className="mt-2 divide-y divide-border" data-testid="topics">
              {stats.map((t: { sec: string; name: string; total: number; started: number; unseen: number; due: number; max: number }) => (
                <li key={t.sec} data-topic={t.sec}>
                  <button type="button" className="flex min-h-11 w-full flex-col py-3 text-left" aria-expanded={open === t.sec} onClick={() => setOpen(open === t.sec ? null : t.sec)}>
                    <span className="flex w-full items-baseline justify-between gap-2"><span className="font-bold">{t.name}</span><span className={`text-sm ${t.due ? "text-gold" : "text-muted-foreground"}`}>{t.due} due</span></span>
                    <span className="text-sm text-muted-foreground">{t.started} of {t.total} started</span>
                    <Progress value={(t.started / t.total) * 100} className="mt-1 h-1 [&>div]:bg-gold" />
                  </button>
                  {open === t.sec && (
                    <div className="pb-3">
                      {t.unseen > 0 && <TopicPick label={t.name} max={t.max} n={takeOf(t.sec, t.max)} onPick={(n) => setTake(t.sec, n)} bare showLabel />}
                      <Button className="mt-3 min-h-11" disabled={!t.due && !t.unseen} onClick={() => begin({ sec: t.sec, take: takeOf(t.sec, t.max) })}>Study {t.name}</Button>
                      {!t.due && !t.unseen && <p className="mt-2 text-sm text-muted-foreground">Nothing due here. Test it, or use Learn this on the Cards tab.</p>}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </Panel>
        </>
      )}
    </div>
  )
}

// Learn fewer: pick 1 up to every card the topic offers for this session.
function TopicPick({ label, max, n, onPick, showLabel }: { label: string; max: number; n: number; onPick: (n: number) => void; bare?: boolean; showLabel?: boolean }) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2" data-testid="topic-pick">
      {showLabel && <span className="mr-1 w-full text-sm">New {label} cards: {n === max ? `all ${max}` : `${n} of ${max}`}</span>}
      <Button variant="outline" size="sm" className="min-h-11 min-w-11" aria-label="Fewer cards" disabled={n <= 1} onClick={() => onPick(n - 1)}>-</Button>
      <span className="min-w-8 text-center font-semibold" data-testid="take-n">{n}</span>
      <Button variant="outline" size="sm" className="min-h-11 min-w-11" aria-label="More cards" disabled={n >= max} onClick={() => onPick(n + 1)}>+</Button>
      <Button variant="ghost" size="sm" className="min-h-11" disabled={n >= max} onClick={() => onPick(max)}>All</Button>
    </div>
  )
}

type Sug = { kind: "topic"; sec: string; name: string; n: number; max: number } | { kind: "review"; n: number } | { kind: "done"; next: string | null }
function SuggestCard({ sug, n, onPick, onStart, nextDue }: { sug: Sug; n: number; onPick: (n: number) => void; onStart: () => void; nextDue: string | null }) {
  return (
    <Panel>
      <div data-testid="suggestion">
        <Eyebrow>Suggested</Eyebrow>
        {sug.kind === "topic" && <>
          <h2 className="slab mt-2 text-2xl font-bold">Suggested: {sug.name}, {n} new {n === 1 ? "card" : "cards"}</h2>
          <TopicPick label={sug.name} max={sug.max} n={n} onPick={onPick} />
        </>}
        {sug.kind === "review" && <h2 className="slab mt-2 text-2xl font-bold">Suggested: review {sug.n} due {sug.n === 1 ? "card" : "cards"}</h2>}
        {sug.kind === "done" && <>
          <h2 className="slab mt-2 text-2xl font-bold">You are all caught up</h2>
          {nextDue && <p className="mt-1 text-muted-foreground">Next card due {nextDue}.</p>}
        </>}
        {sug.kind !== "done" && <Button className="mt-4 min-h-11 w-full" data-testid="start-suggested" onClick={onStart}>Start</Button>}
      </div>
    </Panel>
  )
}

function Step({ item, level, card: c, hook, onIntro, onHarder, onEasier, onNext }: { item: Item; level: number; card: Card; hook: string; onIntro: () => void; onHarder: () => void; onEasier?: () => void; onNext: (ok: boolean) => void }) {
  const [hint, setHint] = useState(false)
  const [peek, setPeek] = useState<string | null>(null)
  const store = useStore()
  const [res, setRes] = useState<{ r: Score; note?: string; peeked?: boolean } | null>(null)
  const [text, setText] = useState("")
  const [tainted, setTainted] = useState(false) // a failed or peeked attempt can never graduate the card
  const [vals, setVals] = useState<Record<number, string>>({})
  const nb = level >= 1 && level < 4 ? numbered(c.prompt) : null
  const words = nb ? nb.name.split(/\s+/).filter(Boolean) : [] // each word of the name is its own blank
  // The name (General Order, Code of Conduct, Chain of Command, Constitution) is sometimes a blank too, at the same odds as a word.
  const nameBlank = !!nb && nb.name !== "" && [...c.id + item.uid].reduce((h, ch) => Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0, 2166136261) / 4294967296 < FRAC[level]
  const okBlank = (t: { text: string; alts?: string[] }, v: string) => (t.alts ? t.alts.includes(L.norm(v)) : L.norm(v).replace(/ /g, "") === L.norm(t.text).replace(/ /g, ""))
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
        <p className="whitespace-pre-line text-lg leading-relaxed">{lines(c.answer)}</p>
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
      const blanks = [...(nb ? [{ text: nb.num, alts: nb.alts }] : []), ...(nameBlank ? words.map((w) => ({ text: w })) : []), ...toks.filter((t: { blank: boolean }) => t.blank)]
      let good = 0
      blanks.forEach((t: { text: string; alts?: string[] }, i: number) => { if (okBlank(t, vals[i] || "")) good++ })
      const ok = good === blanks.length
      const base = peekScore(c)
      record({ ...base, ok, ratio: blanks.length ? good / blanks.length : 1, hit: base.hit.map(() => ok) }, `${good} of ${blanks.length} blanks right`)
    } else record(L.score(c, text))
  }

  const box = (k: number, text: string, alts?: string[]) => {
    const good = okBlank({ text, alts }, vals[k] || "")
    return (
      <span className="inline-flex flex-col items-center align-top">
        <input value={vals[k] || ""} disabled={!!res} autoFocus={k === 0} onChange={(e) => setVals({ ...vals, [k]: e.target.value })} size={Math.min(Math.max(3, text.length), 14)}
          data-blank onKeyDown={(e) => onBlankKey(e, check)} autoCapitalize="none" autoComplete="off" autoCorrect="off" spellCheck={false} aria-label={k === 0 ? "number" : "name"}
          className={`mx-1 min-h-11 rounded-none border-0 border-b-2 bg-secondary px-2 py-1 text-center text-xl text-foreground outline-none focus:bg-muted ${res ? (good ? "border-b-ok bg-ok/15" : "border-b-destructive bg-destructive/15") : "border-b-gold"}`} />
        {res && !good && <span className="-mt-3 text-sm font-bold leading-none text-ok">{text}</span>}
      </span>
    )
  }
  const nameBoxes = () => words.map((w, i) => <span key={i}>{i > 0 && " "}{box(1 + i, w)}</span>)
  let bi = nb ? (nameBlank ? 1 + words.length : 1) : 0
  return (
    <div>
      {c.lead && <p className="italic text-muted-foreground">{level < 4 ? (nb ? hideOrdinal(c.lead) : c.lead) : "Start with: " + c.lead}</p>}
      {level < 4 ? (
        <p className="text-xl leading-[2.4]">
          {nb && (
            <>
              {nb.nameFirst && (nameBlank ? <>{nameBoxes()}{nb.sep} </> : <>{nb.name}{nb.sep} </>)}
              {nb.marker} {box(0, nb.num, nb.alts)}
              {nb.tailLead && <> {nb.tailLead}</>}
              {!nb.nameFirst && nb.name && (nameBlank ? <> {nameBoxes()}</> : <> {nb.name}</>)}
              <br />
            </>
          )}
          {toks.map((t: { text: string; blank: boolean }, i: number) => {
            const br = i > 0 && startsLine(t.text, toks[i + 1]?.text) && <br />
            if (!t.blank) return <span key={i}>{br}{t.text} </span>
            const k = bi++
            const right = L.norm(vals[k] || "") === L.norm(t.text)
            const state = res ? (right ? "border-b-ok bg-ok/15" : "border-b-destructive bg-destructive/15") : "border-b-gold"
            return (
              <span key={i}>{br}<span className="inline-flex flex-col items-center align-top"><input value={vals[k] || ""} disabled={!!res} autoFocus={k === 0 && !nb}
                onChange={(e) => setVals({ ...vals, [k]: e.target.value })}
                size={Math.min(Math.max(3, L.norm(t.text).length), 14)}
                data-blank onKeyDown={(e) => onBlankKey(e, check)} autoCapitalize="none" autoComplete="off" autoCorrect="off" spellCheck={false} aria-label={`blank ${k + 1}`}
                placeholder={level >= 1 && store.settings.letters !== false ? t.text.replace(/^[^A-Za-z0-9]*/, "").slice(0, 1) : ""}
                className={`mx-1 min-h-11 rounded-none border-0 border-b-2 bg-secondary px-2 py-1 text-center text-xl text-foreground outline-none placeholder:text-gold placeholder:font-bold focus:bg-muted ${state}`} />
                {res && !right && <span className="-mt-3 text-sm font-bold leading-none text-ok">{t.text}</span>}</span></span>
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
            {!res.r.ok && onEasier && <Button variant="outline" onClick={onEasier}>Easier level</Button>}
            {!res.r.ok && <Button variant="outline" onClick={() => { setTainted(true); setRes(null); setText(""); setVals({}) }}>Try again</Button>}
            {!res.r.ok && !res.peeked && <Button variant="outline" onClick={() => onNext(true)}>Count as correct</Button>}
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
