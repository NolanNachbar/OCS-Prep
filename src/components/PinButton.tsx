import { Button } from "@/components/ui/button"
import { update } from "@/lib/store"

// After a miss: start a Study session on this card (App switches to Study when studyReq is set). No hooks, so nothing can be skipped.
export default function PinButton({ id }: { id: string }) {
  return <Button variant="outline" className="min-h-11" onClick={() => update((s) => { s.studyReq = { ids: [id] }; return s })}>Learn this card</Button>
}
