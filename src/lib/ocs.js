// Pure logic for Navy OCS PREP: no DOM, so it can be tested under node.

  // ---- text normalization and scoring ----------------------------------------------------
  function norm(s) {
    return String(s || "")
      .toLowerCase()
      .replace(/[–—]/g, " ")
      .replace(/['’]/g, "")
      .replace(/[^a-z0-9 ]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  function words(s) {
    const n = norm(s);
    return n ? n.split(" ") : [];
  }

  // Drop the spoken lead-in ("Sir/Ma'am, the first general order of a sentry is to") if the user said it.
  function stripLead(userText, lead) {
    const u = words(userText);
    const l = words(lead);
    if (!l.length) return u;
    let i = 0;
    while (i < l.length && i < u.length && u[i] === l[i]) i++;
    // accept a partial lead-in of 4+ words, or the whole thing
    return i >= Math.min(4, l.length) ? u.slice(i) : u;
  }

  // Word-level LCS. Returns the expected words tagged hit/miss and the extra words the user said.
  function diff(expectedWords, userWords) {
    const n = expectedWords.length, m = userWords.length;
    const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
    for (let i = n - 1; i >= 0; i--)
      for (let j = m - 1; j >= 0; j--)
        dp[i][j] = expectedWords[i] === userWords[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    const hit = new Array(n).fill(false);
    const extra = [];
    let i = 0, j = 0;
    while (i < n && j < m) {
      if (expectedWords[i] === userWords[j]) { hit[i] = true; i++; j++; }
      else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
      else { extra.push(userWords[j]); j++; }
    }
    while (j < m) extra.push(userWords[j++]);
    return { hit, extra, matched: dp[0][0] };
  }

  // threshold: fraction of expected words that must be present, in order. Answers of 20 words or fewer must be exact.
  function score(card, userText, threshold) {
    const exp = words(card.key);
    const usr = stripLead(userText, card.lead || "");
    const d = diff(exp, usr);
    const total = exp.length;
    const ratio = total ? d.matched / total : 0;
    const need = total <= 20 ? 1 : (threshold == null ? 0.95 : threshold);
    // A couple of filler words ("um", "sir") are tolerated; more than that is a wrong recital.
    return { ok: ratio >= need - 1e-9 && d.extra.length <= 2, ratio, expected: exp, hit: d.hit, extra: d.extra };
  }

  // ---- cloze -----------------------------------------------------------------------------
  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  // Returns tokens [{text, blank}] over the card key. frac = share of words to hide.
  function cloze(card, frac, salt) {
    const tokens = card.key.split(/\s+/).filter(Boolean);
    const r = rng(hash(card.id + ":" + (salt || 0)));
    const cand = tokens.map((t, i) => (norm(t).length > 2 ? i : -1)).filter((i) => i >= 0);
    const want = Math.max(1, Math.round(cand.length * frac));
    const blanks = new Set();
    const pool = cand.slice();
    while (blanks.size < want && pool.length) blanks.add(pool.splice(Math.floor(r() * pool.length), 1)[0]);
    return tokens.map((text, i) => ({ text, blank: blanks.has(i) }));
  }

  // ---- study order -----------------------------------------------------------------------
  // Appendix B priority from the PRD: Code of Conduct, General Orders, Chain of Command,
  // Constitution and basics, senior ranks, the rest of the ranks, devices, watchstanding, alphabet.
  function priority(card) {
    const grade = /E-(\d+)/.exec(card.prompt);
    const senior = grade && +grade[1] >= 7;
    switch (card.sec) {
      case "coc": return 10;
      case "go": return 20;
      case "chain": return 30;
      case "const": return 40;
      case "basics": return 45;
      case "nve": case "mce": return senior ? 50 : 70;
      case "nvo": case "mco": return 60;
      case "dev": return 80;
      case "watch": return 90;
      case "phon": return 100;
      default: return 110;
    }
  }
  function studyOrder(cards) {
    return cards
      .map((c, i) => ({ c, i }))
      .sort((a, b) => priority(a.c) - priority(b.c) || a.i - b.i)
      .map((x) => x.c);
  }

  // ---- scheduler -------------------------------------------------------------------------
  // Leitner-style boxes with a deadline cap. Not FSRS: simple, predictable, easy to reason about.
  const STEPS = [0, 1, 2, 4, 7, 12, 20, 35];

  function ymd(d) {
    const p = (n) => String(n).padStart(2, "0");
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
  }
  function parseYmd(s) {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  function addDays(s, n) {
    const d = parseYmd(s);
    d.setDate(d.getDate() + n);
    return ymd(d);
  }
  function daysBetween(a, b) {
    return Math.round((parseYmd(b) - parseYmd(a)) / 86400000);
  }

  // After a clean recall, move up a box; a miss drops to box 0 and is due again today.
  function schedule(state, ok, today, ship) {
    const s = Object.assign({ box: 0, reps: 0, lapses: 0 }, state);
    s.reps += 1;
    if (!ok) {
      s.box = 0;
      s.lapses += 1;
      s.due = today;
      return s;
    }
    s.box = Math.min(s.box + 1, STEPS.length - 1);
    let gap = STEPS[s.box];
    // Never let the next review slip past a quarter of the time left before shipping.
    if (ship) {
      const left = daysBetween(today, ship);
      gap = Math.min(gap, Math.max(1, Math.floor(left / 4)));
    }
    s.due = addDays(today, Math.max(1, gap));
    return s;
  }

export { norm, words, stripLead, diff, score, cloze, priority, studyOrder, schedule, STEPS, ymd, addDays, daysBetween, parseYmd };
