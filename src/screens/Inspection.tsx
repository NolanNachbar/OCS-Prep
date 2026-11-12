import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Diff, Eyebrow, MicButton, Panel, Verdict } from "@/components/shared"
import * as L from "@/lib/ocs.js"
import { speak, stopSpeaking } from "@/lib/speech"
import { update, useStore } from "@/lib/store"
import type { Card, Score } from "@/lib/types"

// RLP rehearsal: the instructor calls a card at you, a clock runs, you get one shot at it word for word, then the next one comes.
// Cards you have missed before, weak cards and E-7 and up (the ranks that get asked most) come up more often.
const RANK_SEC = ["nve", "nvo", "mce", "mco"]
const weight = (c: Card, st: ReturnType<typeof useStore>) => {
  const s = st.cards[c.id]
  const grade = /E-(\d+)/.exec(c.prompt)
  return 1 + (s ? (s.misses || 0) * 2 + (s.box < 2 ? 1 : 0) : 0) + (grade && +grade[1] >= 7 ? 2 : 0)
}
const draw = (pool: Card[], n: number, st: ReturnType<typeof useStore>) => {
  const left = pool.map((c) => ({ c, w: weight(c, st) })); const out: Card[] = []
  while (out.length < n && left.length) {
    let r = Math.random() * left.reduce((a, x) => a + x.w, 0), i = 0
    while (i < left.length - 1 && (r -= left[i].w) > 0) i++
    out.push(left.splice(i, 1)[0].c)
  }
  return out
}
const call = (c: Card) => {
  const p = c.prompt.replace(/#\s*/, "number ")
  return RANK_SEC.includes(c.sec) ? `Candidate, give me ${p}!` : `Candidate, ${p}!`
}

export default function Inspection({ pool, title, onExit }: { pool: Card[]; title: string; onExit: () => void }) {
  const store = useStore()
  const [count, setCount] = useState("10")
  const [secs, setSecs] = useState("20")
  const [aloud, setAloud] = useState(true)
  const [pen, setPen] = useState(false)
  const [run, setRun] = useState<{ q: Card[]; i: number; right: number; missed: string[] } | null>(null)
  const [text, setText] = useState("")
  const [res, setRes] = useState<Score | null>(null)
  const [left, setLeft] = useState(0)
  const textRef = useRef(""); textRef.current = text
  const c = run && run.i < run.q.length ? run.q[run.i] : undefined

  const grade = (late = false) => {
    if (!c || res) return
    stopSpeaking()
    const r = L.score(c, late && !textRef.current.trim() ? "" : textRef.current) as Score
    setRes(r)
    if (!r.ok) update((s) => { const e = s.cards[c.id]; if (e) s.cards[c.id] = { ...e, box: 0, due: L.ymd(new Date()), lapses: e.lapses + 1, misses: (e.misses || 0) + 1 }; return s }) // never create a record for an unseen card
  }
  const gradeRef = useRef(grade); gradeRef.current = grade

  // Each call: the instructor says it, then the clock starts. Time up grades whatever is typed.
  useEffect(() => {
    if (!c) return
    let t: ReturnType<typeof setInterval> | undefined, dead = false
    const go = () => {
      if (dead || +secs === 0) return
      const end = Date.now() + +secs * 1000
      setLeft(+secs)
      t = setInterval(() => { const l = Math.max(0, Math.ceil((end - Date.now()) / 1000)); setLeft(l); if (l === 0) { clearInterval(t); gradeRef.current(true) } }, 250)
    }
    if (aloud) speak(call(c), store.settings.rate, go); else go()
    return () => { dead = true; if (t) clearInterval(t); stopSpeaking() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run?.i, run?.q])

  if (!run) {
    return (
      <Panel>
        <Eyebrow>{title}</Eyebrow>
        <h2 className="slab mt-2 text-2xl font-bold">Inspection: answer on the spot</h2>
        <p className="mt-1 text-muted-foreground">The instructor calls a card, a clock starts, and you get one try, word for word. No hints, no second chance. Cards you miss and the senior ranks come up more often. A miss makes the card due today in Study.</p>
        <div className="mt-4 grid max-w-xs gap-2"><Label>Questions</Label>
          <Select value={count} onValueChange={setCount}><SelectTrigger className="h-12! w-full"><SelectValue /></SelectTrigger>
            <SelectContent>{["5", "10", "20", "30"].map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent></Select></div>
        <div className="mt-4 grid max-w-xs gap-2"><Label>Time to answer</Label>
          <Select value={secs} onValueChange={setSecs}><SelectTrigger className="h-12! w-full"><SelectValue /></SelectTrigger>
            <SelectContent>{["10", "15", "20", "30", "45", "0"].map((n) => <SelectItem key={n} value={n}>{n === "0" ? "No clock" : `${n} seconds`}</SelectItem>)}</SelectContent></Select></div>
        <div className="mt-4 flex items-center gap-3"><Switch id="ia" checked={aloud} onCheckedChange={setAloud} /><Label htmlFor="ia" className="text-base">Instructor reads the call aloud</Label></div>
        <div className="mt-3 flex items-center gap-3"><Switch id="ip" checked={pen} onCheckedChange={setPen} /><Label htmlFor="ip" className="text-base">Call a push-up penalty on a miss (you count them)</Label></div>
        <div className="mt-5 flex gap-3">
          <Button disabled={!pool.length} onClick={() => { setRun({ q: draw(pool, +count, store), i: 0, right: 0, missed: [] }); setText(""); setRes(null) }}>Start inspection</Button>
          <Button variant="outline" onClick={onExit}>Back</Button>
        </div>
      </Panel>
    )
  }
  if (!c) {
    return (
      <Panel>
        <Eyebrow>Inspection over</Eyebrow>
        <h2 className="slab mt-2 text-3xl font-bold">{run.right} of {run.q.length}</h2>
        {run.missed.length > 0 ? <p className="mt-2 text-muted-foreground">Missed: {run.missed.join(", ")}. They are due again today.</p> : <p className="mt-2 text-lg">Clean. Every call answered word for word.</p>}
        <div className="mt-5 flex gap-3">
          <Button onClick={() => { setRun({ q: draw(pool, +count, store), i: 0, right: 0, missed: [] }); setText(""); setRes(null) }}>Another round</Button>
          <Button variant="outline" onClick={onExit}>Done</Button>
        </div>
      </Panel>
    )
  }
  const next = () => { setRun({ ...run, i: run.i + 1, right: run.right + (res?.ok ? 1 : 0), missed: res?.ok ? run.missed : [...run.missed, c.prompt] }); setText(""); setRes(null) }
  return (
    <Panel>
      <div className="flex items-center justify-between"><Eyebrow>Call {run.i + 1} of {run.q.length}</Eyebrow>{+secs > 0 && !res && <span className={`slab text-3xl font-bold ${left <= 5 && left > 0 ? "text-destructive" : "text-gold"}`} aria-live="off">{left}</span>}</div>
      <h2 className="slab mt-3 mb-4 text-2xl font-bold">{c.prompt}</h2>
      <Textarea value={text} disabled={!!res} onChange={(e) => setText(e.target.value)} autoFocus autoCapitalize="none" autoCorrect="off" spellCheck={false} aria-label="Your answer" className="min-h-32 bg-background/60 text-lg" placeholder="Answer now. Type, or use the keyboard microphone." />
      {res ? (
        <>
          <Verdict ok={res.ok} note={!res.ok && !text.trim() ? (+secs > 0 && left === 0 ? "Time." : "No answer.") : undefined} /><Diff r={res} />
          {!res.ok && pen && <p className="mt-3 font-bold text-destructive">Drop and give me five.</p>}
          <div className="mt-4"><Button onClick={next} autoFocus>Next call</Button></div>
        </>
      ) : (
        <div className="mt-4 flex gap-3"><Button onClick={() => grade()}>Answer</Button><MicButton onText={setText} /><Button variant="outline" onClick={() => { stopSpeaking(); setRun(null) }}>End</Button></div>
      )}
    </Panel>
  )
}
