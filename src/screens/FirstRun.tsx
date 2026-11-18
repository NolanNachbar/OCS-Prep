import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Panel, Eyebrow } from "@/components/shared"
import { getStore, update } from "@/lib/store"

const LINES = [
  "Every Appendix B card, by section. Pick something to study, or tap Learn this on any card.",
  "The blanks fade as you learn: read it, fill in more and more words, then say it from memory.",
  "Test yourself any time with Test, or listen hands-free with Listen.",
]

export default function FirstRun() {
  const [ship, setShip] = useState(getStore().settings.ship)
  const save = (d: string) => update((st) => { st.settings.ship = d; return st })
  const done = () => update((st) => { st.settings.seenIntro = true; return st })
  return (
    <Panel>
      <Eyebrow>Start here</Eyebrow>
      <ul className="mt-2 space-y-2 text-base">
        {LINES.map((t, i) => <li key={i}>{t}</li>)}
      </ul>
      <p className="mt-2 text-base font-semibold text-gold" data-testid="first-topic">Not sure where to begin? The Study tab suggests the Phonetic Alphabet first: 26 short cards, one word each.</p>
      <label className="mt-4 block min-w-0 text-sm text-muted-foreground">
        Ship date
        <input
          type="date"
          data-testid="ship-date"
          value={ship}
          onChange={(e) => { setShip(e.target.value); if (/^\d{4}-\d{2}-\d{2}$/.test(e.target.value)) save(e.target.value) }}
          className="mt-1 block h-12 w-full min-w-0 max-w-full appearance-none rounded-lg border border-input bg-transparent px-2.5 py-0 text-base leading-[46px] text-foreground"
        />
      </label>
      <Button className="mt-4 min-h-11 w-full" onClick={done}>Got it</Button>
    </Panel>
  )
}
