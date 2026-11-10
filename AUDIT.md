# Audit log

## Round 1 (2026-11-09), tag audit-2026-11-09-r1
Critics (Haiku): learning-science, phone-usability, content verifier.
- Content: 135/135 cards match Appendix B. Four memory hooks were wrong (warrant colors, USMC devices, E-7..E-9 note); fixed.
- Learning: strict scoring (20 words or fewer must be exact), no override at full recall, lapse goes to box 1, daily review cap 60, pick-your-own cards.
- Phone: sticky compact header, bigger slider thumb and blanks, bigger selects, Test override removed.
- Gate: console buffer now cleared before the check.
Rollback: `git revert -m 1 273bf1b` or `git reset --hard audit-2026-11-09-r1~1` (before the merge).

## Round 2 additions (2026-11-09), tag audit-2026-11-09-r2
Hamburger menu on phones (tab row on wide screens), Test this section / Test this card from Cards (a pass marks a new card known), memory hooks in Cards, a Hint button and miss reveal in Study, "Say memory hooks" in Listen, and per-section MP3s (read and quiz) built by tools/make_audio.py with local Piper TTS.
Rollback: `git reset --hard audit-2026-11-09-r1` on main, then push with lease.

## Round 2 critic fixes (tag audit-2026-11-09-r2c)
- Targeted test no longer over-credits: only a word-for-word pass marks a new card known, at box 2 (2 days), not box 3.
- Using Hint at full recall means the pass does not count.
- Listen: hook index uses the section index, wake lock released when playback stops, section change restarts playback.
- Hamburger button no longer shrinks below 44px.
- Not fixed on purpose: 40px buttons in Cards and Study (you said fat-finger misses do not matter).

## Rounds 3 to 8 (2026-11-09)
- Tags r3 to r8: section/card tests, hamburger nav, hooks, audio, font swap, flat design tried and reverted. Tag audit-2026-11-09-r7 points at the flat-design commit c9d29b3 by mistake; r8 is the correct state. Roll back to r8 or r5, never r7.
- Round 3 critics (learning, content, phone/look) fixes (tag r9): import validates, confirms and clears the file input; settings deep-merge with ship date validation; sir/ma'am and hyphen-tolerant answer matching; stage-0 correct routes through introduce; Study stays mounted across tabs; cloze varies per attempt; speech utterance retained; header shows -- for a bad ship date; USMC warrant hook wording; stat labels raised to 12px; scroll-padding under the sticky header.
- Skipped on purpose: color changes (owner reverted the teal and flat looks), fat-finger spacing, Watchstanding heading (content frozen).

## Rounds 10 to 20 (2026-11-10)
- Tags r10 to r20: real Appendix B rank images (cropped from the PDF, drawing fallback), blocky Anton wordmark, rank quiz and Ranks screen groundwork. r20 (b8bc616) pushed the PDF crops to the public repo; the owner knows and accepted the risk for study use. The history purge was not run.

## Round 21 (2026-11-10), tag audit-2026-11-10-r21: four-agent audit, first fixes
- Scoring is word for word at every length; the pass-mark setting is gone. Only um, uh, er, sir and ma'am are forgiven as extras. A spaced hyphen ("X ray") is accepted.
- A failed or peeked card cannot graduate through Try again. A Test failure no longer creates a record for an unseen card. The manual level resets after each card.
- Saved and imported state is validated; an error boundary offers Reload and Reset; other tabs sync; service worker v5 with a 3 second network timeout and a cached shell fallback.
- Listen shows audio errors; the Ranks quiz no longer leaks the answer to screen readers or sticks a missing image to the next question.

## Round 22 (2026-11-10), tag audit-2026-11-10-r22
- Last-week review: gaps never drop below 2 days, and reviews are served oldest due first so no card is starved.
- Pins added mid-session join the queue; the due list recomputes after midnight; a banner appears when progress cannot be saved.
- A rank file manifest (tools/rank_manifest.py) stops 404s for the three missing PNGs, with a test. Opaque apple-touch-icon. About panel with a non-affiliation note and the PDF link.
- Gate: fails if the browse binary is missing or the app does not render, and asserts each tab renders and fits 390px (the old per-tab check could never fail). Content checks moved to scripts/content-check.sh and run in CI, which now also runs on pull requests.
- Repo: dist/ untracked; removed the cn, rajdhani, roboto-slab and geist packages; shadcn moved to devDependencies.
- Held on purpose (owner decision): chain of command and Songs cards, since the videos said to hold off.
- Skipped on purpose: tap targets under 44px and border contrast (earlier owner calls: fat-finger spacing and colours are frozen).
- Known limits: tools/appendix-b-source.txt was pasted from a study guide, not the PDF, so the content gate proves the cards match that file only; Marine/Navy rank crops are small (about 110 to 360 px) and soft on retina; real-iPhone behavior (keyboard overlap, autocorrect, lock-screen audio) is untested; the 2018 PDF (OTCNINST 1530.6K) differs from the cards on the chain of command, GO9, GO11 and Juliet.
- Rollback: `git reset --hard audit-2026-11-10-r21`, push with lease (the guard hook blocks force pushes; run it yourself).

## Round 23 (2026-11-10), tag audit-2026-11-10-r23: image swap
- Rank images now come from Wikimedia Commons (66 files, 300 px wide, 46 public domain and 20 CC BY-SA 4.0 with credits in Settings, data in src/data/rank-credits.json). The Appendix B PDF crops are removed from the app (they remain in git history up to r22; a purge needs a force push the owner must run).
- Not used: Navy W-1, W-2, W-4, W-5 collar files (Commons has only collar-plus-board composites); those four show the drawing. No generic Navy sleeve badge exists for E-7 to MCPON, E-1 to E-3 or USMC Private, so those show the drawing too.

## Round 24 (2026-11-10), tag audit-2026-11-10-r24
- Ranks tab: every rank now lists its exact Appendix B wording (the card answer, unchanged) under its collar and sleeve pictures side by side. Group notes are labelled "Pattern:" because they are study aids, not Appendix B text. Content files untouched.

## Round 25 (2026-11-10), tag audit-2026-11-10-r25
- Navy officer and warrant rows now show collar, shoulder board and sleeve side by side (16 public-domain board files from Commons). The four warrant collars (W-1, W-2, W-4, W-5) are the top bar cropped from the Commons composite files (public domain), so they now have real pictures.
- Still drawings: Navy E-2 and E-3 sleeve, E-7 to MCPON sleeve (no Commons art found).

## Round 26 (2026-11-10), tag audit-2026-11-10-r26
- Ranks tab: each rank is now a collapsed dropdown row (rank and title). Tapping opens its pictures and exact Appendix B wording. Group pattern notes and the Match button stay visible. Content files untouched.

## Round 27 (2026-11-10), tag audit-2026-11-10-r27: ranks Recall
- Match was recognition only (four options, same-group distractors, one pass, no schedule). Added Learn: teach a group (picture, title, exact wording), then typed recall: title from the picture, then the Appendix B wording from the title, both scored word for word. A miss or a hint resets that step and it returns; two clean answers in a row finish it, and the rank then joins the same Leitner schedule as the card (lapse rule as in Study).
- Ranks tab now opens on four collapsed categories (Navy officers, Navy enlisted, Marine officers, Marine enlisted) holding the pattern groups, each with Learn and Match. Top shows ranks learned, a "Learn next" button and "Review N due".
- Verified in headless browse: teach, recall, wrong answer path. Full correct-answer path to the schedule write is code-reviewed only.

## Round 28 (2026-11-10), tag audit-2026-11-10-r28: ranks Recall on the slider
- Recall now uses the Study fill-in slider (Read it to From memory). Name step: picture plus a letter mask of the title (half, first letter, letter count, none). Wording step: the same cloze blanks as the Study cards, then typed. Auto level starts at Some words after Learn (First letters when reviewing), climbs on clean answers, drops on a miss, hint repeats the level. A step finishes only on a clean From memory answer; both steps finish a rank, which then joins the Leitner schedule.
- Verified headless: teach, recall at Some words, Show answer, requeue. The climb to From memory and the schedule write are code-reviewed only.

## Round 29 (2026-11-10), tag audit-2026-11-10-r29
- Bug: expanding a rank inside a category hid the rows below it. The shared accordion wrapper had a fixed height from Radix (--radix-accordion-content-height), which breaks nested accordions. Removed it; height is now automatic. Verified headless: E-2 open, E-3 onward sit below it.

## Round 30 (2026-11-10), tag audit-2026-11-10-r30
- Reported "still does it" after r29. The deployed bundle matched my build and the nested-accordion layout was correct headless at 390 and 1235 px, so a stale cached copy on the device is the likely cause (Pages caches index.html for 10 minutes, and the service worker held the old shell). Bumped the service worker cache to v6 and added the commit hash under Settings > About ("Build xxxxxxx") so the running version can be read off the phone.
