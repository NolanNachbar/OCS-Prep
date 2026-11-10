import { useState } from "react"
import { Menu, X } from "lucide-react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Study from "@/screens/Study"
import Test from "@/screens/Test"
import Listen from "@/screens/Listen"
import Cards from "@/screens/Cards"
import Ranks from "@/screens/Ranks"
import More from "@/screens/More"
import { useStore } from "@/lib/store"
import * as L from "@/lib/ocs.js"

const TABS = [
  { v: "study", label: "Study", sub: "Learn and review Appendix B" },
  { v: "test", label: "Test", sub: "Ten cards, no hints" },
  { v: "listen", label: "Listen", sub: "Hands-free, for the run" },
  { v: "ranks", label: "Ranks", sub: "Rank pictures, groups and matching" },
  { v: "cards", label: "Cards", sub: "All 135 cards by section" },
  { v: "more", label: "Settings", sub: "Dates, pass mark, your data" },
]

export default function App() {
  const [tab, setTab] = useState("study")
  const [menu, setMenu] = useState(false)
  const go = (v: string) => { setTab(v); setMenu(false); window.scrollTo(0, 0) }
  const { settings } = useStore()
  const days = Math.max(0, L.daysBetween(L.ymd(new Date()), settings.ship))
  const cur = TABS.find((t) => t.v === tab)!
  return (
    <Tabs value={tab} onValueChange={setTab} className="min-h-dvh gap-0">
      <header className="sticky top-0 z-20 bg-black text-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3">
          <button type="button" className="mr-3 -ml-2 flex size-11 shrink-0 items-center justify-center sm:hidden" aria-label="Menu" aria-expanded={menu} onClick={() => setMenu((m) => !m)}>{menu ? <X /> : <Menu />}</button>
          <div className="slab mr-auto text-lg font-bold uppercase leading-tight tracking-[0.14em]">OCS Recite<span className="block font-sans text-xs font-medium tracking-[0.12em] text-[#C6CCD0]">Appendix B trainer</span></div>
          <div className="text-right text-xs font-bold uppercase tracking-[0.16em] text-[#C6CCD0]"><span className="slab block text-2xl leading-none text-gold">{Number.isFinite(days) ? days : "--"}</span>days to ship</div>
        </div>
        {menu && (
          <nav className="border-t border-white/15 sm:hidden">
            {TABS.map(({ v, label }) => (
              <button key={v} type="button" data-nav={v} onClick={() => go(v)} className={`flex h-12 w-full items-center border-l-4 px-4 text-sm font-bold uppercase tracking-[0.14em] ${tab === v ? "border-gold text-white" : "border-transparent text-[#C6CCD0]"}`}>{label}</button>
            ))}
          </nav>
        )}
        <TabsList className="mx-auto hidden h-auto! sm:grid w-full max-w-3xl grid-cols-6 rounded-none border-t border-white/15 bg-transparent p-0">
          {TABS.map(({ v, label }) => (
            <TabsTrigger key={v} value={v} data-nav={v} className="h-12 rounded-none border-0 border-b-4 border-transparent bg-transparent text-[0.78rem] font-bold uppercase tracking-[0.12em] text-[#C6CCD0] shadow-none data-[state=active]:border-gold data-[state=active]:bg-transparent data-[state=active]:text-white">
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
      </header>
      <section className="bg-gradient-to-b from-[#04283a] to-[#03141c] px-4 py-3 text-center text-white">
        <h1 className="slab text-3xl font-bold uppercase leading-none tracking-[0.12em]">{cur.label}</h1>
        <p className="mt-1 text-xs text-[#C6CCD0]">{cur.sub}</p>
      </section>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-4">
        <div hidden={tab !== "study"}><Study /></div>
        {tab === "test" && <Test />}
        {tab === "listen" && <Listen />}
        {tab === "ranks" && <Ranks />}
        {tab === "cards" && <Cards onTest={() => go("test")} />}
        {tab === "more" && <More />}
      </main>
      <footer className="border-t border-white/15 bg-navy-black px-4 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-center text-xs font-bold uppercase tracking-[0.3em] text-[#C6CCD0]">Honor | Courage | Commitment</footer>
    </Tabs>
  )
}
