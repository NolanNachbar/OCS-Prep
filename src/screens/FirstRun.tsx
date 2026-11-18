import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Panel, Eyebrow } from "@/components/shared"
import { getStore, update } from "@/lib/store"

const STEPS = [
  "Learn the card. Read it through until it sounds familiar.",
  "Fill the blanks. Use the slider to raise the difficulty as you get it right.",
  "Recall it from memory. Type the whole thing with nothing on screen.",
]

export default function FirstRun() {
  const [ship, setShip] = useState(getStore().settings.ship)
  const save = (d: string) => update((st) => { st.settings.ship = d; return st })
  const done = () => update((st) => { st.settings.seenIntro = true; return st })
  return (
    <Panel>
      <Eyebrow>How studying works</Eyebrow>
      <p className="mt-2 text-base font-semibold text-gold" data-testid="first-topic">Start with the Phonetic Alphabet: 26 short cards, one word each.</p>
      <ol className="mt-2 space-y-2 text-base">
        {STEPS.map((t, i) => <li key={i} className="flex gap-3"><span className="font-semibold text-gold">{i + 1}</span><span>{t}</span></li>)}
      </ol>
      <label className="mt-4 block text-sm text-muted-foreground">
        Ship date
        <input
          type="date"
          data-testid="ship-date"
          value={ship}
          onChange={(e) => { setShip(e.target.value); if (/^\d{4}-\d{2}-\d{2}$/.test(e.target.value)) save(e.target.value) }}
          className="mt-1 block min-h-11 w-full rounded-lg border border-input bg-transparent px-2.5 text-base text-foreground"
        />
      </label>
      <Button className="mt-4 min-h-11 w-full" onClick={done}>Got it</Button>
    </Panel>
  )
}
