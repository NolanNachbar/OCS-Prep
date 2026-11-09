import { useEffect, useRef, useState } from "react"
import { Pause, Play, SkipForward } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Panel } from "@/components/shared"
import { useCards } from "@/lib/cards"
import { hookFor } from "@/lib/hooks"
import { speak, stopSpeaking } from "@/lib/speech"
import { useStore } from "@/lib/store"

// Quiz: prompt, a gap to say it aloud, then the answer. Read: just reads the chosen sections to you.
export default function Listen() {
  const store = useStore()
  const { order, secIdx } = useCards()
  const secs = [...new Map(order.map((c) => [c.sec, c.secName])).entries()]
  const [mode, setMode] = useState("read")
  const [picked, setPicked] = useState<string[]>(secs.slice(0, 1).map(([k]) => k))
  const [loop, setLoop] = useState(true)
  const [aSec, setASec] = useState(secs[0]?.[0] ?? "")
  const [aMode, setAMode] = useState("read")
  const [tips, setTips] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [idx, setIdx] = useState(0)
  const [phase, setPhase] = useState<"prompt" | "gap" | "answer">("prompt")
  const run = useRef(0)
  const lock = useRef<{ release: () => Promise<void> } | null>(null)

  const cards = order.filter((c) => picked.includes(c.sec))
  const gapMs = store.settings.gap * 1000
  const c = cards[idx % Math.max(1, cards.length)]

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
  }, [playing, idx, mode, tips, c?.id])

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
  const pick = (k: string) => { setPicked((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k])); setIdx(0) }

  return (
    <Panel>
      <Tabs value={mode} onValueChange={(v) => { setMode(v); setPlaying(false); setIdx(0) }}>
        <TabsList className="grid h-auto! w-full grid-cols-2 rounded-none bg-black/30">
          <TabsTrigger value="read" className="h-11 rounded-none font-bold">Read to me</TabsTrigger>
          <TabsTrigger value="quiz" className="h-11 rounded-none font-bold">Quiz me</TabsTrigger>
        </TabsList>
      </Tabs>
      <p className="mt-3 text-sm text-muted-foreground">{mode === "read" ? "Reads each card in the sections you pick, prompt then answer." : `Prompt, then ${store.settings.gap} seconds to say it aloud, then the answer.`}</p>
      <div className="mt-4 mb-2 text-sm font-medium text-muted-foreground">Sections ({cards.length} cards)</div>
      <div className="flex flex-wrap gap-2">
        {secs.map(([k, name]) => (
          <button key={k} onClick={() => pick(k)} aria-pressed={picked.includes(k)}
            className={`min-h-11 border px-3 text-xs font-bold ${picked.includes(k) ? "border-gold bg-gold text-navy-black" : "border-border text-foreground"}`}>{name}</button>
        ))}
      </div>
      <div className="my-5 flex items-center gap-3">
        <Switch id="lp" checked={loop} onCheckedChange={setLoop} />
        <Label htmlFor="lp" className="text-base">Loop</Label>
        <Switch id="tp" className="ml-4" checked={tips} onCheckedChange={setTips} />
        <Label htmlFor="tp" className="text-base">Say memory hooks</Label>
      </div>
      <div className="border border-border bg-black/25 p-5 text-center">
        <div className="text-sm font-medium text-muted-foreground">{playing ? (mode === "quiz" && phase === "gap" ? "Your turn" : mode === "quiz" && phase === "answer" ? "Answer" : "Reading") : "Paused"}</div>
        <div className="slab mt-2 text-3xl font-bold leading-none">{c ? c.prompt : "Pick at least one section"}</div>
        {c && (mode === "read" || phase === "answer") && playing && <p className="mt-3 text-lg text-muted-foreground">{c.answer}</p>}
      </div>
      <div className="mt-5 flex gap-3">
        <Button size="lg" className="flex-1" onClick={toggle} disabled={!cards.length}>{playing ? <Pause /> : <Play />} {playing ? "Pause" : "Play"}</Button>
        <Button size="lg" variant="outline" onClick={() => setIdx((i) => (i + 1) % Math.max(1, cards.length))} aria-label="Next card"><SkipForward /></Button>
      </div>
      <div className="mt-8 border-t border-border pt-5">
        <div className="text-sm font-medium text-muted-foreground">Audio files, for the run</div>
        <p className="mt-2 text-sm text-muted-foreground">Real recordings that keep playing with the screen locked or the phone in your pocket. Pick a section, press play, and it loops. Needs a connection the first time you play each one.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {secs.map(([k, name]) => (
            <button key={k} onClick={() => setASec(k)} aria-pressed={aSec === k}
              className={`min-h-11 border px-3 text-xs font-bold ${aSec === k ? "border-gold bg-gold text-navy-black" : "border-border text-foreground"}`}>{name}</button>
          ))}
        </div>
        <Tabs value={aMode} onValueChange={setAMode} className="mt-3">
          <TabsList className="grid h-auto! w-full grid-cols-2 rounded-none bg-black/30">
            <TabsTrigger value="read" className="h-11 rounded-none font-bold">Read</TabsTrigger>
            <TabsTrigger value="quiz" className="h-11 rounded-none font-bold">Quiz (6 s gap)</TabsTrigger>
          </TabsList>
        </Tabs>
        <audio key={aSec + aMode} className="mt-3 w-full" controls loop preload="none" src={`${import.meta.env.BASE_URL}audio/${aSec}-${aMode}.mp3`} />
      </div>
    </Panel>
  )
}
