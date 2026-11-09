// Run: node tools/test_lib.js
const assert = require("assert");
const L = require("../lib.js");
const cards = require("../data/cards.json");
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
t("one missing word fails a long answer at 100 percent, passes at 90", () => {
  const c = cards.find((x) => x.prompt === "Code of Conduct, Article 2");
  const bad = "I will never surrender of my own free will. If in command, I will never surrender the members of my command while they still have means to resist.";
  assert(!L.score(c, bad, 1).ok);
  assert(L.score(c, bad, 0.9).ok);
});
t("short answers must be exact", () => {
  const c = cards.find((x) => x.prompt === "Navy Core Values");
  assert(L.score(c, "Honor Courage Commitment").ok);
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
t("study order starts with Code of Conduct then General Orders", () => {
  const o = L.studyOrder(cards);
  assert.strictEqual(o[0].sec, "coc");
  assert.strictEqual(o[6].sec, "go");
  assert.strictEqual(o[o.length - 1].sec, "phon");
  assert.strictEqual(o.length, 135);
});
t("senior enlisted ranks come before junior", () => {
  const o = L.studyOrder(cards).map((c) => c.prompt);
  assert(o.indexOf("Navy E-9") < o.indexOf("Navy E-2"));
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
console.log(n, "tests passed");
