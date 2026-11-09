import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Diff, Eyebrow, MicButton, Panel, Verdict } from "@/components/shared"
import { useCards } from "@/lib/cards"
import * as L from "@/lib/ocs.js"
import { update, useStore } from "@/lib/store"
import type { Card, Score } from "@/lib/types"

const shuffle = <T,>(a: T[]) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]] } return b }

export default function Test() {
  const store = useStore()
  const { all } = useCards()
  const [learnedOnly, setLearnedOnly] = useState(true)
  const [count, setCount] = useState("10")
  const [run, setRun] = useState<{ q: Card[]; i: number; right: number; missed: string[] } | null>(null)
  const [text, setText] = useState("")
  const [res, setRes] = useState<Score | null>(null)
  const pool = useMemo(() => all.filter((c) => !learnedOnly || store.cards[c.id]), [all, learnedOnly, store.cards])

  if (!run) {
    return (
      <Panel>
        <Eyebrow>Test mode</Eyebrow>
        <h2 className="slab mt-2 text-2xl font-bold">Random cards, no hints</h2>
        <div className="mt-4 grid max-w-xs gap-2"><Label>Cards in the test</Label>
          <Select value={count} onValueChange={setCount}><SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
            <SelectContent>{["5", "10", "20", "30", "50", "all"].map((n) => <SelectItem key={n} value={n}>{n === "all" ? `All (${pool.length})` : n}</SelectItem>)}</SelectContent></Select></div>
        <div className="my-5 flex items-center gap-3">
          <Switch id="lo" checked={learnedOnly} onCheckedChange={setLearnedOnly} />
          <Label htmlFor="lo" className="text-base">Only cards I have started ({all.filter((c) => store.cards[c.id]).length})</Label>
        </div>
        <Button disabled={pool.length === 0} onClick={() => { setRun({ q: shuffle(pool).slice(0, count === "all" ? pool.length : +count), i: 0, right: 0, missed: [] }); setText(""); setRes(null) }}>Start test</Button>
        {pool.length === 0 && <p className="mt-3 text-sm text-muted-foreground">Learn a few cards in Study first, or turn the switch off.</p>}
      </Panel>
    )
  }
  if (run.i >= run.q.length) {
    return (
      <Panel>
        <Eyebrow>Test complete</Eyebrow>
        <h2 className="slab mt-2 text-3xl font-bold">{run.right} of {run.q.length}</h2>
        {run.missed.length > 0 && <p className="mt-2 text-muted-foreground">Missed: {run.missed.join(", ")}. They are due again today.</p>}
        <Button className="mt-5" onClick={() => setRun(null)}>Done</Button>
      </Panel>
    )
  }
  const c = run.q[run.i]
  const check = () => {
    const r = L.score(c, text, store.settings.threshold) as Score
    setRes(r)
    if (!r.ok) update((s) => { s.cards[c.id] = { ...(s.cards[c.id] || { reps: 0, lapses: 0, misses: 0 }), box: 0, due: L.ymd(new Date()), misses: (s.cards[c.id]?.misses || 0) + 1 }; return s })
  }
  const next = (ok: boolean) => { setRun({ ...run, i: run.i + 1, right: run.right + (ok ? 1 : 0), missed: ok ? run.missed : [...run.missed, c.prompt] }); setText(""); setRes(null) }
  return (
    <Panel>
      <Eyebrow>Card {run.i + 1} of {run.q.length}</Eyebrow>
      <h2 className="slab mt-3 mb-4 text-2xl font-bold">{c.prompt}</h2>
      <Textarea value={text} disabled={!!res} onChange={(e) => setText(e.target.value)} autoFocus className="min-h-32 bg-background/60 text-lg" placeholder="Type or dictate" />
      {res ? (
        <>
          <Verdict ok={res.ok} /><Diff r={res} />
          <div className="mt-4 flex gap-3"><Button onClick={() => next(res.ok)} autoFocus>Next</Button>{!res.ok && <Button variant="outline" onClick={() => next(true)}>Count as correct</Button>}</div>
        </>
      ) : (
        <div className="mt-4 flex gap-3"><Button onClick={check}>Check</Button><MicButton onText={setText} /></div>
      )}
    </Panel>
  )
}
