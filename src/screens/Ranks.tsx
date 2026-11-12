import { useMemo, useState } from "react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Panel, Eyebrow } from "@/components/shared"
import { Drawing, Insignia, primary, rankName } from "@/components/Insignia"
import RankRecall from "@/screens/RankRecall"
import RankWords from "@/screens/RankWords"
import Inspection from "@/screens/Inspection"
import { lines } from "@/lib/blanks"
import { useCards } from "@/lib/cards"
import { useStore } from "@/lib/store"
import * as L from "@/lib/ocs.js"
import type { Card } from "@/lib/types"

const shuffle = <T,>(a: T[]) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]] } return b }
const ids = (p: string, a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => `${p}-${String(a + i).padStart(3, "0")}`)

// Learn ranks as patterns, then drill only the exceptions (Appendix B/C study notes, Navy CWO guide).
const GROUPS: { name: string; note: string; ids: string[] }[] = [
  { name: "Navy officers: bars", note: "O-1 gold bar, O-2 silver bar, O-3 two silver bars.", ids: ids("nvo", 84, 86) },
  { name: "Navy officers: leaf and eagle", note: "O-4 gold oak leaf, O-5 silver oak leaf, O-6 silver eagle.", ids: ids("nvo", 87, 89) },
  { name: "Navy officers: stars", note: "O-7 to O-11 are one to five silver stars. Count them.", ids: ids("nvo", 90, 94) },
  { name: "Navy warrant officers", note: "W-1 and W-2 gold, W-3 and W-4 silver. Two or three blue breaks, W-5 is the thin blue line. Exceptions, so drill these.", ids: ids("nvo", 79, 83) },
  { name: "Marine officers: bars, leaf, eagle", note: "The Marine Corps copies the Navy collar devices from O-1 to O-6.", ids: ids("mco", 100, 105) },
  { name: "Marine officers: stars", note: "O-7 to O-10 are one to four silver stars.", ids: ids("mco", 106, 109) },
  { name: "Marine warrant officers", note: "Red background. Gold breaks for W-1 and W-2, silver for W-3 and W-4, W-5 is a silver bar with a thin red break.", ids: ids("mco", 95, 99) },
  { name: "Navy enlisted: E-1 to E-3", note: "No insignia, then two and three diagonal stripes.", ids: ids("nve", 110, 112) },
  { name: "Navy enlisted: petty officers", note: "An eagle over one, two or three chevrons.", ids: ids("nve", 113, 115) },
  { name: "Navy enlisted: chiefs", note: "Same anchor, plus zero, one or two stars. The MCPON has three. E-7 to E-9 get asked most.", ids: ids("nve", 116, 119) },
  { name: "Marine enlisted: stripes", note: "Private nothing, PFC one stripe, then stripes over crossed rifles: one, two, three.", ids: ids("mce", 120, 124) },
  { name: "Marine enlisted: rockers", note: "Three stripes over crossed rifles, plus one, two or three rockers.", ids: ids("mce", 125, 127) },
  { name: "Marine enlisted: E-8 and E-9", note: "The confusable ones. First Sergeant has a diamond, Master Gunnery Sergeant a bursting bomb, Sergeant Major a star.", ids: ids("mce", 128, 131) },
]

// The four big categories; each holds the pattern groups above (indexes into GROUPS), lowest rank to highest. Learn next follows this order.
const SECTIONS = [
  { name: "Navy enlisted", groups: [7, 8, 9] },
  { name: "Navy officers", groups: [3, 0, 1, 2] },
  { name: "Marine enlisted", groups: [10, 11, 12] },
  { name: "Marine officers", groups: [6, 4, 5] },
]

type Q = { c: Card; mode: "pic" | "name"; opts: Card[] }

export default function Ranks() {
  const { all } = useCards()
  const rank = useMemo(() => new Map(all.map((c) => [c.id, c])), [all])
  const store = useStore()
  const [rec, setRec] = useState<{ cards: Card[]; teach: boolean } | null>(null)
  const [open, setOpen] = useState<string[]>([])
  const [mode, setMode] = useState<"words" | "insp" | null>(null)
  const day = L.ymd(new Date())
  const learned = (c: Card) => (store.cards[c.id]?.reps ?? 0) > 0
  const [quiz, setQuiz] = useState<{ qs: Q[]; i: number; right: number; pick: string | null } | null>(null)

  const make = (pool: Card[]): Q[] => shuffle(pool).map((c) => {
    const wide = pool.filter((x) => x.id !== c.id && x.sec.slice(0, 2) === c.sec.slice(0, 2) && x.sec[2] === c.sec[2])
    const fill = all.filter((x) => x.id !== c.id && x.sec === c.sec && !wide.includes(x))
    const opts = shuffle([c, ...shuffle([...wide, ...fill]).slice(0, 3)])
    return { c, mode: Math.random() < 0.5 ? "pic" : "name", opts }
  })
  const start = (cards: Card[]) => setQuiz({ qs: make(cards), i: 0, right: 0, pick: null })
  const every = all.filter((c) => ["nve", "nvo", "mce", "mco"].includes(c.sec))

  if (mode === "words") return <RankWords cards={every} onExit={() => setMode(null)} />
  if (mode === "insp") return <Inspection pool={every} title="Rank inspection" onExit={() => setMode(null)} />
  if (rec) return <RankRecall cards={rec.cards} teach={rec.teach} onExit={() => setRec(null)} />

  const groupCards = (g: (typeof GROUPS)[number]) => g.ids.map((i) => rank.get(i)).filter(Boolean) as Card[]
  const next = SECTIONS.flatMap((x) => x.groups).map((gi) => GROUPS[gi]).find((g) => groupCards(g).some((c) => !learned(c)))
  const due = every.filter((c) => learned(c) && store.cards[c.id].due <= day)
  const nLearned = every.filter(learned).length

  if (quiz) {
    if (quiz.i >= quiz.qs.length) {
      return (
        <Panel>
          <Eyebrow>Match complete</Eyebrow>
          <h2 className="slab mt-2 text-3xl font-bold">{quiz.right} of {quiz.qs.length}</h2>
          <Button className="mt-5" onClick={() => setQuiz(null)}>Done</Button>
        </Panel>
      )
    }
    const q = quiz.qs[quiz.i]
    const answered = quiz.pick !== null
    const choose = (id: string) => { if (!answered) setQuiz({ ...quiz, pick: id, right: quiz.right + (id === q.c.id ? 1 : 0) }) }
    return (
      <Panel>
        <Eyebrow>Match {quiz.i + 1} of {quiz.qs.length}</Eyebrow>
        {q.mode === "pic" ? (
          <>
            <h2 className="slab mt-3 mb-3 text-xl font-bold">Which rank is this?</h2>
            <Drawing key={q.c.id} card={q.c} view={primary(q.c)} className="mb-4 size-36" label="Insignia" />
            <div className="grid gap-3">
              {q.opts.map((o) => (
                <Button key={o.id} variant={answered && o.id === q.c.id ? "default" : "outline"} className={`h-auto min-h-12 justify-start whitespace-normal py-3 text-left ${answered && quiz.pick === o.id && o.id !== q.c.id ? "border-destructive text-destructive" : ""}`} onClick={() => choose(o.id)}>
                  {rankName(o)}
                </Button>
              ))}
            </div>
          </>
        ) : (
          <>
            <h2 className="slab mt-3 mb-3 text-2xl font-bold">{rankName(q.c)}</h2>
            <p className="mb-3 text-muted-foreground">Tap the matching insignia.</p>
            <div className="grid grid-cols-2 gap-3">
              {q.opts.map((o, n) => (
                <button key={o.id} type="button" onClick={() => choose(o.id)} aria-label={`Option ${n + 1}`}
                  className={`border-2 p-1 ${answered && o.id === q.c.id ? "border-gold" : answered && quiz.pick === o.id ? "border-destructive" : "border-border"}`}>
                  <Drawing key={o.id} card={o} view={primary(o)} className="aspect-square w-full" label="Insignia" />
                </button>
              ))}
            </div>
          </>
        )}
        {answered && (
          <div className="mt-4">
            <p className={quiz.pick === q.c.id ? "text-ok" : "text-destructive"}>{quiz.pick === q.c.id ? "Correct." : "Not that one."}</p>
            <p className="mt-1 font-bold">{q.c.prompt}: {rankName(q.c)}</p>
            <p className="whitespace-pre-line text-muted-foreground">{lines(q.c.answer)}</p>
            <Insignia card={q.c} />
            <Button className="mt-4" onClick={() => setQuiz({ ...quiz, i: quiz.i + 1, pick: null })} autoFocus>Next</Button>
          </div>
        )}
      </Panel>
    )
  }

  return (
    <div className="space-y-4">
      <Panel>
        <Eyebrow>Ranks</Eyebrow>
        <h2 className="slab mt-2 text-2xl font-bold">Learn them in groups, then match them</h2>
        <p className="mt-1 text-muted-foreground">Each rank shows its Appendix B wording exactly, with the collar and sleeve side by side. Pictures come from Wikimedia Commons (credits under Settings); a rank without one shows a drawing from the wording. Rank by rank: Navy officers, Marine officers, Navy enlisted, Marine enlisted. E-7 to E-9 in both services get asked the most.</p>
        <p className="mt-3 font-bold">{nLearned} of {every.length} ranks learned</p>
        <div className="mt-3 flex flex-wrap gap-3">
          {next && <Button className="h-auto min-h-9 max-w-full whitespace-normal py-2 text-left" onClick={() => { setOpen([]); setRec({ cards: groupCards(next), teach: true }) }}>Learn next: {next.name}</Button>}
          {due.length > 0 && <Button variant="outline" onClick={() => setRec({ cards: due, teach: false })}>Review {due.length} due</Button>}
        </div>
        <p className="mt-3 text-muted-foreground">How it works: Learn walks you through a group (picture, title, exact wording), then asks you to type the title from the picture and the wording from the title. Anything you miss comes back until you get it twice in a row, then it joins your review schedule. Match is only a warm-up. Open a category below and work through its groups top to bottom.</p>
        <div className="mt-3 flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => start(every)}>Match all {every.length}</Button>
          <Button variant="outline" onClick={() => setMode("words")}>Match by words (no pictures)</Button>
          <Button variant="outline" onClick={() => setMode("insp")}>Rank inspection (timed)</Button>
          <Button variant="outline" onClick={() => start(["nve-116", "nve-117", "nve-118", "nve-119", "mce-126", "mce-127", "mce-128", "mce-129", "mce-130", "mce-131"].map((i) => rank.get(i)!).filter(Boolean))}>Match E-7 to E-9</Button>
        </div>
      </Panel>
      <Accordion type="multiple" value={open} onValueChange={setOpen} className="rounded-md border border-border bg-card/70 px-4">
        {SECTIONS.map((sec) => {
          const all2 = sec.groups.flatMap((gi) => groupCards(GROUPS[gi]))
          return (
            <AccordionItem key={sec.name} value={sec.name}>
              <AccordionTrigger className="items-center text-left">
                <span><span className="slab block text-xl font-bold">{sec.name}</span><span className="block text-sm font-normal text-muted-foreground">{all2.filter(learned).length} of {all2.length} learned</span></span>
              </AccordionTrigger>
              <AccordionContent className="space-y-6">
                {sec.groups.map((gi) => {
                  const g = GROUPS[gi]
                  const cs = groupCards(g)
                  return (
                    <div key={g.name}>
                      <h3 className="slab text-lg font-bold">{g.name}</h3>
                      <p className="mt-1 text-muted-foreground">Pattern: {g.note}</p>
                      <Accordion type="multiple" className="mt-2">
                        {cs.map((c) => (
                          <AccordionItem key={c.id} value={c.id}>
                            <AccordionTrigger className="items-center text-left">
                              <span><span className="slab block text-base font-bold">{c.prompt}{learned(c) ? " (learned)" : ""}</span><span className="block text-sm font-normal text-muted-foreground">{rankName(c)}</span></span>
                            </AccordionTrigger>
                            <AccordionContent>
                              <Insignia card={c} compact />
                              <p className="mt-2 whitespace-pre-line text-[0.95rem]">{lines(c.answer)}</p>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                      <div className="mt-3 flex flex-wrap gap-3">
                        <Button onClick={() => setRec({ cards: cs, teach: true })}>Learn this group</Button>
                        <Button variant="outline" onClick={() => start(cs)}>Match</Button>
                      </div>
                    </div>
                  )
                })}
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>
    </div>
  )
}
