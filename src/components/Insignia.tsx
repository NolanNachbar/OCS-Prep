import { useState, type ReactNode } from "react"
import rankFiles from "@/data/rank-files.json"

const RANK_FILES = new Set<string>(rankFiles)
import type { Card } from "@/lib/types"

// Diagrams drawn from the Appendix B wording, not copies of the official art.
const GOLD = "#D9AE32"
const SILVER = "#C4CAD0"
const BLUE = "#1E4D9B"
const RED = "#B3202A"
const NUM: Record<string, number> = { one: 1, a: 1, an: 1, two: 2, three: 3, four: 4, five: 5 }

const count = (t: string) => { const m = /\b(one|two|three|four|five|a|an)\b/i.exec(t); return m ? NUM[m[1].toLowerCase()] : 1 }
const metal = (t: string) => (/silver/i.test(t) ? SILVER : GOLD)
const clause = (card: Card, key: string) => new RegExp(key + ": (.*?)(?= (?:Collar|Shoulder board|Sleeve):|$)").exec(card.answer)?.[1] ?? ""

export const rankName = (c: Card) => c.answer.split(/ (?:Collar|Insignia):/)[0]
export const hasInsignia = (c: Card) => ["nve", "nvo", "mce", "mco"].includes(c.sec)

function Star({ x, y, r, fill }: { x: number; y: number; r: number; fill: string }) {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.4 : r
    return `${(x + rr * Math.cos(a)).toFixed(1)},${(y + rr * Math.sin(a)).toFixed(1)}`
  }).join(" ")
  return <polygon points={pts} fill={fill} />
}

const Eagle = ({ y, fill }: { y: number; fill: string }) => (
  <g transform={`translate(0,${y})`} fill={fill}>
    <path d="M-25.0 -20.2 L-23.9 -17.9 L-23.2 -17.1 L-21.9 -16.1 L-22.0 -15.3 L-19.8 -13.6 L-19.7 -13.3 L-20.0 -12.8 L-20.0 -12.5 L-18.4 -11.2 L-19.2 -10.3 L-19.2 -9.7 L-18.4 -8.7 L-19.0 -8.0 L-19.2 -7.3 L-18.8 -6.7 L-18.3 -6.5 L-18.9 -5.7 L-19.0 -5.3 L-18.7 -4.8 L-18.1 -4.7 L-18.4 -3.9 L-18.4 -3.1 L-18.1 -2.8 L-17.3 -2.6 L-17.8 -1.4 L-17.6 -0.9 L-16.7 -0.7 L-16.9 -0.1 L-16.8 0.5 L-15.6 1.2 L-15.7 2.4 L-15.0 2.7 L-14.4 2.6 L-14.3 2.8 L-14.4 3.7 L-14.2 4.1 L-13.7 4.4 L-12.9 4.2 L-12.7 5.2 L-12.4 5.6 L-11.7 5.6 L-11.0 5.4 L-10.5 6.7 L-10.0 6.7 L-9.3 6.5 L-9.1 6.7 L-8.7 7.5 L-8.4 7.7 L-7.5 7.5 L-6.8 8.3 L-6.5 8.5 L-5.8 8.2 L-5.5 8.3 L-5.6 13.0 L-5.8 13.2 L-10.8 13.2 L-10.9 16.0 L-10.8 16.2 L-5.3 16.2 L-5.1 16.4 L-5.2 17.2 L-5.0 17.4 L-4.4 17.4 L-4.2 18.2 L-4.0 18.3 L-3.2 18.3 L-2.9 19.1 L-2.6 19.2 L-2.0 18.9 L-1.9 19.5 L-1.5 19.9 L-1.0 19.9 L-0.3 19.3 L0.0 19.9 L0.6 20.2 L0.9 20.0 L1.3 19.2 L2.0 19.9 L2.5 19.9 L3.0 19.0 L3.6 19.3 L4.0 19.3 L4.2 18.5 L4.4 18.3 L4.9 18.5 L5.3 18.4 L5.4 17.4 L6.3 17.2 L6.6 16.8 L6.6 16.3 L6.8 16.2 L12.0 16.1 L11.9 13.2 L7.1 13.2 L6.8 13.0 L6.8 8.5 L7.8 8.1 L8.2 7.7 L8.5 6.9 L9.7 6.9 L10.2 5.9 L10.8 6.1 L11.4 6.0 L11.9 4.8 L13.1 4.9 L13.4 4.7 L13.9 3.5 L14.7 3.6 L15.1 3.2 L15.4 2.3 L16.0 2.3 L16.3 2.0 L16.5 1.8 L16.4 0.6 L17.3 0.2 L17.5 -0.1 L17.1 -1.1 L17.7 -1.4 L18.1 -1.8 L17.6 -2.8 L18.4 -3.4 L18.4 -4.0 L17.9 -4.7 L18.8 -5.6 L18.7 -6.1 L18.3 -6.7 L18.8 -7.3 L18.9 -7.9 L18.3 -8.7 L19.0 -9.6 L19.0 -10.3 L18.4 -10.9 L18.4 -11.2 L20.0 -12.5 L20.2 -13.0 L20.0 -13.6 L22.1 -15.5 L22.2 -15.9 L22.1 -16.5 L23.9 -18.1 L24.4 -18.8 L24.9 -20.1 L22.3 -19.6 L17.6 -17.5 L12.9 -14.7 L9.6 -12.1 L7.8 -10.0 L7.1 -8.5 L7.2 -7.5 L8.2 -6.2 L8.7 -5.0 L8.8 -4.1 L8.6 -3.3 L7.0 -1.8 L6.1 -1.4 L5.3 -1.2 L5.1 -1.5 L5.1 -2.2 L4.8 -3.1 L4.2 -3.9 L4.4 -7.9 L4.2 -9.8 L3.7 -11.1 L2.6 -12.3 L1.1 -12.7 L-1.9 -12.6 L-4.4 -11.8 L-5.5 -11.1 L-6.1 -9.9 L-5.9 -9.4 L-5.6 -9.2 L-4.9 -9.5 L-2.7 -8.7 L-2.0 -8.1 L-1.9 -7.3 L-2.5 -6.4 L-5.3 -3.7 L-6.1 -2.5 L-6.1 -2.0 L-6.3 -1.8 L-7.4 -2.9 L-8.0 -4.1 L-8.0 -5.8 L-7.1 -7.7 L-7.2 -8.9 L-7.8 -9.8 L-9.2 -11.5 L-13.1 -14.6 L-18.9 -18.3 L-22.0 -19.7Z" />
  </g>
)
const Anchor = ({ y }: { y: number }) => (
  <g transform={`translate(0,${y})`} stroke={GOLD} strokeWidth="3.5" fill="none" strokeLinecap="round">
    <circle cx="0" cy="-17" r="4" /><line x1="0" y1="-13" x2="0" y2="17" /><line x1="-9" y1="-8" x2="9" y2="-8" />
    <path d="M-17 5 Q0 27 17 5" /><text x="0" y="6" textAnchor="middle" fontSize="9" fontWeight="700" fill={SILVER} stroke="none">USN</text>
  </g>
)
const Leaf = ({ fill }: { fill: string }) => (
  <g transform="translate(60,58)" fill={fill}>
    <path d="M0 -34 C10 -28 22 -26 18 -14 C30 -10 28 6 14 8 C20 20 6 28 0 24 C-6 28 -20 20 -14 8 C-28 6 -30 -10 -18 -14 C-22 -26 -10 -28 0 -34 Z" />
    <rect x="-1.5" y="22" width="3" height="14" />
  </g>
)

type Layer = { h: number; node: (y: number) => ReactNode }

// One row per described item, top to bottom ("A above B" puts A on top; "A below B" puts A underneath).
function rating(text: string): Layer[] {
  const seps = text.match(/\s+(above|over|below)\s+/g) || []
  let toks = text.replace(/ with a gold star specialty mark/, "").split(/\s+(?:above|over|below)\s+/)
  if (seps.some((s) => /below/.test(s))) toks = toks.reverse()
  const out: Layer[] = []
  for (const t of toks) {
    const n = count(t), col = metal(t)
    if (/none/i.test(t)) continue
    if (/anchor/i.test(t)) out.push({ h: 40, node: (y) => <Anchor y={y + 20} /> })
    else if (/emblem/i.test(t)) out.push({ h: 28, node: (y) => <g key={y}><circle cx="0" cy={y + 14} r="11" fill="none" stroke={GOLD} strokeWidth="3" /><path d={`M0 ${y + 7} V${y + 21} M-5 ${y + 11} H5`} stroke={GOLD} strokeWidth="2.5" /><Star x={-24} y={y + 14} r={8} fill={GOLD} /><Star x={24} y={y + 14} r={8} fill={GOLD} /></g> })
    else if (/star/i.test(t)) out.push({ h: 20, node: (y) => <g key={y}>{Array.from({ length: n }, (_, i) => <Star key={i} x={(i - (n - 1) / 2) * 20} y={y + 10} r={9} fill={col} />)}</g> })
    else if (/eagle/i.test(t)) out.push({ h: 41, node: (y) => <Eagle y={y + 20.5} fill={col} /> })
    else if (/rocker/i.test(t)) out.push({ h: (n - 1) * 9 + 12, node: (y) => <g key={y} stroke={col} strokeWidth="4.5" fill="none" strokeLinecap="round">{Array.from({ length: n }, (_, i) => <path key={i} d={`M-26 ${y + 2 + i * 9} Q0 ${y + 12 + i * 9} 26 ${y + 2 + i * 9}`} />)}</g> })
    else if (/chevron|stripe/i.test(t)) out.push({ h: (n - 1) * 9 + 14, node: (y) => <g key={y} stroke={col} strokeWidth="5" fill="none" strokeLinejoin="round">{Array.from({ length: n }, (_, i) => <polyline key={i} points={`-26,${y + 12 + i * 9} 0,${y + 2 + i * 9} 26,${y + 12 + i * 9}`} />)}</g> })
    else if (/rifles/i.test(t)) out.push({ h: 30, node: (y) => <g key={y} stroke={GOLD} strokeWidth="4" strokeLinecap="round"><line x1="-18" y1={y + 3} x2="18" y2={y + 27} /><line x1="18" y1={y + 3} x2="-18" y2={y + 27} /></g> })
    else if (/diamond/i.test(t)) out.push({ h: 24, node: (y) => <polygon key={y} points={`0,${y} 12,${y + 12} 0,${y + 24} -12,${y + 12}`} fill={GOLD} /> })
    else if (/bomb/i.test(t)) out.push({ h: 28, node: (y) => <g key={y} stroke={GOLD} strokeWidth="2.5"><circle cx="0" cy={y + 14} r="8" fill={GOLD} />{Array.from({ length: 8 }, (_, i) => { const a = (i * Math.PI) / 4; return <line key={i} x1={11 * Math.cos(a)} y1={y + 14 + 11 * Math.sin(a)} x2={14 * Math.cos(a)} y2={y + 14 + 14 * Math.sin(a)} /> })}</g> })
  }
  return out
}

function stack(layers: Layer[]) {
  const gap = 4, total = layers.reduce((s, l) => s + l.h, 0) + gap * Math.max(0, layers.length - 1)
  const k = Math.min(1, 104 / (total || 1))
  let y = 0
  return (
    <g transform={`translate(60,${(120 - total * k) / 2}) scale(${k})`}>
      {layers.map((l, i) => { const node = l.node(y); y += l.h + gap; return <g key={i}>{node}</g> })}
    </g>
  )
}

const WIDTH = (t: string) => (/2-inch/.test(t) ? 14 : /1\/2-inch/.test(t) ? 8 : /1\/4-inch/.test(t) ? 4.5 : 2.6)

function sleeveOfficer(text: string) {
  const toks = text.split(/\s+below\s+/).reverse() // the text runs bottom to top
  const layers: Layer[] = toks.map((t) => {
    if (/star/i.test(t)) return { h: 22, node: (y: number) => <Star key={y} x={0} y={y + 11} r={11} fill={GOLD} /> }
    if (/specialty/i.test(t)) return { h: 18, node: (y: number) => <circle key={y} cx="0" cy={y + 9} r="8" fill="none" stroke={GOLD} strokeWidth="2" strokeDasharray="3 2" /> }
    const n = /stripes/.test(t) ? count(t) : 1, w = WIDTH(t), breaks = /breaks?/.test(t) ? count(/with (\w+) blue/i.exec(t)?.[1] ?? "one") : 0
    return {
      h: n * w + (n - 1) * 3,
      node: (y: number) => <g key={y}>{Array.from({ length: n }, (_, i) => {
        const yy = y + i * (w + 3)
        return <g key={i}><rect x="-36" y={yy} width="72" height={w} fill={GOLD} />
          {Array.from({ length: breaks }, (_, b) => <rect key={b} x={-36 + ((b + 1) * 72) / (breaks + 1) - 3} y={yy} width="6" height={w} fill={BLUE} />)}</g>
      })}</g>,
    }
  })
  return stack(layers)
}

function collarOfficer(card: Card, t: string) {
  const warrantNavy = /break|blue line/i.test(t) && card.sec === "nvo", usmcWarrant = card.sec === "mco" && /break/i.test(t)
  if (warrantNavy) {
    const n = /blue line/i.test(t) ? 0 : count(t.replace(/^\w+ bar with /i, "")), col = metal(t)
    return <g><rect x="12" y="46" width="96" height="28" fill={col} />
      {n === 0 ? <rect x="12" y="58.5" width="96" height="3" fill={BLUE} /> : Array.from({ length: n }, (_, i) => <rect key={i} x={12 + ((i + 1) * 96) / (n + 1) - 4} y="46" width="8" height="28" fill={BLUE} />)}</g>
  }
  if (usmcWarrant) {
    if (/silver bar/i.test(t)) return <g><rect x="12" y="46" width="96" height="28" fill={SILVER} /><rect x="57" y="46" width="6" height="28" fill={RED} /></g>
    const n = count(t.replace(/^.*background and /i, "")), col = metal(t.replace(/^.*background and /i, ""))
    return <g><rect x="12" y="46" width="96" height="28" fill={RED} />{Array.from({ length: n }, (_, i) => <rect key={i} x={60 - 5 + (i - (n - 1) / 2) * 20} y="46" width="10" height="28" fill={col} />)}</g>
  }
  if (/oak leaf/i.test(t)) return <Leaf fill={metal(t)} />
  if (/eagle/i.test(t)) return <g transform="translate(60,60) scale(1.7)"><Eagle y={0} fill={metal(t)} /></g>
  if (/star/i.test(t)) { const n = count(t), r = n <= 2 ? 18 : n === 3 ? 15 : 11; return <g>{Array.from({ length: n }, (_, i) => <Star key={i} x={60 + (i - (n - 1) / 2) * (r * 2.1)} y={60} r={r} fill={SILVER} />)}</g> }
  const n = count(t), col = metal(t)
  return <g>{Array.from({ length: n }, (_, i) => <rect key={i} x={60 - 7 + (i - (n - 1) / 2) * 24} y="36" width="14" height="48" fill={col} />)}</g>
}

function diagonals(n: number) {
  return <g stroke={GOLD} strokeWidth="6" strokeLinecap="round">{Array.from({ length: n }, (_, i) => { const x = 60 + (i - (n - 1) / 2) * 16; return <line key={i} x1={x - 12} y1="90" x2={x + 12} y2="30" /> })}</g>
}

function Frame({ label, children }: { label: string; children: ReactNode }) {
  return <svg viewBox="0 0 120 120" role="img" aria-label={label} className="size-full"><rect width="120" height="120" rx="6" fill="#0A1620" />{children}</svg>
}

export type View = "collar" | "board" | "sleeve" | "insignia"

export function views(card: Card): View[] {
  if (card.sec === "nvo") return ["collar", "board", "sleeve"]
  if (card.sec === "nve") return ["collar", "sleeve"]
  return [card.sec === "mce" ? "insignia" : "collar"]
}
// the one drawing used in match quizzes
export const primary = (card: Card): View => (card.sec === "nve" ? "sleeve" : card.sec === "nvo" || card.sec === "mco" ? "collar" : "insignia")

// Real Appendix B images live in public/ranks ; the drawing is the fallback.
export function Drawing({ card, view, className = "size-28", label }: { card: Card; view: View; className?: string; label?: string }) {
  const [missing, setMissing] = useState(false)
  const kind = view === "collar" ? "collar" : view === "board" ? "board" : "sleeve"
  if (!missing && RANK_FILES.has(`${card.id}-${kind}`)) {
    return (
      <div className={`${className} flex items-center justify-center bg-white p-1`}>
        <img src={`${import.meta.env.BASE_URL}ranks/${card.id}-${kind}.png`} alt={label ?? `${card.prompt} ${view}`} className="max-h-full max-w-full object-contain" onError={() => setMissing(true)} />
      </div>
    )
  }
  if (view === "board") return <div className={`${className} flex items-center justify-center bg-secondary p-1 text-center text-xs text-muted-foreground`}>No picture</div>
  const key = view === "collar" ? "Collar" : view === "sleeve" ? "Sleeve" : "Insignia"
  const t = clause(card, key)
  let body: ReactNode = null
  if (/^none$/i.test(t.trim())) body = <text x="60" y="64" textAnchor="middle" fontSize="12" fill={SILVER}>No insignia</text>
  else if (card.sec === "nvo") body = view === "collar" ? collarOfficer(card, t) : sleeveOfficer(t)
  else if (card.sec === "mco") body = collarOfficer(card, t)
  else if (/diagonal/i.test(t)) body = diagonals(count(t))
  else body = stack(rating(t))
  return <div className={className}><Frame label={label ?? `${card.prompt} ${view}`}>{body}</Frame></div>
}

export function Insignia({ card, compact }: { card: Card; compact?: boolean }) {
  if (!hasInsignia(card)) return null
  return (
    <div className={`mt-3 flex flex-wrap ${compact ? "gap-3" : "gap-4"}`}>
      {views(card).map((v) => (
        <figure key={v} className="m-0">
          <Drawing card={card} view={v} className={v === "board" ? (compact ? "h-24 w-14" : "h-28 w-14") : compact ? "size-24" : undefined} />
          <figcaption className="mt-1 text-center text-xs text-muted-foreground">{v === "insignia" ? "Insignia" : v === "collar" ? "Collar" : v === "board" ? "Shoulder board" : "Sleeve"}</figcaption>
        </figure>
      ))}
    </div>
  )
}
