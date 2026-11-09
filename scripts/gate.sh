#!/usr/bin/env bash
# Failable gate for the audit loop. Exit nonzero on the first failure; print which gate failed.
# Usage: scripts/gate.sh   (run from the repo root, on the audit branch)
set -u
cd "$(dirname "$0")/.."
B=~/.claude/skills/gstack/browse/dist/browse
fail() { echo "GATE FAILED: $1"; shift; printf '%s\n' "$@" | head -20; exit 1; }

# 1. Content is frozen: cards and the pasted source may never differ from main, and must regenerate identically.
base=${GATE_BASE:-origin/main}
if ! git diff --quiet "$base" -- src/data/cards.json tools/appendix-b-source.txt tools/build_cards.py; then
  fail "content-frozen" "cards.json, appendix-b-source.txt or build_cards.py changed vs $base"
fi
cp src/data/cards.json /tmp/gate_cards_before.json
python3 tools/build_cards.py >/dev/null 2>&1
if ! cmp -s /tmp/gate_cards_before.json src/data/cards.json; then
  cp /tmp/gate_cards_before.json src/data/cards.json
  fail "content-regenerate" "cards.json does not regenerate identically from the source"
fi
python3 - <<'PY' || exit 1
import json,re
norm=lambda t:re.sub(r"[^a-z0-9 ]"," ",t.lower()).split()
src=" ".join(norm(open("tools/appendix-b-source.txt").read()))
bad=[c["id"] for c in json.load(open("src/data/cards.json")) if " ".join(norm(c["answer"])) not in src]
if bad: print("GATE FAILED: content-verbatim", bad[:20]); raise SystemExit(1)
PY

# 2. Build and tests
out=$(npm run build 2>&1) || fail "build" "$out"
out=$(node tools/test_lib.mjs 2>&1) || fail "tests" "$out"

# 3. Console errors and clipped nav at phone width, every tab
(npx vite preview --port 4190 >/dev/null 2>&1 &) ; sleep 2
$B viewport 390x844 >/dev/null 2>&1; $B goto http://localhost:4190/ >/dev/null 2>&1
for t in Study Test Listen Cards Settings; do
  $B js "[...document.querySelectorAll('[role=tab]')].find(b=>b.innerText.trim().toLowerCase()==='${t,,}').click(); await new Promise(r=>setTimeout(r,250)); document.documentElement.scrollWidth<=innerWidth ? 'ok' : 'HSCROLL'" 2>&1 | grep -q HSCROLL && { fuser -k 4190/tcp >/dev/null 2>&1; fail "layout" "horizontal scroll on $t at 390px"; }
done
errs=$($B console --errors 2>&1 | grep -v -E "UNTRUSTED|no console errors")
fuser -k 4190/tcp >/dev/null 2>&1
[ -n "$errs" ] && fail "console-errors" "$errs"
echo "GATE PASS"
