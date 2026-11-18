#!/usr/bin/env python3
"""Usage: ids-check.py <base> | ids-check.py --selftest
Fails (exit 1) if the ordered (id, sec) list of src/data/cards.json differs from <base>'s.
Text changes are allowed; added, removed or reordered cards are not."""
import json, subprocess, sys

PATH = "src/data/cards.json"

def pairs(cards):
    return [(c["id"], c["sec"]) for c in cards]

def diff(base, cur):
    """Return a list of problem strings (empty means ok)."""
    errs = []
    bs, cs = set(base), set(cur)
    for p in base:
        if p not in cs: errs.append("removed: %s (sec %s)" % p)
    for p in cur:
        if p not in bs: errs.append("added: %s (sec %s)" % p)
    if not errs and base != cur:
        i = next(i for i, (a, b) in enumerate(zip(base, cur)) if a != b)
        errs.append("reordered: first difference at index %d (base %s, now %s)" % (i, base[i][0], cur[i][0]))
    if len(base) != len(cur) and not errs:
        errs.append("count changed (duplicate ids): %d -> %d" % (len(base), len(cur)))
    return errs

def selftest():
    a = [{"id": "x-0", "sec": "x", "t": 1}, {"id": "x-1", "sec": "x"}, {"id": "y-0", "sec": "y"}]
    assert diff(pairs(a), pairs([dict(c, t=9) for c in a])) == []
    assert diff(pairs(a), pairs(a[:2]))
    assert diff(pairs(a), pairs(a + [{"id": "z", "sec": "z"}]))
    assert diff(pairs(a), pairs([a[1], a[0], a[2]]))
    assert diff(pairs(a), pairs([a[0], a[1], dict(a[2], sec="q")]))
    print("ids-check selftest ok")

def main():
    if len(sys.argv) != 2:
        print(__doc__); return 2
    if sys.argv[1] == "--selftest":
        selftest(); return 0
    base = sys.argv[1]
    r = subprocess.run(["git", "show", "%s:%s" % (base, PATH)], capture_output=True, text=True)
    if r.returncode:
        print("ids-check: cannot read %s at %s: %s" % (PATH, base, r.stderr.strip())); return 1
    errs = diff(pairs(json.loads(r.stdout)), pairs(json.load(open(PATH))))
    if errs:
        print("IDS CHECK FAILED: card ids/order changed vs %s" % base)
        for e in errs[:20]: print("  " + e)
        return 1
    print("ids-check ok vs %s" % base); return 0

sys.exit(main())
