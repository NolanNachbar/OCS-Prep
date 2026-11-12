import { lines } from "@/lib/blanks"
import { useEffect, useRef, useState } from "react"
import { Pause, Play, SkipBack, SkipForward } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Panel } from "@/components/shared"
import { useCards } from "@/lib/cards"
import { SPEEDS } from "@/lib/speech"
import { update, useStore } from "@/lib/store"

// One player for everything. Each card has its own recording (tools/make_clips.py); this queues them in book order,
// each repeated back to back, on a single audio element so it keeps going with the screen locked.
// Quiz clips are prompt, a gap sized to the answer, then the answer. Read clips are prompt then answer.
export default function Listen() {
  const store = useStore()
  const { order } = useCards()
  const secs = [...new Map(order.map((c) => [c.sec, c.secName])).entries()]
  const [mode, setMode] = useState("read")
  // How many times each card plays in a row (0 = left out). Cards play in book order, each repeated back to back.
  const [reps, setReps] = useState<Record<string, number>>(() => Object.fromEntries(order.filter((x) => x.sec === secs[0]?.[0]).map((x) => [x.id, 1])))
  const [loop, setLoop] = useState(false)
  const [err, setErr] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [idx, setIdx] = useState(0)
  const [lap, setLap] = useState(0)
  const au = useRef<HTMLAudioElement | null>(null)
  if (!au.current && typeof Audio !== "undefined") au.current = new Audio()
  const live = useRef({ n: 0, loop, ids: [] as string[], mode, rate: 1 })
  const handled = useRef(-1) // index the ended handler already started, so the effect doesn't reload it

  const cards = order.flatMap((x) => Array.from({ length: reps[x.id] ?? 0 }, (_, i) => ({ c: x, rep: i + 1, of: reps[x.id] })))
  const rate = store.settings.rate
  const cur = cards[idx % Math.max(1, cards.length)]
  const c = cur?.c
  live.current = { n: cards.length, loop, ids: cards.map((x) => x.c.id), mode, rate }

  useEffect(() => {
    const a = au.current
    if (!a) return
    if (!playing || !c) { a.pause(); return }
    setErr(false)
    const load = (id: string) => {
      a.src = `${import.meta.env.BASE_URL}audio/cards/${id}-${live.current.mode}.mp3`
      a.defaultPlaybackRate = live.current.rate // loading a new src resets playbackRate to this
      a.playbackRate = live.current.rate
      return a.play()
    }
    // Chain the next clip right inside the ended event, not through a React render: a locked iPhone suspends page
    // rendering, so waiting on state to start the next clip is what made playback stop after the first one.
    a.onended = () => {
      const { n, loop: lp, ids } = live.current
      if (idx + 1 >= n && !lp) { setPlaying(false); setIdx(0); return }
      const next = idx + 1 >= n ? 0 : idx + 1
      handled.current = next
      load(ids[next]).catch(() => { setErr(true); setPlaying(false) })
      setIdx(next)
      setLap((k) => k + 1)
    }
    a.onerror = () => { setErr(true); setPlaying(false) }
    if (handled.current === idx) { handled.current = -1; return }
    load(c.id).catch(() => { setErr(true); setPlaying(false) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, idx, lap, mode, c?.id])

  useEffect(() => { if (au.current) { au.current.defaultPlaybackRate = rate; au.current.playbackRate = rate } }, [rate])

  // Lock-screen and earbud controls.
  useEffect(() => {
    const ms = typeof navigator !== "undefined" ? navigator.mediaSession : undefined
    if (!ms) return
    const hop = (d: number) => { setIdx((i) => (i + d + Math.max(1, live.current.n)) % Math.max(1, live.current.n)); setLap((n) => n + 1) }
    const set = (k: MediaSessionAction, f: MediaSessionActionHandler | null) => { try { ms.setActionHandler(k, f) } catch { /* not supported */ } }
    set("play", () => setPlaying(true)); set("pause", () => setPlaying(false))
    set("nexttrack", () => hop(1)); set("previoustrack", () => hop(-1))
    return () => { ["play", "pause", "nexttrack", "previoustrack"].forEach((k) => set(k as MediaSessionAction, null)) }
  }, [])
  useEffect(() => {
    if (playing && c && typeof MediaMetadata !== "undefined") navigator.mediaSession.metadata = new MediaMetadata({ title: c.prompt, artist: "Navy OCS Prep", album: c.secName })
  }, [playing, c?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { au.current?.pause() }, [])

  const toggle = () => {
    if (!playing && !cards.length) return
    if (!playing) setLap((n) => n + 1) // starting again always restarts the clip, even on the same card
    setPlaying(!playing)
  }
  const step = (d: number) => { setIdx((i) => (i + d + Math.max(1, cards.length)) % Math.max(1, cards.length)); setLap((n) => n + 1) }
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
      <p className="mt-3 text-sm text-muted-foreground">{mode === "read" ? "Reads each card you choose, prompt then answer." : "Prompt, then a pause to say it aloud (longer for longer answers), then the answer."} Plays from recordings, so it keeps going with the screen locked and needs a connection.</p>
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
      <div className="mt-5 mb-2 text-xs font-bold uppercase tracking-[0.18em] text-gold">Speed ({rate}x)</div>
      <div className="flex flex-wrap gap-2">
        {SPEEDS.map((r) => (
          <button key={r} aria-pressed={rate === r} onClick={() => update((s) => { s.settings.rate = r; return s })}
            className={`min-h-11 min-w-14 border px-3 text-sm font-bold ${rate === r ? "border-gold bg-gold text-navy-black" : "border-border text-foreground"}`}>{r}x</button>
        ))}
      </div>
      <div className="my-5 flex items-center gap-3">
        <Switch id="lp" checked={loop} onCheckedChange={setLoop} />
        <Label htmlFor="lp" className="text-base">Loop the whole list</Label>
      </div>
      <div className="border border-border bg-black/25 p-5 text-center">
        <div className="text-xs font-bold uppercase tracking-[0.18em] text-gold">{playing ? "Playing" : "Paused"}</div>
        <div className="slab mt-2 text-3xl font-bold leading-none">{c ? c.prompt : "Pick at least one card"}</div>
        {cur && cur.of > 1 && <div className="mt-2 text-sm text-muted-foreground">Play {cur.rep} of {cur.of}</div>}
        {c && mode === "read" && playing && <p className="mt-3 whitespace-pre-line text-lg text-muted-foreground">{lines(c.answer)}</p>}
      </div>
      {err && <p className="mt-3 text-destructive" role="alert">Audio unavailable right now. Check your connection and press play again.</p>}
      <div className="mt-5 flex gap-3">
        <Button size="lg" variant="outline" onClick={() => step(-1)} disabled={!cards.length} aria-label="Previous card"><SkipBack /></Button>
        <Button size="lg" className="flex-1" onClick={toggle} disabled={!cards.length}>{playing ? <Pause /> : <Play />} {playing ? "Pause" : "Play"}</Button>
        <Button size="lg" variant="outline" onClick={() => step(1)} disabled={!cards.length} aria-label="Next card"><SkipForward /></Button>
      </div>
    </Panel>
  )
}
