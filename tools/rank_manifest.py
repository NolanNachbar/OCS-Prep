#!/usr/bin/env python3
"""Write src/data/rank-files.json: the rank PNGs that exist, so the app never requests a missing one."""
import json, os
d = os.path.join(os.path.dirname(__file__), "..", "public", "ranks")
names = sorted(f[:-4] for f in os.listdir(d) if f.endswith(".png"))
json.dump(names, open(os.path.join(os.path.dirname(__file__), "..", "src", "data", "rank-files.json"), "w"), indent=1)
print(len(names), "rank files")
