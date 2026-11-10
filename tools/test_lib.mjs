// Run: node tools/test_lib.mjs
import assert from "assert"; import { readFileSync, readdirSync } from "fs";
const L = await import("../src/lib/ocs.js");
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
console.log(n, "tests passed");
