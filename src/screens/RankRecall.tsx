import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Panel, Eyebrow, Diff, Verdict } from "@/components/shared"
import { Insignia, Drawing, rankName, views } from "@/components/Insignia"
import { getStore, update } from "@/lib/store"
import * as L from "@/lib/ocs.js"
import type { Card, Score } from "@/lib/types"

type Stage = "name" | "desc"
type Item = { id: string; stage: Stage }
type Sess = { phase: "teach" | "recall" | "done"; t: number; queue: Item[]; streak: Record<string, number>; stages: Record<string, Stage[]>; missed: Set<string>; done: number; total: number; miss: number }

const NEED = 2 // clean answers in a row, per stage, before a rank counts as learned
const today = () => L.ymd(new Date())
const shuffle = <T,>(a: T[]) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]] } return b }
const bare = (c: Card) => rankName(c).replace(/\s*\([^)]*\)\s*$/, "")
const abbr = (c: Card) => /\(([^)]+)\)\s*$/.exec(rankName(c))?.[1] ?? ""
// What Appendix B says after the rank title: the collar, board and sleeve wording.
const wording = (c: Card) => c.answer.slice(rankName(c).length).trim()
const firsts = (s: string) => s.split(/\s+/).filter(Boolean).map((w) => w[0]).join(" ")
const asCard = (key: string) => ({ key, lead: "" })

function grade(c: Card, stage: Stage, text: string): Score {
  if (stage === "desc") return L.score(asCard(wording(c)), text)
  const tries = [bare(c), abbr(c), rankName(c)].filter(Boolean).map((k) => L.score(asCard(k), text) as Score)
  return tries.find((r) => r.ok) ?? tries[0]
}

// Teach the group first (nobody can recall what they have never seen), then drill by typing from the picture.
export default function RankRecall({ cards, teach, onExit }: { cards: Card[]; teach: boolean; onExit: () => void }) {
  const [s, setS] = useState<Sess>(() => ({
    phase: teach ? "teach" : "recall", t: 0,
    queue: shuffle(cards.map((c) => ({ id: c.id, stage: "name" as Stage }))),
    streak: {}, stages: Object.fromEntries(cards.map((c) => [c.id, [] as Stage[]])), missed: new Set<string>(),
    done: 0, total: cards.length * 2, miss: 0,
  }))
  const [text, setText] = useState("")
  const [hint, setHint] = useState(false)
  const [res, setRes] = useState<{ r: Score; clean: boolean } | null>(null)
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
        <p className="mt-3 text-[0.95rem]">{c.answer}</p>
        <p className="mt-3 text-muted-foreground">Look at the picture, read the wording, say it once out loud. Then go on. You will be asked from the picture after the last one.</p>
        <div className="mt-4 flex gap-3">
          {s.t > 0 && <Button variant="outline" onClick={() => setS({ ...s, t: s.t - 1 })}>Back</Button>}
          <Button onClick={() => setS(s.t + 1 >= cards.length ? { ...s, phase: "recall" } : { ...s, t: s.t + 1 })} autoFocus>{s.t + 1 >= cards.length ? "Start recall" : "Next"}</Button>
        </div>
        <Button variant="ghost" className="mt-2" onClick={onExit}>Exit</Button>
      </Panel>
    )
  }

  if (s.phase === "done") {
    return (
      <Panel>
        <Eyebrow>Recall complete</Eyebrow>
        <h2 className="slab mt-2 text-3xl font-bold">{cards.length} ranks learned</h2>
        <p className="mt-2 text-muted-foreground">{s.miss ? `${s.miss} misses along the way, each one came back until you got it twice in a row.` : "No misses."} These ranks are now on your review schedule and will come back in the Ranks tab as due.</p>
        <Button className="mt-5" onClick={onExit}>Done</Button>
      </Panel>
    )
  }

  const item = s.queue[0]
  const c = byId.get(item.id)!
  const key = `${item.id}:${item.stage}`
  const check = () => {
    if (res || !text.trim()) return
    const r = grade(c, item.stage, text)
    setRes({ r, clean: r.ok && !hint })
  }
  const next = () => {
    if (!res) return
    const q = s.queue.slice(1)
    const streak = { ...s.streak }
    const stages = { ...s.stages }
    const missed = new Set(s.missed)
    let { done, miss } = s
    const put = (it: Item, at: number) => q.splice(Math.min(at, q.length), 0, it)
    if (!res.clean) {
      if (!res.r.ok) { miss++; missed.add(c.id) }
      streak[key] = 0
      put(item, 3)
    } else {
      streak[key] = (streak[key] || 0) + 1
      if (streak[key] < NEED) put(item, 4)
      else {
        done++
        stages[c.id] = [...stages[c.id], item.stage]
        if (item.stage === "name") put({ id: c.id, stage: "desc" }, 2)
        else {
          update((st) => {
            let cs = st.cards[c.id] || { box: 0, reps: 0, lapses: 0, due: today(), misses: 0 }
            if (missed.has(c.id) && cs.reps > 0) cs = { ...cs, box: 1, lapses: cs.lapses + 1 }
            st.cards[c.id] = { misses: cs.misses || 0, ...L.schedule(cs, true, today(), st.settings.ship) }
            return st
          })
        }
      }
    }
    if (!res.r.ok) update((st) => { if (st.cards[c.id]) st.cards[c.id].misses = (st.cards[c.id].misses || 0) + 1; return st })
    setText(""); setHint(false); setRes(null)
    setS({ ...s, queue: q, streak, stages, missed, done, miss, phase: q.length ? "recall" : "done" })
  }

  const target = item.stage === "name" ? bare(c) : wording(c)
  return (
    <Panel>
      <Eyebrow>Recall {s.done} of {s.total} steps</Eyebrow>
      {item.stage === "name" ? (
        <>
          <h2 className="slab mt-3 text-xl font-bold">Name this rank</h2>
          <p className="text-muted-foreground">{c.secName}. Type the title (the abbreviation works too).</p>
          <div className="mt-3 flex flex-wrap gap-3">
            {views(c).map((v) => <Drawing key={v} card={c} view={v} className={v === "board" ? "h-24 w-14" : "size-24"} label="Insignia" />)}
          </div>
        </>
      ) : (
        <>
          <h2 className="slab mt-3 text-xl font-bold">{c.prompt}</h2>
          <p className="text-lg font-bold">{rankName(c)}</p>
          <p className="text-muted-foreground">Type the Appendix B wording for this rank, starting at Collar or Insignia.</p>
        </>
      )}
      <Textarea value={text} disabled={!!res} onChange={(e) => setText(e.target.value)} autoFocus autoCapitalize="none" autoCorrect="off" spellCheck={false} aria-label="Your answer" className="mt-3 min-h-24 bg-background/60 text-lg" placeholder="Type it" />
      {hint && !res && <p className="mt-2 font-mono text-muted-foreground">{firsts(target)}</p>}
      {!res ? (
        <div className="mt-3 flex gap-3">
          <Button onClick={check} disabled={!text.trim()}>Check</Button>
          <Button variant="outline" onClick={() => setHint(true)}>First letters</Button>
        </div>
      ) : (
        <div className="mt-4">
          <Verdict ok={res.r.ok} note={res.r.ok && hint ? "Right, but you used the hint, so it comes back." : undefined} />
          {!res.r.ok && <Diff r={res.r} />}
          {!res.r.ok && <p className="mt-2">{item.stage === "name" ? rankName(c) : wording(c)}</p>}
          {!res.r.ok && <Insignia card={c} compact />}
          <Button className="mt-4" onClick={next} autoFocus>Next</Button>
        </div>
      )}
      <Button variant="ghost" className="mt-2" onClick={onExit}>Exit</Button>
    </Panel>
  )
}
