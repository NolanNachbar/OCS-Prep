import { useMemo, useState } from "react"
import { lines, onBlankKey, startsLine } from "@/lib/blanks"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Slider } from "@/components/ui/slider"
import { Textarea } from "@/components/ui/textarea"
import { Panel, Eyebrow, Diff, Verdict } from "@/components/shared"
import { Insignia, Drawing, rankName, views } from "@/components/Insignia"
import { update, useStore } from "@/lib/store"
import * as L from "@/lib/ocs.js"
import type { Card, Score } from "@/lib/types"

// Same fill-in ladder as the Study tab. A rank is learned when both its steps are answered clean at "From memory".
const LEVELS = ["Read it", "Some words", "Most words", "All words", "From memory"]
const FRAC = [0, 0.35, 0.7, 1, 1]
type Stage = "name" | "desc"
type Item = { uid: number; id: string; stage: Stage; level: number }
type Sess = { phase: "teach" | "recall" | "done"; t: number; queue: Item[]; missed: string[]; done: number; total: number; miss: number }
let uid = 1

const today = () => L.ymd(new Date())
const shuffle = <T,>(a: T[]) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]] } return b }
const bare = (c: Card) => rankName(c).replace(/\s*\([^)]*\)\s*$/, "")
const abbr = (c: Card) => /\(([^)]+)\)\s*$/.exec(rankName(c))?.[1] ?? ""
// What Appendix B says after the rank title: the collar, board and sleeve wording.
const wording = (c: Card) => c.answer.slice(rankName(c).length).trim()
const asCard = (key: string) => ({ key, lead: "" })
const target = (c: Card, stage: Stage) => (stage === "name" ? bare(c) : wording(c))
const exact = (key: string): Score => ({ ok: true, ratio: 1, expected: L.words(key), hit: L.words(key).map(() => true), extra: [] })

function gradeName(c: Card, text: string): Score {
  const tries = [bare(c), abbr(c), rankName(c)].filter(Boolean).map((k) => L.score(asCard(k), text) as Score)
  return tries.find((r) => r.ok) ?? tries[0]
}
// Title blanks for the slider: half the letters, first letter only, letter count only. One box per letter, a wide gap between words,
// and once checked the whole title is shown filled in.
function TitleBlanks({ title, level, letters, reveal, ok }: { title: string; level: number; letters: boolean; reveal: boolean; ok: boolean }) {
  const shown = (w: string, i: number) => reveal || (letters && (level === 1 ? i < Math.ceil(w.length / 2) : level === 2 && i === 0))
  return (
    <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2" aria-label={reveal ? title : "Title blanks"}>
      {title.split(" ").map((w, wi) => (
        <span key={wi} className="flex gap-1">
          {[...w].map((ch, i) => (
            <span key={i} className={`inline-block h-8 w-6 border-b-2 text-center font-mono text-2xl leading-8 ${reveal ? (ok ? "border-b-ok text-ok" : "border-b-destructive text-foreground") : "border-b-gold text-gold"}`}>{shown(w, i) ? ch : ""}</span>
          ))}
        </span>
      ))}
    </div>
  )
}

// Teach the group first (nobody can recall what they have never seen), then drill with the slider.
export default function RankRecall({ cards, teach, onExit, next }: { cards: Card[]; teach: boolean; onExit: () => void; next?: { label: string; go: () => void } }) {
  const base = teach ? 1 : 3
  const [s, setS] = useState<Sess>(() => ({
    phase: teach ? "teach" : "recall", t: 0,
    queue: shuffle(cards.map((c) => ({ uid: uid++, id: c.id, stage: "name" as Stage, level: base }))),
    missed: [], done: 0, total: cards.length * 2, miss: 0,
  }))
  const [manual, setManual] = useState<number | null>(null)
  const letters = useStore().settings.letters !== false
  const byId = new Map(cards.map((c) => [c.id, c]))

  if (!cards.length) return <Panel><p>Nothing to drill here.</p><Button className="mt-4" onClick={onExit}>Back</Button></Panel>

  if (s.phase === "teach") {
    const c = cards[s.t]
    return (
      <Panel>
        <Eyebrow>Learn {s.t + 1} of {cards.length}</Eyebrow>
        <h2 className="slab mt-2 text-2xl font-bold">{c.prompt}</h2>
        <p className="mt-1 text-lg font-bold">{rankName(c)}</p>
        <Insignia card={c} />
        <p className="mt-3 whitespace-pre-line text-[0.95rem]">{lines(c.answer)}</p>
        <p className="mt-3 text-muted-foreground">Look at the picture, read the wording, say it once out loud. Then go on. After the last one you fill it in from the picture, with more blanks each time you get it right.</p>
        <div className="mt-4 flex gap-3">
          {s.t > 0 && <Button variant="outline" onClick={() => setS({ ...s, t: s.t - 1 })}>Back</Button>}
          <Button onClick={() => setS(s.t + 1 >= cards.length ? { ...s, phase: "recall" } : { ...s, t: s.t + 1 })} autoFocus>{s.t + 1 >= cards.length ? "Start recall" : "Next"}</Button>
        </div>
        <Button variant="ghost" className="mt-2" onClick={onExit}>Exit</Button>
      </Panel>
    )
  }

  if (s.phase === "done" || !s.queue.length) {
    return (
      <Panel>
        <Eyebrow>Recall complete</Eyebrow>
        <h2 className="slab mt-2 text-3xl font-bold">{cards.length} ranks learned</h2>
        <p className="mt-2 text-muted-foreground">{s.miss ? `${s.miss} misses along the way. Each one dropped a level and came back.` : "No misses."} These ranks are now on your review schedule and will show up as due in the Ranks tab.</p>
        {next && <Button className="mt-5 h-auto min-h-9 w-full whitespace-normal py-2" onClick={next.go}>Next group: {next.label}</Button>}
        <Button className="mt-3" variant={next ? "outline" : "default"} onClick={onExit}>Done</Button>
      </Panel>
    )
  }

  const item = s.queue[0]
  const c = byId.get(item.id)!
  const level = manual ?? item.level

  // clean = right with no hint. A miss drops a level, a hinted pass repeats the level, a clean pass climbs; clean at level 4 finishes the step.
  const advance = (ok: boolean, clean: boolean) => {
    const q = s.queue.slice(1)
    const put = (it: Item, at: number) => q.splice(Math.min(at, q.length), 0, it)
    let { done, miss } = s
    const missed = ok || s.missed.includes(c.id) ? s.missed : [...s.missed, c.id]
    if (!ok) { miss++; put({ ...item, uid: uid++, level: Math.max(1, level - 1) }, 3) }
    else if (!clean) put({ ...item, uid: uid++, level }, 3)
    else if (level < 4) put({ ...item, uid: uid++, level: level + 1 }, 3)
    else {
      done++
      if (item.stage === "name") put({ uid: uid++, id: c.id, stage: "desc", level: base }, 2)
      else {
        update((st) => {
          let cs = st.cards[c.id] || { box: 0, reps: 0, lapses: 0, due: today(), misses: 0 }
          if (missed.includes(c.id) && cs.reps > 0) cs = { ...cs, box: 1, lapses: cs.lapses + 1 }
          st.cards[c.id] = { misses: missed.includes(c.id) ? cs.misses || 0 : 0, ...L.schedule(cs, true, today(), st.settings.ship) }
          return st
        })
      }
    }
    if (!ok) update((st) => { if (st.cards[c.id]) st.cards[c.id].misses = (st.cards[c.id].misses || 0) + 1; return st })
    setManual(null)
    setS({ ...s, queue: q, missed, done, miss, phase: q.length ? "recall" : "done" })
  }

  return (
    <Panel>
      <div className="mb-1 flex justify-between text-xs text-muted-foreground"><span>{s.queue.length} left</span><span>{s.done} of {s.total} steps cleared</span></div>
      <Progress value={s.total ? (s.done / s.total) * 100 : 0} className="mb-3 h-1.5 [&>div]:bg-gold" />
      <Eyebrow>{item.stage === "name" ? "Name this rank" : "Describe this rank"} | {c.secName}</Eyebrow>
      <div className="my-3 border border-border bg-black/25 p-3">
        <div className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-[0.12em]">
          <span className="text-muted-foreground">Fill in the blank</span>
          <span className="text-gold">{LEVELS[level]}{manual === null ? " (auto)" : ""}</span>
        </div>
        <Slider min={0} max={4} step={1} value={[level]} onValueChange={(v) => setManual(v[0])} aria-label="How much to fill in" aria-valuetext={LEVELS[level]} />
        <div className="mt-2 flex justify-between text-xs uppercase tracking-wider text-muted-foreground"><span>Nothing blank</span><span>Everything blank</span></div>
            <label className="mt-3 flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" className="size-5 accent-[#D8B24A]" checked={letters} onChange={(e) => update((st) => { st.settings.letters = e.target.checked; return st })} />Show the first letter in each blank</label>
        {manual !== null && <Button variant="ghost" size="sm" className="mt-1 px-0" onClick={() => setManual(null)}>Back to auto</Button>}
      </div>
      <Step key={`${item.uid}-${level}`} letters={letters} item={item} level={level} card={c} onNext={advance} onEasier={() => setManual(Math.max(0, level - 1))} onHarder={() => setManual(Math.min(4, level + 1))} />
      <Button variant="ghost" className="mt-2" onClick={onExit}>Exit</Button>
    </Panel>
  )
}

function Step({ item, level, letters, card: c, onNext, onEasier, onHarder }: { item: Item; level: number; letters: boolean; card: Card; onNext: (ok: boolean, clean: boolean) => void; onEasier: () => void; onHarder: () => void }) {
  const [text, setText] = useState("")
  const [vals, setVals] = useState<Record<number, string>>({})
  const [hint, setHint] = useState(false)
  const [peeked, setPeeked] = useState(false)
  const [res, setRes] = useState<{ r: Score; note?: string } | null>(null)
  const name = item.stage === "name"
  const key = target(c, item.stage)
  const toks = useMemo(() => (!name && level >= 1 && level <= 3 ? L.cloze({ id: c.id + ":d", key } as Card, FRAC[level], item.uid) : []), [name, level, c.id, key, item.uid])

  const head = name ? (
    <div className="flex flex-wrap gap-3">
      {views(c).map((v) => <Drawing key={v} card={c} view={v} className={v === "board" ? "h-24 w-14" : "size-24"} label="Insignia" />)}
    </div>
  ) : (
    <div>
      <h2 className="slab text-xl font-bold">{c.prompt}</h2>
      <p className="text-lg font-bold">{rankName(c)}</p>
    </div>
  )

  if (level === 0) {
    return (
      <div>
        {head}
        <p className="mt-3 text-lg leading-relaxed">{name ? rankName(c) : wording(c)}</p>
        {!name && <Insignia card={c} compact />}
        <p className="mt-3 text-sm text-muted-foreground">Read it, then say it out loud once without looking. Slide right to try it with blanks.</p>
        <Button className="mt-3" variant="outline" onClick={onHarder}>Make it harder</Button>
      </div>
    )
  }

  const check = () => {
    if (res) return
    if (!name && level < 4) {
      const blanks = toks.filter((t: { blank: boolean }) => t.blank)
      let good = 0
      blanks.forEach((t: { text: string }, i: number) => { if (L.norm(vals[i] || "") === L.norm(t.text)) good++ })
      const ok = good === blanks.length
      setRes({ r: { ...exact(key), ok, ratio: blanks.length ? good / blanks.length : 1, hit: L.words(key).map(() => ok) }, note: `${good} of ${blanks.length} blanks right` })
    } else if (!text.trim()) return
    else setRes({ r: name ? gradeName(c, text) : L.score(asCard(key), text) })
  }
  const show = () => { setPeeked(true); setRes({ r: { ...exact(key), ok: false, ratio: 0, hit: L.words(key).map(() => false) }, note: "Answer shown" }) }
  let bi = 0

  return (
    <div>
      {head}
      {name && level >= 1 && level <= 3 && <TitleBlanks title={bare(c)} level={level} letters={letters} reveal={!!res} ok={!!res?.r.ok} />}
      {!name && level < 4 ? (
        <p className="mt-3 text-xl leading-[2.4]">
          {toks.map((t: { text: string; blank: boolean }, i: number) => {
            const br = i > 0 && startsLine(t.text, toks[i + 1]?.text) && <br />
            if (!t.blank) return <span key={i}>{br}{t.text} </span>
            const k = bi++
            const state = res ? (L.norm(vals[k] || "") === L.norm(t.text) ? "border-b-ok bg-ok/15" : "border-b-destructive bg-destructive/15") : "border-b-gold"
            return (
              <span key={i}>{br}<input value={vals[k] || ""} disabled={!!res} autoFocus={k === 0}
                onChange={(e) => setVals({ ...vals, [k]: e.target.value })}
                size={Math.min(Math.max(3, L.norm(t.text).length), 14)}
                data-blank onKeyDown={(e) => onBlankKey(e, check)} autoCapitalize="none" autoComplete="off" autoCorrect="off" spellCheck={false} aria-label={`blank ${k + 1}`}
                placeholder={letters ? t.text.replace(/^[^A-Za-z0-9]*/, "").slice(0, 1) : ""}
                className={`mx-1 min-h-11 rounded-none border-0 border-b-2 bg-secondary px-2 py-1 text-center text-xl text-foreground outline-none placeholder:text-gold placeholder:font-bold focus:bg-muted ${state}`} /></span>
            )
          })}
        </p>
      ) : (
        <Textarea value={text} disabled={!!res} onChange={(e) => setText(e.target.value)} autoFocus autoCapitalize="none" autoCorrect="off" spellCheck={false} aria-label="Your answer"
          placeholder={name ? "Type the title (the abbreviation works too)" : "Type the wording, starting at Collar or Insignia"} className="mt-3 min-h-24 bg-background/60 text-lg" />
      )}
      {hint && !res && <p className="mt-2 font-mono text-muted-foreground">{L.words(key).map((w: string) => w[0]).join(" ")}</p>}
      {res ? (
        <div>
          <Verdict ok={res.r.ok} note={hint && level === 4 && res.r.ok ? "Right, but you used the hint, so it does not count. It comes back." : res.note} />
          {!res.r.ok && !peeked && <Diff r={res.r} />}
          {!res.r.ok && <p className="mt-2">{name ? rankName(c) : wording(c)}</p>}
          {!res.r.ok && <Insignia card={c} compact />}
          <div className="mt-4 flex flex-col gap-4">
            <Button onClick={() => onNext(res.r.ok, !(hint && level === 4))} autoFocus>Next</Button>
            {res.r.ok && level < 4 && <Button variant="outline" onClick={onHarder}>Next level up</Button>}
            {!res.r.ok && level > 1 && <Button variant="outline" onClick={onEasier}>Easier level</Button>}
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap gap-3">
          <Button onClick={check}>Check</Button>
          {level === 4 && <Button variant="outline" onClick={() => setHint(true)} disabled={hint}>First letters</Button>}
          <Button variant="outline" onClick={show}>Show answer</Button>
        </div>
      )}
    </div>
  )
}
