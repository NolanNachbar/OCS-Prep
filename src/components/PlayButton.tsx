import { useEffect, useState } from "react"
import { Square, Volume2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { playClip, stopClip } from "@/lib/clip"
import { useStore } from "@/lib/store"

// A small speaker button: plays the card's recording, tap again to stop.
export default function PlayButton({ id, label }: { id: string; label: string }) {
  const rate = useStore().settings.rate
  const [state, setState] = useState<"idle" | "playing" | "error">("idle")
  useEffect(() => () => { if (state === "playing") stopClip() }, [state])
  const toggle = () => {
    if (state === "playing") { stopClip(); return }
    setState("playing")
    playClip(id, rate, (ok) => setState(ok ? "idle" : "error"))
  }
  return (
    <>
      {state === "error" && <span className="text-sm text-destructive" role="alert">Audio unavailable</span>}
      <Button variant="outline" className="min-h-11 min-w-11 px-0" aria-label={state === "playing" ? `Stop ${label}` : `Hear ${label}`} onClick={toggle}>
        {state === "playing" ? <Square /> : <Volume2 />}
      </Button>
    </>
  )
}
