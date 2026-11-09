import type { Card } from "./types"

// Memory hooks. 1-6 (Code of Conduct), 1-6 and 8-9 (General Orders) are the author's; General Orders 7, 10, 11 came from a
// YouTube comment. Replace any that do not stick.
const COC = [
  "1: American. I am an American.",
  "2: Never surrender.",
  "3: Resist and escape.",
  "4: Keep faith with fellow prisoners.",
  "5: Name, rank, service number, date of birth.",
  "6: Trust in God and the United States of America.",
]
const GO = [
  "1, take charge: number one is first in line, so take charge of the post.",
  "2, walk my post: two legs, walk it, stay alert.",
  "3, report violations: three strikes, report every one.",
  "4, repeat all calls: four posts down the line, repeat calls from the farther ones.",
  "5, quit only when relieved: a high five when your relief shows up, then you quit.",
  "6, receive and obey: the order-givers list: CO, CDO, OOD, watch officers and petty officers.",
  "7, talk to no one: '7 ate 9', so 7 has no friends and talks to no one except in the line of duty.",
  "8, give the alarm: 8 looks like a siren loop, alarm for fire or disorder.",
  "9, call the OOD: 9 is the phone number, call the Officer of the Deck.",
  "10, salute: 10 is the top of the scale, salute all officers and colors not cased.",
  "11, be watchful at night: the 11th hour is the darkest, challenge everyone near the post.",
]
const CONST = "Articles I to VII: Legislative, Executive, Judicial, States, Amend, Supremacy, Ratify."
const chain = (i: number) =>
  i < 4 ? "Chunk 1: your class team (1 to 4)"
  : i < 8 ? "Chunk 2: OCS staff (5 to 8)"
  : i < 11 ? "Chunk 3: Officer Training Command Newport (9 to 11)"
  : i < 14 ? "Chunk 4: NSTC, NETC, Chief of Naval Personnel (12 to 14)"
  : "Chunk 5: CNO, SECNAV, Secretary of War, President (15 to 18)"

export function hookFor(c: Card, idxInSection: number): string {
  switch (c.sec) {
    case "coc": return COC[idxInSection] || ""
    case "go": return GO[idxInSection] || ""
    case "const": return CONST
    case "chain": return chain(idxInSection)
    case "nvo": return "Officer collar: gold bar, silver bar, two silver bars, gold oak leaf, silver oak leaf, eagle, then one to five stars. Warrants: blue breaks (W-5 is a thin blue line)."
    case "mco": return c.prompt.includes("W-") ? "USMC warrants: red background. W-1 and W-2 have gold breaks, W-3 and W-4 silver breaks, W-5 is a silver bar with a thin red break." : "The USMC officer devices copy the Navy collar devices."
    case "nve": return !/E-[789]|MCPON/.test(c.prompt) ? "" : "E-7 to E-9: the same anchor plus zero, one or two stars (MCPON three)."
    case "mce": return "Drill the exceptions: the E-8 and E-9 pairs. Look-alike pairs: Master Sergeant and First Sergeant (both E-8), Sergeant Major and Master Gunnery Sergeant (both E-9)."
    default: return ""
  }
}
