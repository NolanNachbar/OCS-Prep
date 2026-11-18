import { lines } from "@/lib/blanks"
import { useState } from "react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import * as L from "@/lib/ocs.js"
import { Insignia } from "@/components/Insignia"
import { useCards } from "@/lib/cards"
import { hookFor } from "@/lib/hooks"
import { showIntro, update, useStore } from "@/lib/store"
import FirstRun from "@/screens/FirstRun"
import type { Card } from "@/lib/types"

export default function Cards({ onTest }: { onTest: () => void }) {
  const store = useStore()
  const { all } = useCards()
  const [edit, setEdit] = useState<Card | null>(null)
  const [val, setVal] = useState("")
  const secs = [...new Set(all.map((c) => c.sec))]
  const runTest = (ids: string[]) => { update((s) => { s.testIds = ids; return s }); onTest() }
  const learn = (ids: string[]) => update((s) => { s.studyReq = { ids }; return s }) // App switches to Study
  const chip = (c: Card) => {
    const s = store.cards[c.id]
    if (!s) return <Badge variant="outline">new</Badge>
    if (s.misses >= 3 && s.box < 3) return <Badge variant="destructive">weak</Badge>
    const d = s.due ? L.daysBetween(L.ymd(new Date()), s.due) : 0
    const when = d <= 0 ? "due today" : d === 1 ? "due tomorrow" : `due in ${d}d`
    return <Badge className={s.box >= 4 ? "bg-ok text-black" : ""}>{s.box >= 4 ? `solid, ${when}` : when}</Badge>
  }
  return (
    <>
      {showIntro(store) && <div className="mb-4"><FirstRun /></div>}
      <Accordion type="multiple" className="rounded-md border border-border bg-card/70 px-4">
        {secs.map((sec) => {
          const cs = all.filter((c) => c.sec === sec)
          return (
            <AccordionItem key={sec} value={sec}>
              <AccordionTrigger className="text-base font-bold uppercase tracking-wider">{cs[0].secName} ({cs.length})</AccordionTrigger>
              <AccordionContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" className="min-h-11" onClick={() => learn(cs.map((c) => c.id))}>Learn this section</Button>
                  <Button variant="outline" className="min-h-11" onClick={() => runTest(cs.map((c) => c.id))}>Test this section</Button>
                </div>
                {cs.map((c, i) => (
                  <div key={c.id} className="rounded-md border border-border bg-background/50 p-3">
                    <div className="flex items-center justify-between gap-2"><b>{c.prompt}</b>{chip(c)}</div>
                    <p className="mt-1 whitespace-pre-line text-muted-foreground">{lines(c.answer)}</p>
                    <Insignia card={c} />
                    {hookFor(c, i) && <p className="mt-2 border-l-2 border-gold pl-2 text-sm">{hookFor(c, i)}</p>}
                    <Button variant="outline" className="mt-2 mr-2 min-h-11" onClick={() => learn([c.id])}>Learn this</Button>
                    <Button variant="outline" className="mt-2 mr-2 min-h-11" onClick={() => runTest([c.id])}>Test this card</Button>
                    {c.sec === "chain" && <Button size="sm" variant="outline" className="mt-2" onClick={() => { setEdit(c); setVal(store.edits[c.id] || c.answer) }}>Edit</Button>}
                  </div>
                ))}
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader className="pr-10"><DialogTitle>{edit?.prompt}</DialogTitle></DialogHeader>
          <Textarea value={val} onChange={(e) => setVal(e.target.value)} autoCapitalize="none" autoCorrect="off" spellCheck={false} aria-label="Card text" className="min-h-28" />
          <div className="flex gap-3">
            <Button onClick={() => { update((s) => { s.edits[edit!.id] = val; return s }); setEdit(null) }}>Save</Button>
            <Button variant="outline" onClick={() => { update((s) => { delete s.edits[edit!.id]; return s }); setEdit(null) }}>Reset</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
