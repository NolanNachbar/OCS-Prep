import { useEffect, useMemo, useRef, useState } from "react"
import { Volume2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { Diff, Eyebrow, MicButton, Panel, StatTile, Verdict } from "@/components/shared"
import { useCards } from "@/lib/cards"
import { hookFor } from "@/lib/hooks"
import * as L from "@/lib/ocs.js"
import { speak } from "@/lib/speech"
import { getStore, update, useStore } from "@/lib/store"
import type { Card, Score } from "@/lib/types"

type Item = { uid: number; id: string; stage: number; missed?: boolean }
type Session = { queue: Item[]; total: number; done: number; miss: number }
let uid = 1
const today = () => L.ymd(new Date())
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
  const { order, byId, secIdx } = useCards()
  const [s, setS] = useState<Session | null>(null)

  const due = useMemo(() => order.filter((c) => store.cards[c.id]?.due && store.cards[c.id].due <= today()), [order, store.cards])
  const fresh = useMemo(() => order.filter((c) => !store.cards[c.id]), [order, store.cards])

  const start = (extra: number) => {
    const t = today()
    const intro = getStore().intro.date === t ? getStore().intro : { date: t, n: 0 }
    if (intro !== getStore().intro) update((x) => { x.intro = intro; return x })
    const reviews: Item[] = due.map((c) => ({ uid: uid++, id: c.id, stage: store.cards[c.id].box >= 2 ? 3 : 2 }))
    const room = Math.max(0, store.settings.newPerDay + extra - intro.n)
    const news: Item[] = fresh.slice(0, room).map((c) => ({ uid: uid++, id: c.id, stage: 0 }))
    setS({ queue: [...reviews, ...news], total: reviews.length + news.length, done: 0, miss: 0 })
  }
  const started = useRef(false)
  useEffect(() => { if (!started.current) { started.current = true; start(0) } })

  const requeue = (q: Item[], item: Item, gap: number) => { const at = Math.min(q.length, gap); q.splice(at, 0, item) }

  const advance = (item: Item, ok: boolean) => {
    if (!s) return
    const c = byId.get(item.id)!
    const q = s.queue.slice(1)
    let { done, miss } = s
    if (!ok) {
      miss++
      requeue(q, { uid: uid++, id: c.id, stage: Math.max(1, item.stage - 1), missed: true }, 3)
    } else if (item.stage < 3) {
      requeue(q, { uid: uid++, id: c.id, stage: item.stage + 1, missed: item.missed }, 4)
    } else {
      update((st) => {
        let cs = st.cards[c.id] || { box: 0, reps: 0, lapses: 0, due: today(), misses: 0 }
        if (item.missed && cs.reps > 0) cs = { ...cs, box: 0, lapses: cs.lapses + 1 }
        st.cards[c.id] = { misses: cs.misses || 0, ...L.schedule(cs, true, today(), st.settings.ship) }
        return st
      })
      done++
    }
    setS({ queue: q, total: s.total, done, miss })
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
          <Progress value={s.total ? (s.done / s.total) * 100 : 0} className="mb-4 h-1.5 [&>div]:bg-gold" />
          <div className="flex flex-wrap items-center gap-2">
            <Eyebrow>{c.secName}</Eyebrow>
            <Badge variant="outline" className="rounded-none uppercase tracking-wider">{item.stage === 0 ? "Learn" : item.stage < 3 ? "Fill the blanks" : "From memory"}</Badge>
            {item.missed && <Badge variant="destructive" className="rounded-sm uppercase tracking-wider">Retry</Badge>}
          </div>
          <h2 className="slab mt-3 mb-4 text-3xl font-bold leading-tight">{c.prompt}</h2>
          <Step key={item.uid} item={item} card={c} hook={hookFor(c, secIdx(c))} onIntro={() => introduce(item)} onNext={(ok) => advance(item, ok)} />
        </Panel>
      ) : s ? (
        <Panel>
          <Eyebrow>Session complete</Eyebrow>
          <h2 className="slab mt-2 text-2xl font-bold">{s.done} of {s.total} cleared</h2>
          <p className="mt-1 text-muted-foreground">{s.miss} misses. {fresh.length} cards unseen. {due.length} due now.</p>
          {fresh.length > 0 && <Button className="mt-4 mr-3" onClick={() => start(getStore().intro.n)}>Learn {store.settings.newPerDay} more</Button>}
          <Button variant="outline" className="mt-4" onClick={() => start(0)}>Check due cards</Button>
        </Panel>
      ) : null}
    </div>
  )
}

function Step({ item, card: c, hook, onIntro, onNext }: { item: Item; card: Card; hook: string; onIntro: () => void; onNext: (ok: boolean) => void }) {
  const store = useStore()
  const [res, setRes] = useState<{ r: Score; note?: string; peeked?: boolean } | null>(null)
  const [text, setText] = useState("")
  const [vals, setVals] = useState<Record<number, string>>({})
  const toks = useMemo(() => (item.stage === 1 || item.stage === 2 ? L.cloze(c, item.stage === 1 ? 0.35 : 0.7, 1) : []), [item.stage, c])

  const record = (r: Score, note?: string, peeked?: boolean) => {
    if (!r.ok) update((st) => { if (st.cards[c.id]) st.cards[c.id].misses = (st.cards[c.id].misses || 0) + 1; return st })
    logResult(r.ok)
    setRes({ r, note, peeked })
  }

  if (item.stage === 0) {
    return (
      <div>
        {c.lead && <p className="slab italic text-muted-foreground">{c.lead}</p>}
        <p className="text-xl leading-relaxed">{c.answer}</p>
        {hook && <Hook text={hook} />}
        <p className="mt-4 text-sm text-muted-foreground">Read it, then say it out loud once without looking.</p>
        <div className="mt-2 flex flex-wrap gap-3">
          <Button onClick={onIntro}>I said it aloud</Button>
          <Button variant="outline" onClick={() => speak((c.lead ? c.lead + " " : "") + c.answer, store.settings.rate)}><Volume2 /> Hear it</Button>
        </div>
      </div>
    )
  }

  const check = () => {
    if (item.stage < 3) {
      const blanks = toks.filter((t: { blank: boolean }) => t.blank)
      let good = 0
      blanks.forEach((t: { text: string }, i: number) => { if (L.norm(vals[i] || "") === L.norm(t.text)) good++ })
      const ok = good === blanks.length
      const base = peekScore(c)
      record({ ...base, ok, ratio: blanks.length ? good / blanks.length : 1, hit: base.hit.map(() => ok) }, `${good} of ${blanks.length} blanks right`)
    } else record(L.score(c, text, store.settings.threshold))
  }

  let bi = 0
  return (
    <div>
      {c.lead && <p className="slab italic text-muted-foreground">{item.stage < 3 ? c.lead : "Start with: " + c.lead}</p>}
      {item.stage < 3 ? (
        <p className="text-xl leading-[2.4]">
          {toks.map((t: { text: string; blank: boolean }, i: number) => {
            if (!t.blank) return <span key={i}>{t.text} </span>
            const k = bi++
            const state = res ? (L.norm(vals[k] || "") === L.norm(t.text) ? "border-b-ok bg-ok/15" : "border-b-destructive bg-destructive/15") : "border-b-gold"
            return (
              <input key={i} value={vals[k] || ""} disabled={!!res} autoFocus={k === 0}
                onChange={(e) => setVals({ ...vals, [k]: e.target.value })}
                size={Math.min(Math.max(3, L.norm(t.text).length), 14)}
                autoCapitalize="none" autoComplete="off" spellCheck={false} aria-label={`blank ${k + 1}`}
                className={`mx-1 rounded-t-md border-0 border-b-2 bg-secondary px-2 py-1 text-center text-xl text-foreground outline-none focus:bg-muted ${state}`} />
            )
          })}
        </p>
      ) : (
        <Textarea value={text} disabled={!!res} onChange={(e) => setText(e.target.value)} autoFocus autoCapitalize="none" spellCheck={false}
          placeholder="Type it, or use the keyboard microphone (dictation)" className="min-h-32 bg-background/60 text-lg" />
      )}
      {res ? (
        <div>
          <Verdict ok={res.r.ok} note={res.note} />
          <Diff r={res.r} />
          <div className="mt-4 flex flex-wrap gap-3">
            <Button onClick={() => onNext(res.r.ok)} autoFocus>Next</Button>
            {!res.r.ok && !res.peeked && <Button variant="outline" onClick={() => onNext(true)}>Count as correct</Button>}
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap gap-3">
          <Button onClick={check}>Check</Button>
          {item.stage === 3 && <MicButton onText={(t) => setText(t)} />}
          <Button variant="outline" onClick={() => record(peekScore(c), undefined, true)}>Show answer</Button>
        </div>
      )}
    </div>
  )
}

function Hook({ text }: { text: string }) {
  return (
    <div className="mt-4 border-l-4 border-l-gold pl-3 text-[0.95rem] text-amber-100">
      <div className="mb-1 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-gold">Memory hook</div>
      {text}
    </div>
  )
}
