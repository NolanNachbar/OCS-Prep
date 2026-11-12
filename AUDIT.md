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

## Round 30 (2026-11-10), pending push
- Study: Back reopens the card you just answered (Skip no longer feeds Back); a cleared card redone via Back does not re-schedule. Session is now due-today plus pins; new cards only via "Learn N more", or when nothing is due.

## Round 32 (2026-11-10), tag audit-2026-11-10-r32
- Study no longer includes the four rank sections (Navy and USMC officer and enlisted, 53 cards); it works on the other 82. Ranks are learned and reviewed in the Ranks tab. Rank cards stay in Cards, Test and Listen. Verified headless: "0 of 82 started".

## Round 33 (2026-11-10), tag audit-2026-11-10-r33
- The slider now sets only how many words are blank (Read it, Some words, Most words, All words, From memory). The old "First letters" level is "All words"; whether each blank shows its first letter is a checkbox in the slider box ("Show the first letter in each blank", on by default, saved in settings.letters). Same box in Ranks Recall, where it also masks the title letters. Verified headless: toggling clears the blank hints and saves.

## Round 34 (2026-11-10), tag audit-2026-11-10-r34
- Fill-in boxes (Study and Ranks Recall): space, Enter, Down or Right (at end of text) go to the next box; Up or Left (at start) go back; Enter in the last box checks. Helper in src/lib/blanks.ts. Verified headless with key events.

## Round 35 (2026-11-11), tag audit-2026-11-11-r35
- Rank wording shows one labelled part per line (name, Collar, Shoulder board, Sleeve, or Insignia) everywhere it appears: Ranks rows and Match answer, Recall and Learn, Study, Cards, Listen, and between the fill-in boxes. Display only (lines() and startsLine() in src/lib/blanks.ts); cards.json and the scorer are unchanged. Gate passes; Ensign row checked in the browser.

## Round 36 (2026-11-11), tag audit-2026-11-11-r36
- Listen: choose exact cards and how many times each plays back to back (Article 1 x3, then Article 2 x3). Section buttons still select a whole section; per-section lists with - / + counts sit below. One card with Loop on repeats forever (loop now advances a lap counter so a one-card playlist no longer stalls). Display shows "Play n of m". Audio files section unchanged (per section). Gate passes; counts checked headless (6 plays, 8 after +2, 3 after clearing others).

## Round 37 (2026-11-11), tag audit-2026-11-11-r37
- Listen: Loop now defaults off and is labelled "Loop the whole list", so Article 1 x3 then Article 2 x3 plays six times and stops (it used to restart forever because Loop defaulted on). Changing a count pauses playback so a running list never plays stale counts. Speed chips 0.75x to 2x on the Listen tab (saved in settings.rate, same value as Settings, whose Voice speed list now matches). Verified headless with a mocked speech engine: six plays at 1.5x, then Paused.

## Round 38 (2026-11-11), tag audit-2026-11-11-r38
- Listen: the two players are labelled apart. The yellow button is now "Play my list" (follows card choices, counts and speed); the audio bar is "Whole-section recordings (separate player)" and says it ignores counts and loops forever.

## Round 39 (2026-11-11), tag audit-2026-11-11-r39
- Listen is one player. 270 per-card recordings (tools/make_clips.py, local Piper, text from cards.json; quiz clips bake in a gap sized to the answer, 4 to 40 s) queue on one audio element in list order with per-card repeat counts, speed via playbackRate, Loop off by default, previous/next buttons, and lock-screen/earbud controls via Media Session. Removed: the browser-voice path, the whole-section audio bar, the memory-hooks toggle, wake lock, and the Listen gap setting from Settings. Quiz mode hides the answer text (no phase info from a clip). Verified headless with a fake Audio: 3 plays of card one then 3 of card two at 1.5x, then paused. Not tested on a real iPhone: locked-screen chaining.

## Round 40 (2026-11-12)
Listen: next clip now starts inside the audio element's ended event instead of a React effect, because a locked iPhone suspends rendering and playback stopped after the first clip. tools/make_clips.py now reads each sentence and each labelled part (Collar, Shoulder board, Sleeve, Insignia) as its own piece with a 0.55 s pause between, so answers no longer run together. All 270 clips rebuilt. cards.json and scorer untouched. Not verified on a real locked iPhone.

## Round 41 (2026-11-12)
Listen audio: symbols are now spelled out before synthesis in tools/make_clips.py ("General Order #2" reads as "number 2", "Sir/Ma'am" as "Sir or Ma'am", 1/2-inch as "one half inch", (s) as s). Clips rebuilt. Cards and scorer untouched; on-screen text unchanged.

## Round 42 (2026-11-12)
Study fill-in levels (some words, most words, nearly all): cards titled by a number (General Orders, Code of Conduct articles, Chain of Command, Constitution articles) now ask for the number as the first blank, and the title and the ordinal in the lead ("the second article") are hidden. The number is accepted as a digit, roman numeral or word. The type-it-cold level keeps its label. Scored as one more blank. cards.json and Appendix B text untouched; no hint letter is shown for the number. Checked in the headless browser that the number box renders on Code of Conduct Article 1.

## Round 43 (2026-11-12)
Study fill-in levels: on numbered cards the name (General Order, Code of Conduct, Chain of Command, Constitution) is sometimes a blank too, at the same odds as a word (35 / 70 / 100 percent by level, fixed per card visit). The title is now "Which one?" so neither part is handed over. Name blank scored as another blank; typed-cold level unchanged. cards.json untouched. Parser checked on all prompt shapes; the name box was not seen live because the first card rolled no name blank.

## Round 44 (2026-11-12)
New: RLP inspection mode (src/screens/Inspection.tsx), reachable from Test and from Ranks. The instructor calls a card ("Candidate, General Order number four!") aloud, a clock runs (default 20 s, 10 to 45 or none), one try graded word for word by the existing scorer, no hints. Questions are drawn weighted toward cards missed before, weak cards and E-7 and up ranks; a miss sets the card due today in Study. Optional push-up penalty text. Also new on Ranks: Match by words (src/screens/RankWords.tsx), no pictures: given a rank, type what is on its collar, sleeve or insignia (Seaman Recruit: None), or given the wording, type the rank; graded against the Appendix B text. cards.json untouched. Checked headless: both screens render, grade and show the miss. Spoken call and dictation not tried on a phone. Defaults chosen without his answers on time limit and scope: typed or dictated answers, all cards in Test, rank cards on Ranks.

## Round 45 (2026-11-12)
Weak badge fix. "Weak" meant 3 or more lifetime failed checks (any level, Show answer included) and box under 3, and the count never went down, so a card typed perfectly several times still read weak until it reached box 3 days later. Now a clean pass clears the count: a type-it-cold pass in Study (unless the card was missed this session), a correct whole card in Test or Inspection, and a rank clean pass in Rank recall. Partial-part word matches do not clear it. Cards already marked weak clear on their next clean pass; stored data is not rewritten. Scheduling and boxes unchanged.

## Round 46 (2026-11-12)
After a miss in Test, Inspection or Word match there is an "Add to my Study cards" button (the same pin the Cards tab uses; Study takes it into the open session at once, and the button then reads "Added to Study"). Inspection setup now has section chips to include or leave out content, count shown. The push-up penalty option was removed at his request. cards.json untouched.

## Round 48 (2026-11-12): rank learning moves on to the next group
- Recall-complete screen after a Learn session now offers "Next group: <name>" (lowest to highest), so finishing a group no longer dumps you back to find the button.
- Ranks intro text updated to the new order (it still listed the old one).
- Gate: PASS.

## Round 50 (2026-11-12): Study name blank split per word; r49 reverted
- r49 (per-letter rank title boxes) was the wrong screen and the wrong granularity; reverted.
- Study name blank ("Code of Conduct") is now one blank per word instead of one shared box.
- A wrong blank on the number or name now shows the correct word under it.
- Gate: PASS.

## Round 51 (2026-11-12): Study Back after an intro card
- Back was disabled right after reading a new card because the intro step never recorded itself in the trail. It does now.
- Gate: PASS.

## Round 52 (2026-11-12): Study Back after Skip
- Back was greyed out after a Skip (only answers were recorded). Skip now records itself and Back undoes it.
- Back is still empty on the first card of a session or after a page reload (the trail lives in memory only).
- Gate: PASS.

## Round 53 (2026-11-12): Study level slider and Next level up
- Next level up did nothing once the slider had been touched: the slider's manual level overrode the card's new level. setLevel now clears it.
- Short cards blanked the same words at several rungs, so the slider showed levels that were identical. The slider and the up/down buttons now only offer rungs that differ for that card (26 of 135 cards have 3 rungs, 3 have 4, the rest 5).
- Gate: PASS.

## Round 54 (2026-11-12): Count as correct at level 4
- The Count as correct button was hidden on the From memory level (typed or dictated recital), the one place a near-miss or mis-heard word is most likely. It now shows there too (not after Show answer).
- Gate: PASS.

## r55 (2026-11-12)
Audit fixes: a clean level-4 pass now clears the weak (misses) count in Study and RankRecall (spread order); reviews are never scheduled past the ship date; Easier level after a miss now counts as a miss (Study and RankRecall) and is hidden when it would drop to Read it; Skip clears the manual slider level; redo flag carried through requeues. Tests added for misses clearing and the ship-date cap.
