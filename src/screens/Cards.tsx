import { useState } from "react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { useCards } from "@/lib/cards"
import { hookFor } from "@/lib/hooks"
import { update, useStore } from "@/lib/store"
import type { Card } from "@/lib/types"

export default function Cards({ onTest }: { onTest: () => void }) {
  const store = useStore()
  const { all } = useCards()
  const [edit, setEdit] = useState<Card | null>(null)
  const [val, setVal] = useState("")
  const secs = [...new Set(all.map((c) => c.sec))]
  const runTest = (ids: string[]) => { update((s) => { s.testIds = ids; return s }); onTest() }
  const chip = (c: Card) => {
    const s = store.cards[c.id]
    if (!s) return <Badge variant="outline">new</Badge>
    if (s.misses >= 3 && s.box < 3) return <Badge variant="destructive">weak</Badge>
    return <Badge className={s.box >= 4 ? "bg-ok text-black" : ""}>{s.box >= 4 ? "solid" : `box ${s.box}`}</Badge>
  }
  return (
    <>
      <Accordion type="multiple" className="rounded-md border border-border bg-card/70 px-4">
        {secs.map((sec) => {
          const cs = all.filter((c) => c.sec === sec)
          return (
            <AccordionItem key={sec} value={sec}>
              <AccordionTrigger className="text-base font-bold">{cs[0].secName} ({cs.length})</AccordionTrigger>
              <AccordionContent className="space-y-3">
                <Button size="sm" variant="outline" onClick={() => update((s) => { s.pinned = [...new Set([...(s.pinned || []), ...cs.map((c) => c.id)])]; return s })}>Learn this whole section next</Button>
                <Button size="sm" variant="outline" className="ml-2" onClick={() => runTest(cs.map((c) => c.id))}>Test this section</Button>
                {cs.map((c, i) => (
                  <div key={c.id} className="rounded-md border border-border bg-background/50 p-3">
                    <div className="flex items-center justify-between gap-2"><b>{c.prompt}</b>{chip(c)}</div>
                    <p className="mt-1 text-muted-foreground">{c.answer}</p>
                    {hookFor(c, i) && <p className="mt-2 border-l-2 border-gold pl-2 text-sm">{hookFor(c, i)}</p>}
                    <Button variant={(store.pinned || []).includes(c.id) ? "default" : "outline"} className="mt-2 mr-2" aria-pressed={(store.pinned || []).includes(c.id)}
                      onClick={() => update((s) => { const p = s.pinned || []; s.pinned = p.includes(c.id) ? p.filter((x) => x !== c.id) : [...p, c.id]; return s })}>
                      {(store.pinned || []).includes(c.id) ? "Queued for Study" : "Learn this next"}</Button>
                    <Button variant="outline" className="mt-2 mr-2" onClick={() => runTest([c.id])}>Test this card</Button>
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
          <DialogHeader><DialogTitle>{edit?.prompt}</DialogTitle></DialogHeader>
          <Textarea value={val} onChange={(e) => setVal(e.target.value)} className="min-h-28" />
          <div className="flex gap-3">
            <Button onClick={() => { update((s) => { s.edits[edit!.id] = val; return s }); setEdit(null) }}>Save</Button>
            <Button variant="outline" onClick={() => { update((s) => { delete s.edits[edit!.id]; return s }); setEdit(null) }}>Reset</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
