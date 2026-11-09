import { useState } from "react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { useCards } from "@/lib/cards"
import { update, useStore } from "@/lib/store"
import type { Card } from "@/lib/types"

export default function Cards() {
  const store = useStore()
  const { all } = useCards()
  const [edit, setEdit] = useState<Card | null>(null)
  const [val, setVal] = useState("")
  const secs = [...new Set(all.map((c) => c.sec))]
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
              <AccordionTrigger className="text-base font-bold uppercase tracking-wider">{cs[0].secName} ({cs.length})</AccordionTrigger>
              <AccordionContent className="space-y-3">
                {cs.map((c) => (
                  <div key={c.id} className="rounded-md border border-border bg-background/50 p-3">
                    <div className="flex items-center justify-between gap-2"><b>{c.prompt}</b>{chip(c)}</div>
                    <p className="mt-1 text-muted-foreground">{c.answer}</p>
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
