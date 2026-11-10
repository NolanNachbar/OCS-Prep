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
scripts/content-check.sh || exit 1

# 2. Build and tests
out=$(npm run build 2>&1) || fail "build" "$out"
out=$(node tools/test_lib.mjs 2>&1) || fail "tests" "$out"

# 3. Console errors and clipped nav at phone width, every tab
[ -x "$B" ] || fail "browser" "browse binary missing at $B"
(npx vite preview --port 4190 >/dev/null 2>&1 &) ; sleep 2
$B viewport 390x844 >/dev/null 2>&1; $B console --clear >/dev/null 2>&1; $B goto http://localhost:4190/ >/dev/null 2>&1
loaded=$($B js "document.getElementById('root').innerText.length" 2>&1 | grep -E "^[0-9]+$" | head -1)
[ "${loaded:-0}" -gt 50 ] || { fuser -k 4190/tcp >/dev/null 2>&1; fail "page-load" "app did not render (text length: ${loaded:-none})"; }
for t in study test listen ranks cards more; do
  $B js "(() => { const e = document.querySelector('[data-nav=\"$t\"]'); if (!e) return 'NONAV'; e.dispatchEvent(new MouseEvent('mousedown',{bubbles:true,button:0})); e.click(); return 'CLICKED' })()" >/dev/null 2>&1
  sleep 0.4
  res=$($B js "(document.documentElement.scrollWidth<=innerWidth ? 'LAYOUT_OK' : 'HSCROLL') + (document.getElementById('root').innerText.length>200 ? ' CONTENT_OK' : ' EMPTY')" 2>&1)
  case "$res" in *HSCROLL*) fuser -k 4190/tcp >/dev/null 2>&1; fail "layout" "horizontal scroll on $t at 390px";; esac
  case "$res" in *"LAYOUT_OK CONTENT_OK"*) ;; *) fuser -k 4190/tcp >/dev/null 2>&1; fail "tab-$t" "tab did not render or browse errored: $res";; esac
done
errs=$($B console --errors 2>&1 | grep -v -E "UNTRUSTED|no console errors")
fuser -k 4190/tcp >/dev/null 2>&1
[ -n "$errs" ] && fail "console-errors" "$errs"
echo "GATE PASS"
