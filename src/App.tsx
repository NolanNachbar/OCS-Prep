import { useState } from "react"
import { BookOpen, Headphones, LayoutList, Settings, Timer } from "lucide-react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Study from "@/screens/Study"
import Test from "@/screens/Test"
import Listen from "@/screens/Listen"
import Cards from "@/screens/Cards"
import More from "@/screens/More"
import { useStore } from "@/lib/store"
import * as L from "@/lib/ocs.js"

const TABS = [
  { v: "study", label: "Study", Icon: BookOpen },
  { v: "test", label: "Test", Icon: Timer },
  { v: "listen", label: "Listen", Icon: Headphones },
  { v: "cards", label: "Cards", Icon: LayoutList },
  { v: "more", label: "More", Icon: Settings },
]

export default function App() {
  const [tab, setTab] = useState("study")
  const { settings } = useStore()
  const days = Math.max(0, L.daysBetween(L.ymd(new Date()), settings.ship))
  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col">
      <header className="flex items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3">
        <div>
          <div className="eyebrow">Appendix B</div>
          <h1 className="slab text-xl font-bold uppercase tracking-[0.12em]">OCS Recite</h1>
        </div>
        <div className="rounded-full border border-gold/60 px-3 py-1 text-xs font-bold uppercase tracking-wider text-gold">{days} days to ship</div>
      </header>
      <main className="flex-1 px-4 pb-28">
        {tab === "study" && <Study />}
        {tab === "test" && <Test />}
        {tab === "listen" && <Listen />}
        {tab === "cards" && <Cards />}
        {tab === "more" && <More />}
        <div className="mt-8 border-t border-border pt-4 text-center text-xs font-bold uppercase tracking-[0.3em] text-muted-foreground">Honor | Courage | Commitment</div>
      </main>
      <Tabs value={tab} onValueChange={setTab} className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <TabsList className="mx-auto grid h-16 w-full max-w-2xl grid-cols-5 rounded-none bg-transparent">
          {TABS.map(({ v, label, Icon }) => (
            <TabsTrigger key={v} value={v} className="h-full flex-col gap-1 text-[0.65rem] font-bold uppercase tracking-wider data-[state=active]:text-gold">
              <Icon className="size-5" />{label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  )
}
