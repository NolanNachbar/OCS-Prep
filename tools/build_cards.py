#!/usr/bin/env python3
"""Parse the pasted Appendix B deck text into src/data/cards.json.

Source: tools/appendix-b-source.txt (lines 15-297 are the first copy of the deck).
Each card is a title line followed by an answer line, grouped under ALL-CAPS headers.
"""
import json, re, sys
from pathlib import Path

root = Path(__file__).resolve().parent.parent
lines = [l.rstrip("\n") for l in (root / "tools/appendix-b-source.txt").read_text().splitlines()]
lines = lines[14:297]  # first copy of the deck

SECTIONS = {
    "NAVY BASICS": ("basics", "Navy Basics"),
    "CODE OF CONDUCT": ("coc", "Code of Conduct"),
    "CONSTITUTION": ("const", "Constitution"),
    "GENERAL ORDERS": ("go", "General Orders"),
    "CHAIN OF COMMAND": ("chain", "Chain of Command"),
    "WATCHSTANDING PRINCIPLES": ("watch", "Watchstanding"),
    "PHONETIC ALPHABET": ("phon", "Phonetic Alphabet"),
    "NAVY OFFICER RANKS": ("nvo", "Navy Officer Ranks"),
    "USMC OFFICER RANKS": ("mco", "USMC Officer Ranks"),
    "NAVY ENLISTED RANKS": ("nve", "Navy Enlisted Ranks"),
    "USMC ENLISTED RANKS": ("mce", "USMC Enlisted Ranks"),
    "OFFICER DEVICES": ("dev", "Officer Devices"),
}

cards, cur, buf = [], None, []
for l in lines:
    if l.strip() in SECTIONS:
        cur = SECTIONS[l.strip()]
        buf = []
        continue
    if cur is None or not l.strip():
        continue
    # USMC officer rank headers (e.g. "USMC W-1") sit under their own section header and are titles.
    buf.append(l.strip())
    if len(buf) == 2:
        title, ans = buf
        buf = []
        cards.append({"sec": cur[0], "secName": cur[1], "prompt": title, "full": ans})
if buf:
    sys.exit(f"dangling line: {buf}")

LEAD = re.compile(r"^(Sir/Ma'am, [^:]+:|Watchstanders will:)\s*(.*)$", re.S)
for i, c in enumerate(cards):
    c["id"] = f"{c['sec']}-{i:03d}"
    m = LEAD.match(c["full"])
    if m:
        c["lead"], c["answer"] = m.group(1), m.group(2)
    else:
        c["lead"] = ""
        c["answer"] = c["full"]
    # ranks: the part that must be recited cold (name, abbreviation, collar device)
    if c["sec"] in ("nvo", "nve"):
        cut = re.split(r"\s(?:Shoulder board:|Sleeve:)", c["answer"])[0]
        c["key"] = cut
    else:
        c["key"] = c["answer"]
    # phonetic: drop pronunciation guide from the key
    if c["sec"] == "phon":
        c["key"] = re.sub(r"\s*\(.*\)", "", c["answer"]).strip()

counts = {}
for c in cards:
    counts[c["secName"]] = counts.get(c["secName"], 0) + 1
print(len(cards), counts)
(root / "src/data/cards.json").write_text(json.dumps(cards, indent=1, ensure_ascii=False) + "\n")
