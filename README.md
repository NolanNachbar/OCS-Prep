# Navy OCS PREP

A free study app for the Navy OCS Appendix B recital (General Orders, Code of Conduct, chain of command, ranks and the rest). Unofficial: not affiliated with or endorsed by the U.S. Navy. Check every card against the Appendix B your class uses.

- Study: learn, fill the blanks, recall, with spaced repetition
- Test: random cards, no hints
- Listen: hands-free prompt and answer loop for running
- Ranks: pictures, groups, matching and recall
- Cards and Settings: browse, set your ship date, export and import progress

On a phone, open the site and use Share, then Add to Home Screen. Progress is saved in your browser on that device only, so use Export in Settings to move it.

Built with Vite, React, TypeScript, Tailwind v4, shadcn/ui.

```
npm install
npm run dev
npm test        # scoring and scheduler tests
npm run build
```

Cards are built from `tools/appendix-b-source.txt`, which came from a study guide rather than the PDF. Rebuild them with `python3 tools/build_cards.py`.
Pushes to `main` deploy to GitHub Pages and Vercel.
