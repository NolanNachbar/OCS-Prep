import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Panel, Eyebrow } from "@/components/shared"
import { Drawing, Insignia, primary, rankName } from "@/components/Insignia"
import { useCards } from "@/lib/cards"
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

type Q = { c: Card; mode: "pic" | "name"; opts: Card[] }

export default function Ranks() {
  const { all } = useCards()
  const rank = useMemo(() => new Map(all.map((c) => [c.id, c])), [all])
  const [quiz, setQuiz] = useState<{ qs: Q[]; i: number; right: number; pick: string | null } | null>(null)

  const make = (pool: Card[]): Q[] => shuffle(pool).map((c) => {
    const wide = pool.filter((x) => x.id !== c.id && x.sec.slice(0, 2) === c.sec.slice(0, 2) && x.sec[2] === c.sec[2])
    const fill = all.filter((x) => x.id !== c.id && x.sec === c.sec && !wide.includes(x))
    const opts = shuffle([c, ...shuffle([...wide, ...fill]).slice(0, 3)])
    return { c, mode: Math.random() < 0.5 ? "pic" : "name", opts }
  })
  const start = (cards: Card[]) => setQuiz({ qs: make(cards), i: 0, right: 0, pick: null })
  const every = all.filter((c) => ["nve", "nvo", "mce", "mco"].includes(c.sec))

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
            <p className="text-muted-foreground">{q.c.answer}</p>
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
        <div className="mt-4 flex flex-wrap gap-3">
          <Button onClick={() => start(every)}>Match all {every.length}</Button>
          <Button variant="outline" onClick={() => start(["nve-116", "nve-117", "nve-118", "nve-119", "mce-126", "mce-127", "mce-128", "mce-129", "mce-130", "mce-131"].map((i) => rank.get(i)!).filter(Boolean))}>Match E-7 to E-9</Button>
        </div>
      </Panel>
      {GROUPS.map((g) => {
        const cs = g.ids.map((i) => rank.get(i)).filter(Boolean) as Card[]
        return (
          <Panel key={g.name}>
            <h3 className="slab text-xl font-bold">{g.name}</h3>
            <p className="mt-1 text-muted-foreground">Pattern: {g.note}</p>
            <div className="mt-3 divide-y divide-border">
              {cs.map((c) => (
                <div key={c.id} className="py-4 first:pt-0">
                  <h4 className="slab text-lg font-bold">{c.prompt}</h4>
                  <Insignia card={c} />
                  <p className="mt-2 text-[0.95rem]">{c.answer}</p>
                </div>
              ))}
            </div>
            <Button className="mt-4" variant="outline" onClick={() => start(cs)}>Match this group</Button>
          </Panel>
        )
      })}
    </div>
  )
}
