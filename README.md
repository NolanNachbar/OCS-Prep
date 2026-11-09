# Navy OCS PREP

Personal recital trainer for OCSINST 1530.1A Appendix B (the RLP knowledge). Static PWA, no build step, no server.

Run locally: `python3 -m http.server 8000` then open http://localhost:8000
Tests: `node tools/test_lib.js`
Rebuild cards: `python3 tools/build_cards.py` (reads `tools/appendix-b-source.txt`)

Progress is stored in the browser only. Use More > Export progress to back it up.
