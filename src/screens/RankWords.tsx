import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Diff, Eyebrow, Panel, Verdict } from "@/components/shared"
import { lines } from "@/lib/blanks"
import * as L from "@/lib/ocs.js"
import { update } from "@/lib/store"
import type { Card, Score } from "@/lib/types"

// Matching with no pictures. Given the rank, type what is on the collar, sleeve or insignia (Seaman Recruit: None), or given
// the insignia wording, type the rank. Graded word for word against the Appendix B text.
type Q = { c: Card; ins: boolean; label: string; part: string; name: string; given: string }
const shuffle = <T,>(a: T[]) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]] } return b }

const build = (cards: Card[], n: number): Q[] => shuffle(cards).flatMap((c) => {
  const [head, ...rest] = lines(c.answer).split("\n")
  const parts = rest.map((r) => { const k = r.indexOf(":"); return k > 0 ? { label: r.slice(0, k), text: r.slice(k + 1).trim() } : null }).filter(Boolean) as { label: string; text: string }[]
  if (!parts.length) return []
  const p = parts[Math.floor(Math.random() * parts.length)]
  const name = head.replace(/\s*\([^)]*\)/g, "").trim()
  const ins = Math.random() < 0.6
  return [{ c, ins, label: p.label, part: p.text, name, given: ins ? head : `${p.label}: ${p.text}` }]
}).slice(0, n)

export default function RankWords({ cards, onExit }: { cards: Card[]; onExit: () => void }) {
  const [qs] = useState(() => build(cards, 20))
  const [i, setI] = useState(0)
  const [right, setRight] = useState(0)
  const [text, setText] = useState("")
  const [res, setRes] = useState<Score | null>(null)
  const [missed, setMissed] = useState<string[]>([])
  const q = qs[i]

  if (!q) {
    return (
      <Panel>
        <Eyebrow>Word match complete</Eyebrow>
        <h2 className="slab mt-2 text-3xl font-bold">{right} of {qs.length}</h2>
        {missed.length > 0 && <p className="mt-2 text-muted-foreground">Missed: {missed.join(", ")}. They are due again today.</p>}
        <Button className="mt-5" onClick={onExit}>Done</Button>
      </Panel>
    )
  }
  const check = () => {
    const key = q.ins ? q.part : q.name
    const r = L.score({ id: q.c.id, lead: "", key } as Card, q.ins ? text : text.replace(/\([^)]*\)/g, " ")) as Score
    setRes(r)
    if (r.ok) setRight((n) => n + 1)
    else {
      setMissed((m) => [...m, q.c.prompt])
      update((s) => { const e = s.cards[q.c.id]; if (e) s.cards[q.c.id] = { ...e, box: 0, due: L.ymd(new Date()), lapses: e.lapses + 1, misses: (e.misses || 0) + 1 }; return s })
    }
  }
  const next = () => { setI(i + 1); setText(""); setRes(null) }
  return (
    <Panel>
      <Eyebrow>Word match {i + 1} of {qs.length}</Eyebrow>
      <h2 className="slab mt-3 text-2xl font-bold">{q.c.prompt.split(":")[0]}</h2>
      <p className="mt-2 text-xl">{q.given}</p>
      <p className="mt-3 text-muted-foreground">{q.ins ? `Type what goes on the ${q.label.toLowerCase()}.` : "Type the rank."}</p>
      <Input value={text} disabled={!!res} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") (res ? next() : check()) }} autoFocus autoCapitalize="none" autoComplete="off" autoCorrect="off" spellCheck={false}
        aria-label="Your answer" className="mt-3 h-12 bg-background/60 text-lg" />
      {res ? (
        <>
          <Verdict ok={res.ok} /><Diff r={res} />
          <p className="mt-2 whitespace-pre-line text-muted-foreground">{lines(q.c.answer)}</p>
          <Button className="mt-4" onClick={next} autoFocus>Next</Button>
        </>
      ) : (
        <div className="mt-4 flex gap-3"><Button onClick={check}>Check</Button><Button variant="outline" onClick={onExit}>End</Button></div>
      )}
    </Panel>
  )
}
