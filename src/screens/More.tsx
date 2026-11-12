import credits from "@/data/rank-credits.json"
import { useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Eyebrow, Panel } from "@/components/shared"
import { getStore, replace, reset, update, useStore } from "@/lib/store"
import { SPEEDS } from "@/lib/speech"

export default function More() {
  const { settings: st, log } = useStore()
  const file = useRef<HTMLInputElement>(null)
  const set = (k: string, v: string | number) => update((s) => { (s.settings as Record<string, unknown>)[k] = v; return s })
  const exportJson = () => {
    const a = document.createElement("a")
    a.href = URL.createObjectURL(new Blob([JSON.stringify(getStore(), null, 1)], { type: "application/json" }))
    a.download = "ocsprep-progress.json"; a.click()
  }
  const importJson = async (f?: File) => {
    if (!f) return
    try {
      const data = JSON.parse(await f.text())
      if (!data || typeof data.cards !== "object" || data.cards === null) throw new Error("not a progress file")
      if (confirm("Replace all progress on this device with this file?")) replace(data)
    } catch { alert("That file is not an OCS Recite progress export.") }
    if (file.current) file.current.value = ""
  }
  return (
    <div className="space-y-4">
      <Panel>
        <Eyebrow>Settings</Eyebrow>
        <div className="mt-4 grid gap-4">
          <div className="grid gap-2"><Label htmlFor="ship">Ship date</Label><Input id="ship" type="date" value={st.ship} onChange={(e) => { if (e.target.value) set("ship", e.target.value) }} className="h-12" /></div>
          <div className="grid gap-2"><Label htmlFor="npd">New cards per day</Label><Input id="npd" type="number" min={1} max={30} value={st.newPerDay} onChange={(e) => set("newPerDay", Math.max(1, +e.target.value || 1))} className="h-12" /></div>
          <div className="grid gap-2"><Label htmlFor="mr">Max reviews per session</Label><Input id="mr" type="number" min={10} max={200} value={st.maxReviews ?? 60} onChange={(e) => set("maxReviews", Math.max(10, +e.target.value || 60))} className="h-12" /></div>
          <div className="grid gap-2"><Label>Voice and Listen speed</Label>
            <Select value={String(st.rate)} onValueChange={(v) => set("rate", +v)}>
              <SelectTrigger className="h-12! w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{SPEEDS.map((r) => <SelectItem key={r} value={String(r)}>{r}x</SelectItem>)}</SelectContent>
            </Select></div>
        </div>
      </Panel>
      <Panel>
        <Eyebrow>Last 7 days</Eyebrow>
        <ul className="mt-3 space-y-1 text-muted-foreground">
          {log.slice(-7).reverse().map((e) => <li key={e.d}>{e.d}: {e.ok} of {e.n} correct</li>)}
          {log.length === 0 && <li>Nothing yet.</li>}
        </ul>
      </Panel>
      <Panel>
        <Eyebrow>Your data</Eyebrow>
        <p className="mt-2 text-sm text-muted-foreground">Progress lives on this device only. Export it to move between phone and laptop.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button variant="outline" onClick={exportJson}>Export</Button>
          <Button variant="outline" onClick={() => file.current?.click()}>Import</Button>
          <Button variant="destructive" onClick={() => { if (confirm("Erase all progress on this device?")) reset() }}>Reset</Button>
          <input ref={file} type="file" accept="application/json" hidden onChange={(e) => importJson(e.target.files?.[0])} />
        </div>
      </Panel>
      <Panel>
        <Eyebrow>About</Eyebrow>
        <p className="mt-2 text-xs text-muted-foreground">Build {__BUILD__}</p>
        <p className="mt-2 text-muted-foreground">A personal study aid. It is not affiliated with or endorsed by the U.S. Navy or any government agency. Check every card against the current official Appendix B from your class before relying on it. Source document: <a className="underline" href="https://www.netc.navy.mil/Portals/46/NSTC/OTCN/docs/OCR%20Appendix%20B.pdf" target="_blank" rel="noreferrer">NETC Appendix B (PDF)</a>.</p>
        <h3 className="slab mt-4 text-lg font-bold">Insignia image credits</h3>
        <p className="mt-1 text-muted-foreground">Rank images are from Wikimedia Commons and were resized. Most are public domain. These are licensed <a className="underline" href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">CC BY-SA 4.0</a>:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          {[...new Map(Object.values(credits).map((c) => [c.file, c])).values()].map((c) => (
            <li key={c.file}><a className="underline" href={`https://commons.wikimedia.org/wiki/File:${encodeURIComponent(c.file.replace(/ /g, "_"))}`} target="_blank" rel="noreferrer">{c.file}</a> by {c.author}</li>
          ))}
        </ul>
      </Panel>
    </div>
  )
}
