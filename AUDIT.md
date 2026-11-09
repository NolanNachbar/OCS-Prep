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
