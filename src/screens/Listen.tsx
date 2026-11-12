import { lines } from "@/lib/blanks"
import { useEffect, useRef, useState } from "react"
import { Pause, Play, SkipForward } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Panel } from "@/components/shared"
import { useCards } from "@/lib/cards"
import { hookFor } from "@/lib/hooks"
import { SPEEDS, speak, stopSpeaking } from "@/lib/speech"
import { update, useStore } from "@/lib/store"

// Quiz: prompt, a gap to say it aloud, then the answer. Read: just reads the chosen sections to you.
export default function Listen() {
  const store = useStore()
  const { order, secIdx } = useCards()
  const secs = [...new Map(order.map((c) => [c.sec, c.secName])).entries()]
  const [mode, setMode] = useState("read")
  // How many times each card plays in a row (0 = left out). Cards play in book order, each repeated back to back.
  const [reps, setReps] = useState<Record<string, number>>(() => Object.fromEntries(order.filter((x) => x.sec === secs[0]?.[0]).map((x) => [x.id, 1])))
  const [loop, setLoop] = useState(false)
  const [aSec, setASec] = useState(secs[0]?.[0] ?? "")
  const [aMode, setAMode] = useState("read")
  const [aErr, setAErr] = useState(false)
  const [tips, setTips] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [idx, setIdx] = useState(0)
  const [lap, setLap] = useState(0)
  const [phase, setPhase] = useState<"prompt" | "gap" | "answer">("prompt")
  const run = useRef(0)
  const lock = useRef<{ release: () => Promise<void> } | null>(null)

  const cards = order.flatMap((x) => Array.from({ length: reps[x.id] ?? 0 }, (_, i) => ({ c: x, rep: i + 1, of: reps[x.id] })))
  const gapMs = store.settings.gap * 1000
  const cur = cards[idx % Math.max(1, cards.length)]
  const c = cur?.c

  useEffect(() => {
    if (!playing || !c) return
    const id = ++run.current
    const live = () => run.current === id
    const full = (c.lead ? c.lead + " " : "") + c.answer
    const hook = tips ? hookFor(c, secIdx(c)) : ""
    const after = () => {
      if (!live()) return
      if (idx + 1 >= cards.length && !loop) { setPlaying(false); setIdx(0); return }
      setIdx((i) => (i + 1 >= cards.length ? 0 : i + 1))
      setLap((n) => n + 1)
    }
    let t: ReturnType<typeof setTimeout>
    setPhase("prompt")
    if (mode === "read") {
      speak(c.prompt + ". " + full + (hook ? ". Memory hook. " + hook : ""), store.settings.rate, () => { if (live()) t = setTimeout(after, 900) })
    } else {
      speak(c.prompt, store.settings.rate, () => {
        if (!live()) return
        setPhase("gap")
        t = setTimeout(() => {
          if (!live()) return
          setPhase("answer")
          speak(full + (hook ? ". Memory hook. " + hook : ""), store.settings.rate, () => { if (live()) t = setTimeout(after, 1200) })
        }, gapMs)
      })
    }
    return () => { run.current++; clearTimeout(t); stopSpeaking() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, idx, lap, mode, tips, c?.id])

  const toggle = async () => {
    const next = !playing
    if (next && !cards.length) return
    setPlaying(next)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const wl = (navigator as any).wakeLock
      if (next && wl) lock.current = await wl.request("screen")
      else if (lock.current) { await lock.current.release(); lock.current = null }
    } catch { /* wake lock is best effort */ }
  }
  useEffect(() => { if (!playing && lock.current) { lock.current.release().catch(() => {}); lock.current = null } }, [playing])
  useEffect(() => () => { lock.current?.release().catch(() => {}) }, [])
  const setRep = (id: string, n: number) => { setPlaying(false); setReps((r) => ({ ...r, [id]: Math.max(0, Math.min(9, n)) })); setIdx(0) }
  const inSec = (k: string) => order.filter((x) => x.sec === k)
  const allIn = (k: string) => inSec(k).every((x) => (reps[x.id] ?? 0) > 0)
  // The section button turns the whole section on at once (keeping any count you set) or clears it.
  const pick = (k: string) => { setPlaying(false); setReps((r) => ({ ...r, ...Object.fromEntries(inSec(k).map((x) => [x.id, allIn(k) ? 0 : r[x.id] || 1])) })); setIdx(0) }

  return (
    <Panel>
      <Tabs value={mode} onValueChange={(v) => { setMode(v); setPlaying(false); setIdx(0) }}>
        <TabsList className="grid h-auto! w-full grid-cols-2 rounded-none bg-black/30">
          <TabsTrigger value="read" className="h-11 rounded-none font-bold uppercase tracking-wider">Read to me</TabsTrigger>
          <TabsTrigger value="quiz" className="h-11 rounded-none font-bold uppercase tracking-wider">Quiz me</TabsTrigger>
        </TabsList>
      </Tabs>
      <p className="mt-3 text-sm text-muted-foreground">{mode === "read" ? "Reads each card you choose, prompt then answer." : `Prompt, then ${store.settings.gap} seconds to say it aloud, then the answer.`}</p>
      <div className="mt-4 mb-2 text-xs font-bold uppercase tracking-[0.18em] text-gold">Sections ({cards.length} plays)</div>
      <div className="flex flex-wrap gap-2">
        {secs.map(([k, name]) => (
          <button key={k} onClick={() => pick(k)} aria-pressed={allIn(k)}
            className={`min-h-11 border px-3 text-xs font-bold uppercase tracking-wider ${allIn(k) ? "border-gold bg-gold text-navy-black" : "border-border text-foreground"}`}>{name}</button>
        ))}
      </div>
      <div className="mt-4 mb-2 text-xs font-bold uppercase tracking-[0.18em] text-gold">Pick exact cards and how many times each plays</div>
      <div className="space-y-2">
        {secs.map(([k, name]) => {
          const cs = inSec(k)
          const on = cs.filter((x) => (reps[x.id] ?? 0) > 0).length
          return (
            <details key={k} className="border border-border">
              <summary className="flex min-h-11 cursor-pointer items-center justify-between px-3 text-sm font-bold">
                <span>{name}</span><span className="text-muted-foreground">{on} of {cs.length} chosen</span>
              </summary>
              <div className="border-t border-border">
                {cs.map((x) => (
                  <div key={x.id} className="flex items-center justify-between gap-2 px-3 py-1">
                    <span className={`text-sm ${(reps[x.id] ?? 0) > 0 ? "text-foreground" : "text-muted-foreground"}`}>{x.prompt}</span>
                    <span className="flex shrink-0 items-center">
                      <Button size="sm" variant="outline" className="size-11" onClick={() => setRep(x.id, (reps[x.id] ?? 0) - 1)} aria-label={`Fewer plays of ${x.prompt}`}>-</Button>
                      <span className="w-9 text-center font-bold" aria-label={`${reps[x.id] ?? 0} plays`}>{(reps[x.id] ?? 0) > 0 ? `${reps[x.id]}x` : "off"}</span>
                      <Button size="sm" variant="outline" className="size-11" onClick={() => setRep(x.id, (reps[x.id] ?? 0) + 1)} aria-label={`More plays of ${x.prompt}`}>+</Button>
                    </span>
                  </div>
                ))}
              </div>
            </details>
          )
        })}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">Each card plays its count back to back, then the next card. With Loop off it stops after the last play. Turn Loop on to start the list over forever; with one card chosen that repeats just that card. Changing a count pauses playback.</p>
      <div className="mt-5 mb-2 text-xs font-bold uppercase tracking-[0.18em] text-gold">Speed ({store.settings.rate}x)</div>
      <div className="flex flex-wrap gap-2">
        {SPEEDS.map((r) => (
          <button key={r} aria-pressed={store.settings.rate === r} onClick={() => update((s) => { s.settings.rate = r; return s })}
            className={`min-h-11 min-w-14 border px-3 text-sm font-bold ${store.settings.rate === r ? "border-gold bg-gold text-navy-black" : "border-border text-foreground"}`}>{r}x</button>
        ))}
      </div>
      <div className="my-5 flex items-center gap-3">
        <Switch id="lp" checked={loop} onCheckedChange={setLoop} />
        <Label htmlFor="lp" className="text-base">Loop the whole list</Label>
        <Switch id="tp" className="ml-4" checked={tips} onCheckedChange={setTips} />
        <Label htmlFor="tp" className="text-base">Say memory hooks</Label>
      </div>
      <div className="border border-border bg-black/25 p-5 text-center">
        <div className="text-xs font-bold uppercase tracking-[0.18em] text-gold">{playing ? (mode === "quiz" && phase === "gap" ? "Your turn" : mode === "quiz" && phase === "answer" ? "Answer" : "Reading") : "Paused"}</div>
        <div className="slab mt-2 text-3xl font-bold leading-none">{c ? c.prompt : "Pick at least one card"}</div>
        {cur && cur.of > 1 && <div className="mt-2 text-sm text-muted-foreground">Play {cur.rep} of {cur.of}</div>}
        {c && (mode === "read" || phase === "answer") && playing && <p className="mt-3 whitespace-pre-line text-lg text-muted-foreground">{lines(c.answer)}</p>}
      </div>
      <div className="mt-5 flex gap-3">
        <Button size="lg" className="flex-1" onClick={toggle} disabled={!cards.length}>{playing ? <Pause /> : <Play />} {playing ? "Pause" : "Play my list"}</Button>
        <Button size="lg" variant="outline" onClick={() => setIdx((i) => (i + 1) % Math.max(1, cards.length))} aria-label="Next card"><SkipForward /></Button>
      </div>
      <div className="mt-8 border-t border-border pt-5">
        <div className="text-xs font-bold uppercase tracking-[0.18em] text-gold">Whole-section recordings (separate player)</div>
        <p className="mt-2 text-sm text-muted-foreground">This is not the Play button above. These are recordings of a whole section that keep playing with the screen locked. They ignore the card choices and counts, and they loop forever until you pause. Needs a connection every time you play one.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {secs.map(([k, name]) => (
            <button key={k} onClick={() => setASec(k)} aria-pressed={aSec === k}
              className={`min-h-11 border px-3 text-xs font-bold uppercase tracking-wider ${aSec === k ? "border-gold bg-gold text-navy-black" : "border-border text-foreground"}`}>{name}</button>
          ))}
        </div>
        <Tabs value={aMode} onValueChange={setAMode} className="mt-3">
          <TabsList className="grid h-auto! w-full grid-cols-2 rounded-none bg-black/30">
            <TabsTrigger value="read" className="h-11 rounded-none font-bold uppercase tracking-wider">Read</TabsTrigger>
            <TabsTrigger value="quiz" className="h-11 rounded-none font-bold uppercase tracking-wider">Quiz (6 s gap)</TabsTrigger>
          </TabsList>
        </Tabs>
        <audio key={aSec + aMode} className="mt-3 w-full" controls loop preload="none" onError={() => setAErr(true)} onPlay={() => setAErr(false)} src={`${import.meta.env.BASE_URL}audio/${aSec}-${aMode}.mp3`} />
        {aErr && <p className="mt-2 text-destructive" role="alert">Audio unavailable right now. Check your connection, or use Read to me above.</p>}
      </div>
    </Panel>
  )
}
