import { useRef, useState, type ReactNode } from "react"
import { Mic, Square, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { SR } from "@/lib/speech"
import type { Score } from "@/lib/types"

export function Eyebrow({ children }: { children: ReactNode }) {
  return <div className="eyebrow">{children}</div>
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <Card className={`rounded-md border border-border bg-card/85 py-0 shadow-lg shadow-black/30 ring-0 backdrop-blur ${className}`}>
      <CardContent className="p-5 sm:p-6">{children}</CardContent>
    </Card>
  )
}

export function StatTile({ value, label, tone = "text-foreground" }: { value: ReactNode; label: string; tone?: string }) {
  return (
    <div className="flex-1 rounded-md border border-border bg-card/70 px-3 py-4 text-center">
      <div className={`slab text-3xl font-bold ${tone}`}>{value}</div>
      <div className="mt-1 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
    </div>
  )
}

// Built-in speech recognition; keyboard dictation on iPhone and Mac works without it.
export function MicButton({ onText }: { onText: (t: string) => void }) {
  const [on, setOn] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rec = useRef<any>(null)
  if (!SR) return null
  const toggle = () => {
    if (rec.current) { rec.current.stop(); return }
    const r = new SR!()
    r.lang = "en-US"; r.interimResults = true; r.continuous = true
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    r.onresult = (ev: any) => {
      let t = ""
      for (let i = 0; i < ev.results.length; i++) t += ev.results[i][0].transcript
      onText(t)
    }
    r.onend = () => { rec.current = null; setOn(false) }
    rec.current = r
    setOn(true)
    try { r.start() } catch { rec.current = null; setOn(false) }
  }
  return (
    <Button type="button" variant="outline" onClick={toggle} aria-pressed={on}>
      {on ? <Square /> : <Mic />} {on ? "Stop" : "Mic"}
    </Button>
  )
}

export function Diff({ r }: { r: Score }) {
  return (
    <div className="mt-3">
      <div className="rounded-md border border-border bg-background/60 p-4 text-lg leading-relaxed">
        {r.expected.map((w, i) => (
          <span key={i} className={r.hit[i] ? "text-ok" : "text-destructive underline decoration-wavy underline-offset-4"}>{w} </span>
        ))}
      </div>
      {r.extra.length > 0 && <div className="mt-2 text-sm text-muted-foreground">Extra words: <span className="text-amber-300">{r.extra.join(" ")}</span></div>}
      <div className="mt-1 text-sm text-muted-foreground">{Math.round(r.ratio * 100)}% of the words, in order</div>
    </div>
  )
}

export function Verdict({ ok, note }: { ok: boolean; note?: string }) {
  return (
    <div className={`mt-4 flex items-center gap-2 font-bold uppercase tracking-[0.14em] ${ok ? "text-ok" : "text-destructive"}`}>
      {ok ? <Check className="size-5" /> : <X className="size-5" />} {ok ? "Correct" : "Not yet"}
      {note && <span className="text-sm font-normal normal-case tracking-normal text-muted-foreground">{note}</span>}
    </div>
  )
}
