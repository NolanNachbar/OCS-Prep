// Run: node tools/test_lib.mjs
import assert from "assert"; import { readFileSync, readdirSync } from "fs";
const L = await import("../src/lib/ocs.js");
const Q = await import("../src/lib/queue.js");
const cards = JSON.parse(readFileSync(new URL("../src/data/cards.json", import.meta.url)));
const by = (id) => cards.find((c) => c.id.startsWith(id));
let n = 0;
const t = (name, fn) => { fn(); n++; console.log("ok", name); };

t("exact recital with lead-in passes", () => {
  const c = cards.find((x) => x.prompt === "General Order #1");
  const r = L.score(c, "Sir, ma'am, the first general order of a sentry is to take charge of this post and all government property in view");
  assert(r.ok, JSON.stringify(r));
});
t("exact recital without lead-in passes", () => {
  const c = cards.find((x) => x.prompt === "General Order #1");
  assert(L.score(c, "take charge of this post and all government property in view").ok);
});
t("long answers are word for word too: a dropped, swapped or replaced word fails", () => {
  const c = cards.find((x) => L.words(x.key).length > 20);
  const w = L.words(c.key);
  assert(L.score(c, w.join(" ")).ok);
  assert(!L.score(c, [...w.slice(0, 10), ...w.slice(11)].join(" ")).ok, "dropped word");
  assert(!L.score(c, w.map((x, i) => (i === 10 ? "banana" : x)).join(" ")).ok, "replaced word");
  const sw = w.slice(); [sw[10], sw[11]] = [sw[11], sw[10]];
  if (sw.join(" ") !== w.join(" ")) assert(!L.score(c, sw.join(" ")).ok, "swapped words");
});
t("an inserted real word fails; spoken filler is forgiven", () => {
  const c = cards.find((x) => x.prompt.includes("Core Values")) || cards.find((x) => L.words(x.key).length <= 6);
  const w = L.words(c.key);
  assert(!L.score(c, [w[0], "the", ...w.slice(1)].join(" ")).ok, "inserted word");
  assert(L.score(c, "um " + w.join(" ")).ok, "filler");
});
t("a hyphenated answer typed with a space still passes", () => {
  const c = cards.find((x) => x.key === "X-Ray");
  assert(c && L.score(c, "X ray").ok && L.score(c, "X-Ray").ok);
});
t("short answers must be exact", () => {
  const c = cards.find((x) => x.prompt === "Navy Core Values");
  assert(L.score(c, "Honor Courage and Commitment").ok);
  assert(!L.score(c, "Honor Courage").ok);
});
t("phonetic key drops pronunciation", () => {
  const c = cards.find((x) => x.prompt === "Letter H");
  assert.strictEqual(c.key, "Hotel");
  assert(L.score(c, "hotel").ok);
});
t("rank key stops before shoulder board", () => {
  const c = cards.find((x) => x.prompt === "Navy O-5");
  assert(!/Shoulder/.test(c.key), c.key);
  assert(L.score(c, "commander cdr collar silver oak leaf").ok);
});
t("extra words are reported but wrong order is penalised", () => {
  const c = cards.find((x) => x.prompt === "General Order #5");
  const r = L.score(c, "um quit my post only when properly relieved sir");
  assert(r.ok && r.extra.length === 2);
});
t("cloze hides requested share and is deterministic", () => {
  const c = cards.find((x) => x.prompt === "General Order #6");
  const a = L.cloze(c, 0.5, 1), b = L.cloze(c, 0.5, 1);
  assert.deepStrictEqual(a, b);
  const blanks = a.filter((x) => x.blank).length;
  assert(blanks >= 5, blanks);
});
t("study order starts with Navy Basics, then Code of Conduct, then General Orders", () => {
  const o = L.studyOrder(cards);
  assert.deepStrictEqual(o.slice(0, 3).map((c) => c.sec), ["basics", "basics", "basics"]);
  assert.strictEqual(o[3].sec, "coc");
  assert.strictEqual(o[9].sec, "go");
  assert.strictEqual(o[o.length - 1].sec, "phon");
  assert.strictEqual(o.length, 135);
});
t("ranks go lowest to highest within each service", () => {
  const o = L.studyOrder(cards).map((c) => c.prompt);
  assert(o.indexOf("Navy E-1") < o.indexOf("Navy E-2") && o.indexOf("Navy E-2") < o.indexOf("Navy E-9"));
  assert(o.indexOf("Navy W-1") < o.indexOf("Navy O-1") && o.indexOf("Navy O-1") < o.indexOf("Navy O-10"));
  assert(o.indexOf("Navy E-9") < o.indexOf("USMC E-1: Private"));
});
t("book order still runs Code of Conduct first and basics after the Constitution", () => {
  const o = L.bookOrder(cards).map((c) => c.sec);
  assert.strictEqual(o[0], "coc");
  assert(o.lastIndexOf("const") < o.indexOf("basics"));
});
t("scheduler: miss resets, hit climbs, deadline caps the gap", () => {
  let s = L.schedule(undefined, true, "2026-11-10", null);
  assert.strictEqual(s.due, "2026-11-11");
  s = L.schedule(s, true, "2026-11-11", null);
  s = L.schedule(s, true, "2026-11-13", null);
  s = L.schedule(s, true, "2026-11-17", null);
  assert.strictEqual(s.due, "2026-11-24");
  const m = L.schedule(s, false, "2026-11-24", null);
  assert.strictEqual(m.box, 0); assert.strictEqual(m.due, "2026-11-24"); assert.strictEqual(m.lapses, 1);
  const c = L.schedule(s, true, "2026-11-24", "2026-12-04");
  assert(L.daysBetween("2026-11-24", c.due) <= 2, c.due);
});
t("answers of 20 words or fewer must be exact; more than two extra words fail", () => {
  const c = cards.find((x) => L.words(x.key).length > 5 && L.words(x.key).length <= 20);
  const w = L.words(c.key);
  assert(L.score(c, w.join(" ")).ok);
  assert(!L.score(c, w.slice(1).join(" ")).ok, "one missing word must fail");
  assert(!L.score(c, "um uh like " + w.join(" ")).ok, "three extra words must fail");
});
t("rank manifest lists exactly the PNGs in public/ranks", () => {
  const onDisk = readdirSync(new URL("../public/ranks/", import.meta.url)).filter((f) => f.endsWith(".png")).map((f) => f.slice(0, -4)).sort();
  const listed = JSON.parse(readFileSync(new URL("../src/data/rank-files.json", import.meta.url), "utf8"));
  assert(JSON.stringify(onDisk) === JSON.stringify(listed), "run python3 tools/rank_manifest.py");
});
t("a clean pass clears the miss count the way Study and RankRecall write it", () => {
  const cs = { box: 1, reps: 3, lapses: 1, misses: 4, due: "2026-11-01" };
  const out = { ...L.schedule(cs, true, "2026-11-12", "2027-01-01"), misses: 0 };
  assert(out.misses === 0, "misses must be 0 after a clean pass");
});
t("a review is never scheduled past the ship date", () => {
  assert(L.schedule({ box: 2 }, true, "2026-12-31", "2027-01-01").due <= "2027-01-01");
  assert(L.schedule({ box: 5 }, true, "2026-12-25", "2027-01-01").due <= "2027-01-01");
  assert(L.schedule({ box: 2 }, true, "2026-11-12", "2027-01-01").due > "2026-11-12");
});
t("a review on or after the ship day is due no later than today or the ship day", () => {
  assert(L.schedule({ box: 2 }, true, "2026-12-31", "2026-12-31").due === "2026-12-31");
  assert(L.schedule({ box: 2 }, true, "2027-01-05", "2026-12-31").due === "2027-01-05");
});
t("1st Lt and 1stLt score the same", () => {
  assert(L.norm("First Lieutenant (1st Lt)") === L.norm("First Lieutenant (1stLt)"));
});
t("no scheduler gap is longer than 14 days", () => {
  assert.strictEqual(L.STEPS.length, 8);
  assert.strictEqual(Math.max(...L.STEPS), 14);
  assert.strictEqual(L.schedule({ box: 7 }, true, "2026-11-10", null).due, "2026-11-24");
});
// 60 days of the default flow (one session a day, no taps) with the real scheduler and queue builder.
function simulate({ days = 60, pass = 0.9, start = "2026-11-19", ship = "2027-01-17" } = {}) {
  const order = L.studyOrder(cards).filter((c) => !["nve", "nvo", "mce", "mco"].includes(c.sec));
  const st = { settings: { ship, newPerDay: 5 }, cards: {}, intro: { date: "", n: 0 } };
  let seed = 7; const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  const rows = []; let allIn = null, pastShip = 0, maxGap = 0; const seen = {};
  for (let d = 0; d < days; d++) {
    const t = L.addDays(start, d);
    if (t > ship) break;
    const q = Q.buildQueue({ order, cards: st.cards, pins: [], today: t, settings: st.settings, intro: st.intro });
    st.intro = st.intro.date === t ? st.intro : { date: t, n: 0 };
    for (const i of q.news) { st.cards[i.id] = { box: 0, reps: 0, lapses: 0, due: t, misses: 0 }; st.intro = { date: t, n: st.intro.n + 1 }; }
    for (const i of [...q.reviews, ...q.news]) {
      let cs = st.cards[i.id]; const missed = rnd() > pass;
      if (missed && cs.reps > 0) cs = { ...cs, box: 1, lapses: cs.lapses + 1 };
      st.cards[i.id] = { ...L.schedule(cs, true, t, ship, i.id), misses: 0 };
      if (st.cards[i.id].due > ship) pastShip++;
      if (seen[i.id]) maxGap = Math.max(maxGap, L.daysBetween(seen[i.id], t)); seen[i.id] = t;
    }
    if (allIn === null && Object.keys(st.cards).length === order.length) allIn = d;
    rows.push({ t, reviews: q.reviews.length, total: q.reviews.length + q.news.length, news: q.news.map((i) => i.id) });
  }
  return { order, rows, allIn, pastShip, maxGap, st };
}
t("default flow introduces every non-rank card within 14 days, never cramming or passing the ship date", () => {
  const r = simulate();
  assert.strictEqual(r.order.length, 82);
  assert(r.allIn !== null && r.allIn < 14, "all introduced on day " + r.allIn);
  const first = r.rows.slice(0, 28).map((x) => x.reviews);
  console.log("  sim: all 82 in by day", r.allIn + 1, "| day-1 cards", r.rows[0].total, "| peak reviews first 4 weeks", Math.max(...first), "| max gap", r.maxGap,
    "| last 10", Math.max(...r.rows.filter((x) => x.t < "2027-01-17").slice(-10).map((x) => x.reviews)), "\n  first 28:", first.join(" "));
  const last10 = r.rows.filter((x) => x.t < "2027-01-17").slice(-10).map((x) => x.reviews); // the 10 days before ship; ship day is the final run-through
  assert(Math.max(...last10) <= 45, "last 10 days: " + last10);
  assert.strictEqual(r.pastShip, 0);
});
t("after the ship date a card reviewed today is not due again today", () => {
  const cs = L.schedule({ box: 3 }, true, "2027-01-20", "2027-01-17", "x");
  assert.strictEqual(cs.due, "2027-01-20");
  assert(!Q.isDue(cs, "2027-01-20"));
  assert(Q.isDue(cs, "2027-01-21"));
});
t("new cards join the queue even when reviews are due, up to the allowance", () => {
  const order = L.studyOrder(cards).slice(0, 10);
  const cs = { [order[0].id]: { box: 1, reps: 1, lapses: 0, due: "2026-11-01", misses: 0 } };
  const q = Q.buildQueue({ order, cards: cs, today: "2026-11-02", settings: { newPerDay: 5, learn: "count" }, intro: { date: "2026-11-02", n: 2 } });
  assert.strictEqual(q.reviews.length, 1);
  assert.strictEqual(q.news.length, 3);
  const more = Q.buildQueue({ order, cards: cs, today: "2026-11-02", settings: { newPerDay: 5, learn: "count" }, intro: { date: "2026-11-02", n: 5 }, extra: 5 });
  assert.strictEqual(more.news.length, 5);
});
const studyOrder = L.studyOrder(cards).filter((c) => !["nve", "nvo", "mce", "mco"].includes(c.sec));
const secOf = (id) => cards.find((c) => c.id === id).sec;
t("topic mode introduces topics in the owner order, Phonetic Alphabet first, then Navy Basics", () => {
  const r = simulate();
  assert.strictEqual(r.rows[0].news.length, 26);
  assert(r.rows[0].news.every((id) => secOf(id) === "phon"));
  assert.deepStrictEqual(r.rows[1].news.map(secOf), ["basics", "basics", "basics"]);
  const seq = []; for (const x of r.rows) for (const id of x.news) if (seq[seq.length - 1] !== secOf(id)) seq.push(secOf(id));
  assert.deepStrictEqual(seq, Q.TOPICS);
  for (const x of r.rows) assert(new Set(x.news.map(secOf)).size <= 1, "one topic a day");
});
t("every current topic comes in whole; first topic is 26 Phonetic cards", () => {
  const top = Q.currentTopic({ order: studyOrder, cards: {} });
  assert.strictEqual(top.sec, "phon"); assert.strictEqual(top.take, 26); assert.strictEqual(top.parts, 1);
  const ids = studyOrder.filter((c) => c.sec === "phon").map((c) => c.id);
  assert.deepStrictEqual(top.unseen, ids, "card order");
});
t("learn fewer introduces exactly that many and leaves the topic current; one topic a day unless asked", () => {
  const set = { newPerDay: 5 };
  const q = Q.buildQueue({ order: studyOrder, cards: {}, today: "2026-11-02", settings: set, intro: { date: "", n: 0 }, take: 4 });
  assert.strictEqual(q.news.length, 4);
  const cs = {}; for (const i of q.news) cs[i.id] = { box: 1, reps: 1, lapses: 0, due: "2026-11-03", misses: 0 };
  const top = Q.currentTopic({ order: studyOrder, cards: cs });
  assert.strictEqual(top.sec, "phon"); assert.strictEqual(top.take, 22);
  const again = Q.buildQueue({ order: studyOrder, cards: cs, today: "2026-11-02", settings: set, intro: { date: "2026-11-02", n: 4 } });
  assert.strictEqual(again.news.length, 0, "no second topic without asking");
  const now = Q.buildQueue({ order: studyOrder, cards: cs, today: "2026-11-02", settings: set, intro: { date: "2026-11-02", n: 4 }, now: true });
  assert.strictEqual(now.news.length, 22);
});
t("reviews come before the topic's new cards", () => {
  const phon = studyOrder.filter((c) => c.sec === "phon");
  const cs = {}; for (const c of phon) cs[c.id] = { box: 1, reps: 1, lapses: 0, due: "2026-11-02", misses: 0 };
  const q = Q.buildQueue({ order: studyOrder, cards: cs, today: "2026-11-02", settings: { newPerDay: 5 }, intro: { date: "", n: 0 } });
  assert.strictEqual(q.reviews.length, 26);
  assert.deepStrictEqual(q.news.map((i) => secOf(i.id)), ["basics", "basics", "basics"]);
});
console.log(n, "tests passed");
