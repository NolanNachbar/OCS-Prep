#!/usr/bin/env bash
# Content gates that need no browser: cards regenerate from the source, and every answer is verbatim in it.
# Run by scripts/gate.sh and by the deploy workflow.
set -u
cd "$(dirname "$0")/.."
tmp=$(mktemp)
cp src/data/cards.json "$tmp"
python3 tools/build_cards.py >/dev/null 2>&1
if ! cmp -s "$tmp" src/data/cards.json; then
  cp "$tmp" src/data/cards.json; rm -f "$tmp"
  echo "GATE FAILED: content-regenerate (cards.json does not regenerate identically from the source)"; exit 1
fi
rm -f "$tmp"
python3 - <<'PY' || exit 1
import json,re
norm=lambda t:re.sub(r"[^a-z0-9 ]"," ",t.lower()).split()
src=" ".join(norm(open("tools/appendix-b-source.txt").read()))
bad=[c["id"] for c in json.load(open("src/data/cards.json")) if " ".join(norm(c["answer"])) not in src]
if bad: print("GATE FAILED: content-verbatim", bad[:20]); raise SystemExit(1)
PY
