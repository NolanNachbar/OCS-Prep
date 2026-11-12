import { useState } from "react"
import { Button } from "@/components/ui/button"
import { update, useStore } from "@/lib/store"

// After a miss: put the card at the front of Study (the same pin the Cards tab uses). Study picks it up even if a session is open.
export default function PinButton({ id }: { id: string }) {
  const [done, setDone] = useState(false) // Study takes the pin straight away, so the stored list is empty again by the next render
  const added = done || (useStore().pinned || []).includes(id)
  return (
    <Button variant="outline" disabled={added} onClick={() => { setDone(true); update((s) => { s.pinned = [...new Set([...(s.pinned || []), id])]; return s }) }}>
      {added ? "Added to Study" : "Add to my Study cards"}
    </Button>
  )
}
