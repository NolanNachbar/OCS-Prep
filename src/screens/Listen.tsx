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
  const { book: order } = useCards()
  const secs = [...new Map(order.map((c) => [c.sec, c.secName])).entries()]
  const [mode, setMode] = useState("read")
  // How many times each card plays in a row (0 = left out). Cards play in book order, each repeated back to back.
  const [reps, setReps] = useState<Record<string, number>>(() => Object.fromEntries(order.filter((x) => x.sec === secs[0]?.[0]).map((x) => [x.id, 1])))
  const [loop, setLoop] = useState(false)
  const [err, setErr] = useState(false)
  const [note, setNote] = useState("") // "Skipped <card>" or the all-clips-failed message
  const pos = useRef(0) // index of the clip actually loaded, kept current by the audio handlers
  const fails = useRef(0) // consecutive clips that failed without ever playing
  const [playing, setPlaying] = useState(false)
  const [idx, setIdx] = useState(0)
  const [lap, setLap] = useState(0)
  const au = useRef<HTMLAudioElement | null>(null)
  if (!au.current && typeof Audio !== "undefined") au.current = new Audio()
  const live = useRef({ n: 0, loop, ids: [] as string[], prompts: [] as string[], mode, rate: 1 })
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined) // shared so a stale effect closure can't leak one
  const seq = useRef(0) // bumps on every load; a failure only counts once, and only for the clip still loaded
  const handled = useRef(-1) // index the ended handler already started, so the effect doesn't reload it

  const cards = order.flatMap((x) => Array.from({ length: reps[x.id] ?? 0 }, (_, i) => ({ c: x, rep: i + 1, of: reps[x.id] })))
  const rate = store.settings.rate
  const cur = cards[idx % Math.max(1, cards.length)]
  const c = cur?.c
  live.current = { n: cards.length, loop, ids: cards.map((x) => x.c.id), prompts: cards.map((x) => x.c.prompt), mode, rate }

  useEffect(() => {
    const a = au.current
    if (!a) return
    const disarm = () => { if (timer.current) clearTimeout(timer.current); timer.current = undefined }
    if (!playing || !c) { a.pause(); return disarm }
    setErr(false)
    pos.current = idx
    const load = (i: number) => {
      pos.current = i
      a.src = `${import.meta.env.BASE_URL}audio/cards/${live.current.ids[i]}-${live.current.mode}.mp3`
      a.defaultPlaybackRate = live.current.rate // loading a new src resets playbackRate to this
      a.playbackRate = live.current.rate
      const my = ++seq.current
      arm()
      // AbortError = a newer load replaced this one (skip/step). A broken file rejects here AND fires the error
      // event, so only the error event (or the watchdog) skips it. NotAllowedError (no gesture) gets no error event.
      a.play()?.catch((e) => { if (e?.name === "NotAllowedError") fail(my) })
    }
    // play() rejecting and the error event both report the same broken clip; skip it only once.
    const fail = (my: number) => { if (my !== seq.current) return; seq.current++; disarm(); advance(true) }
    // Move to the next clip from inside an audio event (never through a React render: a locked iPhone suspends
    // rendering). failed = the current clip is being skipped; if every clip in a row fails, stop with a message.
    const advance = (failed: boolean) => {
      const { n, loop: lp, ids, prompts } = live.current
      const i = pos.current
      if (failed) {
        setNote(`Skipped ${prompts[i]}`)
        fails.current += 1
        if (fails.current >= n) { disarm(); a.pause(); setNote(`Could not play any of the ${n} chosen clips. Check your connection and press play again.`); setPlaying(false); return }
      }
      if (i + 1 >= n && !lp) { disarm(); setPlaying(false); setIdx(0); return }
      const next = i + 1 >= n ? 0 : i + 1
      handled.current = next
      load(next)
      setIdx(next)
      setLap((k) => k + 1)
    }
    // Stall watchdog: no progress for 8s counts as a failed clip. Cleared on pause, ended, track change, unmount.
    function arm() { disarm(); const my = seq.current; timer.current = setTimeout(() => fail(my), 8000) }
    a.onended = () => { disarm(); fails.current = 0; advance(false) }
    a.onerror = () => fail(seq.current)
    a.onplay = arm
    a.onwaiting = arm
    a.onplaying = () => { fails.current = 0; arm() }
    a.ontimeupdate = arm
    a.onpause = disarm
    if (handled.current === idx) { handled.current = -1; return disarm }
    load(idx)
    return disarm
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
    if (!playing) { setNote(""); fails.current = 0; setLap((n) => n + 1) } // starting again always restarts the clip, even on the same card
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
      {note && <p className="mt-3 text-destructive" role="alert">{note}</p>}
      {err && <p className="mt-3 text-destructive" role="alert">Audio unavailable right now. Check your connection and press play again.</p>}
      <div className="mt-5 flex gap-3">
        <Button size="lg" variant="outline" onClick={() => step(-1)} disabled={!cards.length} aria-label="Previous card"><SkipBack /></Button>
        <Button size="lg" className="flex-1" onClick={toggle} disabled={!cards.length}>{playing ? <Pause /> : <Play />} {playing ? "Pause" : "Play"}</Button>
        <Button size="lg" variant="outline" onClick={() => step(1)} disabled={!cards.length} aria-label="Next card"><SkipForward /></Button>
      </div>
    </Panel>
  )
}
