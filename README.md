# OCS Recite

Appendix B (RLP) recital trainer for Navy OCS. Vite, React, TypeScript, Tailwind v4, shadcn/ui.

- Study: learn, fill the blanks, recall, with spaced repetition
- Test: random cards, no hints
- Listen: hands-free prompt and answer loop for running
- Cards and More: browse, edit chain-of-command links, settings, export and import

```
npm install
npm run dev
npm test        # scoring and scheduler tests
npm run build
```

Progress is stored in the browser (localStorage). Rebuild cards with `python3 tools/build_cards.py`.
Pushes to `main` deploy to GitHub Pages.
