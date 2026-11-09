import { useMemo } from "react"
import raw from "@/data/cards.json"
import * as L from "./ocs.js"
import { useStore } from "./store"
import type { Card } from "./types"

const BASE = raw as Card[]

// Cards with the user's edits applied, plus the priority study order.
export function useCards() {
  const edits = useStore().edits
  return useMemo(() => {
    const all = BASE.map((c) => (edits[c.id] ? { ...c, answer: edits[c.id], key: edits[c.id] } : c))
    const order: Card[] = L.studyOrder(all)
    const byId = new Map(all.map((c) => [c.id, c]))
    const secIdx = (c: Card) => all.filter((x) => x.sec === c.sec).indexOf(all.find((x) => x.id === c.id)!)
    return { all, order, byId, secIdx }
  }, [edits])
}
