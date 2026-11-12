import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Diff, Eyebrow, MicButton, Panel, Verdict } from "@/components/shared"
import { useCards } from "@/lib/cards"
import * as L from "@/lib/ocs.js"
import Inspection from "@/screens/Inspection"
import { getStore, update, useStore } from "@/lib/store"
import type { Card, Score } from "@/lib/types"

const shuffle = <T,>(a: T[]) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]] } return b }

export default function Test() {
  const store = useStore()
  const { all } = useCards()
  const [learnedOnly, setLearnedOnly] = useState(() => all.filter((c) => getStore().cards[c.id]).length >= 10)
  const [count, setCount] = useState("10")
  const [run, setRun] = useState<{ q: Card[]; i: number; right: number; missed: string[]; targeted?: boolean; section?: string } | null>(null)
  const secs = useMemo(() => { const m = new Map<string, string>(); all.forEach((c) => m.set(c.sec, c.secName)); return [...m] }, [all])
  const [sec, setSec] = useState(secs[0]?.[0] ?? "")
  const [insp, setInsp] = useState(false)
  const [text, setText] = useState("")
  const [res, setRes] = useState<Score | null>(null)
  useEffect(() => {
    const ids = getStore().testIds
    if (!ids?.length) return
    update((s) => { delete s.testIds; return s })
    const q = all.filter((c) => ids.includes(c.id))
    if (q.length) { setRun({ q: shuffle(q), i: 0, right: 0, missed: [], targeted: true }) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const pool = useMemo(() => all.filter((c) => !learnedOnly || store.cards[c.id]), [all, learnedOnly, store.cards])

  if (insp) return <Inspection pool={all} title="RLP inspection" onExit={() => setInsp(false)} />
  if (!run) {
    return (
      <Panel>
        <Eyebrow>Test mode</Eyebrow>
        <h2 className="slab mt-2 text-2xl font-bold">Random cards, no hints</h2>
        <div className="mt-4 grid max-w-xs gap-2"><Label>Cards in the test</Label>
          <Select value={count} onValueChange={setCount}><SelectTrigger className="h-12! w-full"><SelectValue /></SelectTrigger>
            <SelectContent>{["5", "10", "20", "30", "50", "all"].map((n) => <SelectItem key={n} value={n}>{n === "all" ? `All (${pool.length})` : n}</SelectItem>)}</SelectContent></Select></div>
        <div className="my-5 flex items-center gap-3">
          <Switch id="lo" checked={learnedOnly} onCheckedChange={setLearnedOnly} />
          <Label htmlFor="lo" className="text-base">Only cards I have started ({all.filter((c) => store.cards[c.id]).length})</Label>
        </div>
        <Button disabled={pool.length === 0} onClick={() => { setRun({ q: shuffle(pool).slice(0, count === "all" ? pool.length : +count), i: 0, right: 0, missed: [] }); setText(""); setRes(null) }}>Start test</Button>
        {learnedOnly && pool.length < 10 && pool.length > 0 && <p className="mt-3 text-sm text-gold">Only {pool.length} started card{pool.length === 1 ? "" : "s"} so the test is short. Turn the switch off to test all {all.length}.</p>}
        {pool.length === 0 && <p className="mt-3 text-sm text-muted-foreground">Learn a few cards in Study first, or turn the switch off.</p>}
        <hr className="my-6 border-border" />
        <h2 className="slab text-2xl font-bold">Recite a section in order</h2>
        <p className="mt-1 text-muted-foreground">The real recital is one continuous run. Every card in the section, in Appendix B order, no hints. A run is clean only if every card is word for word.</p>
        <div className="mt-4 grid max-w-xs gap-2"><Label>Section</Label>
          <Select value={sec} onValueChange={setSec}><SelectTrigger className="h-12! w-full"><SelectValue /></SelectTrigger>
            <SelectContent>{secs.map(([id, name]) => <SelectItem key={id} value={id}>{name}{store.runs?.[id]?.streak ? ` (${store.runs[id].streak} clean in a row)` : ""}</SelectItem>)}</SelectContent></Select></div>
        <Button className="mt-4" onClick={() => { setRun({ q: all.filter((c) => c.sec === sec), i: 0, right: 0, missed: [], targeted: true, section: sec }); setText(""); setRes(null) }}>Start section run</Button>
        <hr className="my-6 border-border" />
        <h2 className="slab text-2xl font-bold">RLP inspection</h2>
        <p className="mt-1 text-muted-foreground">The instructor calls cards at you against a clock, one try each, no hints.</p>
        <Button className="mt-4" onClick={() => setInsp(true)}>Start an inspection</Button>
      </Panel>
    )
  }
  if (run.i >= run.q.length) {
    return (
      <Panel>
        <Eyebrow>Test complete</Eyebrow>
        <h2 className="slab mt-2 text-3xl font-bold">{run.right} of {run.q.length}</h2>
        {run.section && <p className="mt-2 text-lg">{run.missed.length === 0 ? `Clean run. ${store.runs?.[run.section]?.streak ?? 0} in a row for this section. Aim for 3 clean runs on different days.` : "Not clean. The streak starts over."}</p>}
        {run.missed.length > 0 && <p className="mt-2 text-muted-foreground">Missed: {run.missed.join(", ")}. They are due again today.</p>}
        {run.targeted && run.right > 0 && <p className="mt-2 text-muted-foreground">Cards you passed that were new that you got word for word are now marked known and come back for review in 2 days.</p>}
        <div className="mt-5 flex gap-3">
          {run.section && <Button onClick={() => { setRun({ ...run, q: all.filter((x) => x.sec === run.section), i: 0, right: 0, missed: [] }); setText(""); setRes(null) }}>Run it again</Button>}
          <Button variant={run.section ? "outline" : "default"} onClick={() => setRun(null)}>Done</Button>
        </div>
      </Panel>
    )
  }
  const c = run.q[run.i]
  const check = () => {
    const r = L.score(c, text) as Score
    setRes(r)
    if (r.ok && r.ratio >= 1 && r.extra.length === 0 && run?.targeted) update((s) => { if (!s.cards[c.id]) s.cards[c.id] = { box: 2, reps: 1, lapses: 0, misses: 0, due: L.addDays(L.ymd(new Date()), L.STEPS[2]) }; return s })
    if (!r.ok) update((s) => { const e = s.cards[c.id]; if (e) s.cards[c.id] = { ...e, box: 0, due: L.ymd(new Date()), lapses: e.lapses + 1, misses: (e.misses || 0) + 1 }; return s }) // never create a record for an unseen card
  }
  const next = (ok: boolean) => {
    if (run.section && run.i + 1 >= run.q.length) {
      const clean = ok && run.missed.length === 0
      const id = run.section
      update((st) => { const r = st.runs?.[id] || { streak: 0, clean: 0, last: "" }; st.runs = { ...(st.runs || {}), [id]: { streak: clean ? r.streak + 1 : 0, clean: r.clean + (clean ? 1 : 0), last: L.ymd(new Date()) } }; return st })
    }
    setRun({ ...run, i: run.i + 1, right: run.right + (ok ? 1 : 0), missed: ok ? run.missed : [...run.missed, c.prompt] }); setText(""); setRes(null)
  }
  return (
    <Panel>
      <Eyebrow>Card {run.i + 1} of {run.q.length}</Eyebrow>
      <h2 className="slab mt-3 mb-4 text-2xl font-bold">{c.prompt}</h2>
      <Textarea value={text} disabled={!!res} onChange={(e) => setText(e.target.value)} autoFocus autoCapitalize="none" autoCorrect="off" spellCheck={false} aria-label="Your recital" className="min-h-32 bg-background/60 text-lg" placeholder="Type or dictate" />
      {res ? (
        <>
          <Verdict ok={res.ok} /><Diff r={res} />
          <div className="mt-4 flex gap-3"><Button onClick={() => next(res.ok)} autoFocus>Next</Button></div>
        </>
      ) : (
        <div className="mt-4 flex gap-3"><Button onClick={check}>Check</Button><MicButton onText={setText} /></div>
      )}
    </Panel>
  )
}
