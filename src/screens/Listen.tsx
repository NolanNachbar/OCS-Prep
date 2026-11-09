import { useEffect, useRef, useState } from "react"
import { Pause, Play, SkipForward } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Eyebrow, Panel } from "@/components/shared"
import { useCards } from "@/lib/cards"
import { speak, stopSpeaking } from "@/lib/speech"
import { useStore } from "@/lib/store"
import type { Card } from "@/lib/types"

// Hands-free loop for running: say the prompt, leave a gap to answer aloud, then speak the answer.
export default function Listen() {
  const store = useStore()
  const { order } = useCards()
  const [playing, setPlaying] = useState(false)
  const [idx, setIdx] = useState(0)
  const [phase, setPhase] = useState<"prompt" | "gap" | "answer">("prompt")
  const [started, setStarted] = useState(true)
  const run = useRef(0)
  const lock = useRef<{ release: () => Promise<void> } | null>(null)

  const list: Card[] = order.filter((c) => !started || store.cards[c.id])
  const cards = list.length ? list : order.slice(0, 10)
  const gapMs = store.settings.gap * 1000

  useEffect(() => {
    if (!playing) return
    const id = ++run.current
    const live = () => run.current === id
    const c = cards[idx % cards.length]
    let t: ReturnType<typeof setTimeout>
    setPhase("prompt")
    speak(c.prompt, store.settings.rate, () => {
      if (!live()) return
      setPhase("gap")
      t = setTimeout(() => {
        if (!live()) return
        setPhase("answer")
        speak((c.lead ? c.lead + " " : "") + c.answer, store.settings.rate, () => {
          if (!live()) return
          t = setTimeout(() => live() && setIdx((i) => i + 1), 1200)
        })
      }, gapMs)
    })
    return () => { run.current++; clearTimeout(t); stopSpeaking() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, idx])

  const toggle = async () => {
    const next = !playing
    setPlaying(next)
    try {
      if (next && (navigator as any).wakeLock) lock.current = await (navigator as any).wakeLock.request("screen")
      else if (lock.current) { await lock.current.release(); lock.current = null }
    } catch { /* wake lock is best effort */ }
  }
  useEffect(() => () => { lock.current?.release().catch(() => {}) }, [])

  const c = cards[idx % cards.length]
  return (
    <Panel>
      <Eyebrow>Listen mode</Eyebrow>
      <h2 className="slab mt-2 text-2xl font-bold">Run it hands-free</h2>
      <p className="mt-1 text-sm text-muted-foreground">Prompt, then {store.settings.gap} seconds to say the answer aloud, then the answer is read back. Keeps the screen awake.</p>
      <div className="my-5 flex items-center gap-3">
        <Switch id="st" checked={started} onCheckedChange={(v) => { setStarted(v); setIdx(0) }} />
        <Label htmlFor="st" className="text-base">Only cards I have started</Label>
      </div>
      <div className="rounded-md border border-border bg-background/60 p-5 text-center">
        <div className="text-xs font-bold uppercase tracking-[0.18em] text-gold">{playing ? (phase === "gap" ? "Your turn" : phase === "answer" ? "Answer" : "Prompt") : "Paused"}</div>
        <div className="slab mt-2 text-2xl font-bold">{c.prompt}</div>
        {phase === "answer" && playing && <p className="mt-3 text-lg text-muted-foreground">{c.answer}</p>}
      </div>
      <div className="mt-5 flex gap-3">
        <Button size="lg" className="flex-1" onClick={toggle}>{playing ? <Pause /> : <Play />} {playing ? "Pause" : "Play"}</Button>
        <Button size="lg" variant="outline" onClick={() => setIdx((i) => i + 1)} aria-label="Skip card"><SkipForward /></Button>
      </div>
    </Panel>
  )
}
