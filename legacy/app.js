// Navy OCS PREP: UI. Logic lives in lib.js (OCS), hooks in hooks.js (HOOKS).
(function () {
  "use strict";
  const L = window.OCS;
  const KEY = "ocsprep.v1";
  const $app = document.getElementById("app");
  let CARDS = [];
  let ORDER = [];
  let st = null;

  // ---- storage ---------------------------------------------------------------------------
  const DEFAULTS = () => ({
    v: 1,
    settings: { ship: "2027-04-01", newPerDay: 5, threshold: 0.95, rate: 1, gap: 6 },
    cards: {},
    intro: { date: "", n: 0 },
    edits: {},
    log: [],
  });
  function load() {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(KEY)); } catch (e) { /* private mode or empty */ }
    st = Object.assign(DEFAULTS(), s || {});
    st.settings = Object.assign(DEFAULTS().settings, st.settings);
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* storage unavailable */ }
  }
  const today = () => L.ymd(new Date());
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const card = (id) => CARDS.find((c) => c.id === id);

  function applyEdits() {
    for (const c of CARDS) {
      const e = st.edits[c.id];
      if (e) { c.answer = e; c.key = e; }
    }
  }
  function secIndex(c) {
    return CARDS.filter((x) => x.sec === c.sec).indexOf(c);
  }
  function hookFor(c) {
    const h = window.HOOKS && window.HOOKS[c.sec];
    if (!h) return "";
    return typeof h === "function" ? h(secIndex(c)) : h[secIndex(c)] || "";
  }

  // ---- speech ----------------------------------------------------------------------------
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  function speak(text, done) {
    if (!("speechSynthesis" in window)) { if (done) done(); return; }
    const u = new SpeechSynthesisUtterance(text);
    u.rate = st.settings.rate;
    u.onend = () => done && done();
    u.onerror = () => done && done();
    speechSynthesis.speak(u);
  }
  function micFor(textarea, btn) {
    if (!SR) { btn.style.display = "none"; return; }
    let rec = null;
    btn.onclick = () => {
      if (rec) { rec.stop(); return; }
      rec = new SR();
      rec.lang = "en-US"; rec.interimResults = true; rec.continuous = true;
      const base = textarea.value ? textarea.value + " " : "";
      rec.onresult = (ev) => {
        let t = "";
        for (let i = 0; i < ev.results.length; i++) t += ev.results[i][0].transcript;
        textarea.value = base + t;
      };
      rec.onend = () => { rec = null; btn.textContent = "Mic"; };
      btn.textContent = "Stop";
      try { rec.start(); } catch (e) { rec = null; btn.textContent = "Mic"; }
    };
  }

  // ---- shared rendering ------------------------------------------------------------------
  function diffHtml(r) {
    const words = r.expected.map((w, i) => `<span class="${r.hit[i] ? "w-ok" : "w-no"}">${esc(w)}</span>`).join(" ");
    const extra = r.extra.length ? `<div class="mute">Extra words: <span class="w-x">${esc(r.extra.join(" "))}</span></div>` : "";
    return `<div class="ans">${words}</div>${extra}<div class="mute">${Math.round(r.ratio * 100)}% of the words, in order</div>`;
  }
  function logResult(ok) {
    const d = today();
    let e = st.log.find((x) => x.d === d);
    if (!e) { e = { d, n: 0, ok: 0 }; st.log.push(e); }
    e.n++; if (ok) e.ok++;
    if (st.log.length > 400) st.log.shift();
  }
  function cardState(id) { return st.cards[id]; }
  function dueCards() {
    const t = today();
    return ORDER.filter((c) => st.cards[c.id] && st.cards[c.id].due && st.cards[c.id].due <= t);
  }
  function newCards() {
    return ORDER.filter((c) => !st.cards[c.id]);
  }
  function learnedCards() {
    return ORDER.filter((c) => st.cards[c.id]);
  }
  function clozeHtml(c, stage, idx) {
    const frac = stage === 1 ? 0.35 : 0.7;
    const toks = L.cloze(c, frac, 1);
    let bi = 0;
    return toks.map((t) => {
      if (!t.blank) return esc(t.text);
      const n = Math.max(3, L.norm(t.text).length);
      return `<input class="blank" data-i="${bi++}" data-w="${esc(L.norm(t.text))}" size="${Math.min(n, 14)}" autocomplete="off" autocapitalize="none" spellcheck="false">`;
    }).join(" ");
  }

  // ---- STUDY -----------------------------------------------------------------------------
  let S = null;
  function startStudy(extra) {
    const t = today();
    if (st.intro.date !== t) st.intro = { date: t, n: 0 };
    const reviews = dueCards().map((c) => ({ id: c.id, stage: st.cards[c.id].box >= 2 ? 3 : 2, review: true }));
    const room = Math.max(0, st.settings.newPerDay + (extra || 0) - st.intro.n);
    const fresh = newCards().slice(0, room).map((c) => ({ id: c.id, stage: 0, fresh: true }));
    S = { queue: reviews.concat(fresh), total: reviews.length + fresh.length, done: 0, started: false, miss: 0 };
    renderStudy();
  }
  function requeue(item, gap) {
    const at = Math.min(S.queue.length, gap);
    S.queue.splice(at, 0, item);
  }
  function renderStudy() {
    if (!S) { startStudy(0); return; }
    if (!S.queue.length) {
      const left = newCards().length;
      save();
      $app.innerHTML = `<div class="card"><div class="prompt">Session done</div>
        <p>${S.done} of ${S.total} items cleared, ${S.miss} misses.</p>
        <p class="mute">${left} cards still unseen. ${dueCards().length} due today.</p>
        ${left ? `<button class="btn" id="more">Learn ${st.settings.newPerDay} more</button>` : ""}
        <button class="btn alt" id="again">Check for due cards</button></div>`;
      const m = document.getElementById("more"); if (m) m.onclick = () => startStudy(st.intro.n);
      document.getElementById("again").onclick = () => startStudy(0);
      return;
    }
    const item = S.queue[0];
    const c = card(item.id);
    const pct = S.total ? Math.round((S.done / S.total) * 100) : 0;
    const head = `<div class="meta"><span>${S.queue.length} left</span><span>${S.done} of ${S.total} cleared</span></div><div class="bar"><i style="width:${pct}%"></i></div>
      <div class="sec">${esc(c.secName)} <span class="chip">${item.stage === 0 ? "learn" : item.stage < 3 ? "fill the blanks" : "from memory"}</span>${item.missed ? '<span class="chip r">retry</span>' : ""}</div>
      <div class="prompt">${esc(c.prompt)}</div>`;
    const hook = hookFor(c);
    const hookHtml = hook ? `<div class="hook">${esc(hook)}</div>` : "";

    if (item.stage === 0) {
      $app.innerHTML = `<div class="card">${head}
        ${c.lead ? `<div class="lead">${esc(c.lead)}</div>` : ""}<div class="ans">${esc(c.answer)}</div>${hookHtml}
        <p class="mute">Read it, then say it out loud once without looking. Then tap below.</p>
        <button class="btn" id="go">I said it aloud</button>
        <button class="btn alt" id="hear">Hear it</button></div>`;
      document.getElementById("hear").onclick = () => speak((c.lead ? c.lead + " " : "") + c.answer);
      document.getElementById("go").onclick = () => {
        S.queue.shift();
        if (!st.cards[c.id]) { st.cards[c.id] = { box: 0, reps: 0, lapses: 0, due: today(), misses: 0 }; st.intro.n++; }
        requeue({ id: c.id, stage: 1, fresh: true }, 3);
        save(); renderStudy();
      };
      return;
    }

    if (item.stage < 3) {
      $app.innerHTML = `<div class="card">${head}
        ${c.lead ? `<div class="lead">${esc(c.lead)}</div>` : ""}<div class="ans" id="cz">${clozeHtml(c, item.stage)}</div>
        <div id="fb"></div>
        <button class="btn" id="chk">Check</button><button class="btn alt" id="peek">Show answer</button></div>`;
      const first = $app.querySelector("input.blank"); if (first) first.focus();
      document.getElementById("peek").onclick = () => finish(item, c, { ok: false, ratio: 0, expected: L.words(c.key), hit: L.words(c.key).map(() => false), extra: [] }, true);
      document.getElementById("chk").onclick = () => {
        const ins = [...$app.querySelectorAll("input.blank")];
        let good = 0;
        ins.forEach((i) => { const ok = L.norm(i.value) === i.dataset.w; i.classList.add(ok ? "ok" : "no"); if (ok) good++; });
        const ok = good === ins.length;
        finish(item, c, { ok, ratio: ins.length ? good / ins.length : 1, expected: L.words(c.key), hit: L.words(c.key).map(() => ok), extra: [] }, false, ins.length ? `${good} of ${ins.length} blanks right` : "");
      };
      return;
    }

    $app.innerHTML = `<div class="card">${head}
      ${c.lead ? `<div class="lead">Start with: ${esc(c.lead)}</div>` : ""}
      <textarea id="ta" placeholder="Type it, or use the keyboard mic (dictation)" autocapitalize="none" spellcheck="false"></textarea>
      <div id="fb"></div>
      <button class="btn" id="chk">Check</button><button class="btn alt" id="mic">Mic</button><button class="btn alt" id="peek">Show answer</button></div>`;
    const ta = document.getElementById("ta"); ta.focus();
    micFor(ta, document.getElementById("mic"));
    document.getElementById("peek").onclick = () => finish(item, c, { ok: false, ratio: 0, expected: L.words(c.key), hit: L.words(c.key).map(() => false), extra: [] }, true);
    document.getElementById("chk").onclick = () => finish(item, c, L.score(c, ta.value, st.settings.threshold), false);
  }
  function finish(item, c, r, peeked, note) {
    const fb = document.getElementById("fb");
    const cs = st.cards[c.id];
    if (!r.ok && cs) cs.misses = (cs.misses || 0) + 1;
    logResult(r.ok);
    fb.innerHTML = `<div style="margin:10px 0">${r.ok ? '<span class="w-ok">Correct.</span>' : '<span class="w-no">Not yet.</span>'} ${note ? `<span class="mute">${esc(note)}</span>` : ""}</div>${diffHtml(r)}${!r.ok && c.lead ? `<div class="lead">${esc(c.lead)}</div>` : ""}`;
    const row = document.createElement("div");
    row.innerHTML = `<button class="btn" id="next">Next</button>${!r.ok && !peeked ? '<button class="btn alt" id="force">Count as correct</button>' : ""}`;
    fb.appendChild(row);
    document.getElementById("chk").style.display = "none";
    document.getElementById("peek").style.display = "none";
    const m = document.getElementById("mic"); if (m) m.style.display = "none";
    const advance = (ok) => {
      S.queue.shift();
      if (!ok) { S.miss++; item.missed = true; requeue({ id: c.id, stage: Math.max(1, item.stage - 1), missed: true, review: item.review, fresh: item.fresh }, 3); }
      else if (item.stage < 3) requeue({ id: c.id, stage: item.stage + 1, missed: item.missed, fresh: item.fresh }, 4);
      else {
        let s = st.cards[c.id] || { box: 0, reps: 0, lapses: 0 };
        if (item.missed && s.reps > 0) s = Object.assign({}, s, { box: 0, lapses: (s.lapses || 0) + 1 });
        st.cards[c.id] = Object.assign({ misses: s.misses || 0 }, L.schedule(s, true, today(), st.settings.ship));
        S.done++;
      }
      save(); renderStudy();
    };
    document.getElementById("next").onclick = () => advance(r.ok);
    const f = document.getElementById("force"); if (f) f.onclick = () => advance(true);
    document.getElementById("next").focus();
  }

  // ---- TEST ------------------------------------------------------------------------------
  let T = null, tick = null;
  function renderTestSetup() {
    const learned = learnedCards().length;
    $app.innerHTML = `<div class="card"><div class="prompt">OCS test</div>
      <p class="mute">Rapid fire like the RLP: a prompt, a clock, answer out loud first, then type or dictate it. Keep going on a miss. Misses come back as due cards.</p>
      <label>Cards from</label><select id="src"><option value="learned">Cards I have started (${learned})</option><option value="all">All 135</option></select>
      <label>How many</label><select id="cnt"><option>10</option><option selected>20</option><option>40</option><option>999</option></select>
      <label>Seconds per card</label><select id="sec"><option>10</option><option selected>20</option><option>30</option><option>45</option></select>
      <label><input type="checkbox" id="spk" style="width:auto"> Read each prompt aloud</label>
      <button class="btn" id="go">Start</button></div>`;
    document.getElementById("go").onclick = () => {
      const pool = document.getElementById("src").value === "all" ? CARDS.slice() : learnedCards();
      if (!pool.length) { alert("Start some cards in Study first, or choose All 135."); return; }
      for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
      T = { q: pool.slice(0, +document.getElementById("cnt").value), i: 0, secs: +document.getElementById("sec").value, spk: document.getElementById("spk").checked, res: [] };
      renderTest();
    };
  }
  function renderTest() {
    clearInterval(tick);
    if (T.i >= T.q.length) { renderTestEnd(); return; }
    const c = T.q[T.i];
    let left = T.secs;
    $app.innerHTML = `<div class="card"><div class="sec">${T.i + 1} of ${T.q.length}</div>
      <div class="timer"><i id="tm" style="width:100%"></i></div>
      <div class="big">${esc(c.prompt)}</div>
      <textarea id="ta" placeholder="Answer now" autocapitalize="none" spellcheck="false"></textarea>
      <div id="fb"></div>
      <button class="btn" id="sub">Submit</button><button class="btn alt" id="mic">Mic</button></div>`;
    const ta = document.getElementById("ta"); ta.focus();
    micFor(ta, document.getElementById("mic"));
    if (T.spk) speak(c.prompt);
    const sub = () => {
      clearInterval(tick);
      const r = L.score(c, ta.value, st.settings.threshold);
      T.res.push({ id: c.id, ok: r.ok });
      logResult(r.ok);
      const cs = st.cards[c.id];
      if (!r.ok && cs) { cs.box = 0; cs.due = today(); cs.misses = (cs.misses || 0) + 1; }
      const fb = document.getElementById("fb");
      fb.innerHTML = `<div style="margin:10px 0">${r.ok ? '<span class="w-ok">Correct.</span>' : '<span class="w-no">Miss. Keep going.</span>'}</div>${diffHtml(r)}${c.lead ? `<div class="lead">${esc(c.lead)}</div>` : ""}<button class="btn" id="nx">Next</button>`;
      document.getElementById("sub").style.display = "none"; document.getElementById("mic").style.display = "none"; ta.disabled = true;
      document.getElementById("nx").onclick = () => { T.i++; save(); renderTest(); };
      document.getElementById("nx").focus();
    };
    document.getElementById("sub").onclick = sub;
    tick = setInterval(() => {
      left -= 0.25;
      const tm = document.getElementById("tm"); if (tm) tm.style.width = Math.max(0, (left / T.secs) * 100) + "%";
      if (left <= 0) { clearInterval(tick); if (document.getElementById("sub") && document.getElementById("sub").style.display !== "none") sub(); }
    }, 250);
  }
  function renderTestEnd() {
    const ok = T.res.filter((r) => r.ok).length;
    const miss = T.res.filter((r) => !r.ok).map((r) => card(r.id));
    $app.innerHTML = `<div class="card"><div class="prompt">${ok} of ${T.res.length} clean (${T.res.length ? Math.round((ok / T.res.length) * 100) : 0}%)</div>
      ${miss.length ? `<div class="list">${miss.map((c) => `<div><b>${esc(c.prompt)}</b><div class="mute">${esc((c.lead ? c.lead + " " : "") + c.answer)}</div></div>`).join("")}</div>` : "<p>No misses.</p>"}
      <button class="btn" id="re">Run another</button></div>`;
    document.getElementById("re").onclick = renderTestSetup;
  }

  // ---- DRILL (sequences) -----------------------------------------------------------------
  function renderDrill(secKey) {
    const opts = [["chain", "Chain of Command"], ["go", "General Orders"], ["coc", "Code of Conduct"], ["const", "Constitution"], ["watch", "Watchstanding"], ["phon", "Phonetic Alphabet"]];
    secKey = secKey || "chain";
    const cs = CARDS.filter((c) => c.sec === secKey);
    $app.innerHTML = `<div class="card"><div class="prompt">Sequence drill</div>
      <p class="mute">Fill in every slot in order from memory. Nothing is shown.</p>
      <select id="sec">${opts.map((o) => `<option value="${o[0]}" ${o[0] === secKey ? "selected" : ""}>${o[1]}</option>`).join("")}</select>
      ${cs.map((c, i) => `<div class="slot"><b>${i + 1}</b><input type="text" data-id="${c.id}" autocapitalize="none" spellcheck="false" autocomplete="off"></div>`).join("")}
      <div id="fb"></div>
      <button class="btn" id="chk">Check all</button></div>`;
    document.getElementById("sec").onchange = (e) => renderDrill(e.target.value);
    document.getElementById("chk").onclick = () => {
      let good = 0; const wrong = [];
      $app.querySelectorAll("input[data-id]").forEach((inp) => {
        const c = card(inp.dataset.id);
        const r = L.score(c, inp.value, st.settings.threshold);
        inp.style.borderColor = r.ok ? "var(--ok)" : "var(--bad)";
        if (r.ok) good++; else wrong.push(c);
        logResult(r.ok);
      });
      save();
      document.getElementById("fb").innerHTML = `<div style="margin:10px 0"><b>${good} of ${cs.length}</b></div>${wrong.map((c) => `<div class="mute"><b>${esc(c.prompt)}:</b> ${esc(c.key)}</div>`).join("")}`;
    };
  }

  // ---- LISTEN (hands-free) ---------------------------------------------------------------
  let listening = false;
  function renderListen() {
    $app.innerHTML = `<div class="card"><div class="prompt">Listen and recite</div>
      <p class="mute">For runs and workouts. It reads the prompt, waits for you to say the answer, then reads the answer. Needs the screen on and the page open: this is a web page, so locked-screen audio is not guaranteed on iPhone.</p>
      <label>Cards</label><select id="from"><option value="learned">Started cards</option><option value="all">All 135</option><option value="coc">Code of Conduct</option><option value="go">General Orders</option><option value="chain">Chain of Command</option></select>
      <label>Pause for your answer (seconds)</label><input type="number" id="gap" min="2" max="40" value="${st.settings.gap}">
      <button class="btn" id="go">Start</button><button class="btn alt" id="stop">Stop</button>
      <div id="now" class="big" style="font-size:22px"></div></div>`;
    document.getElementById("stop").onclick = () => { listening = false; speechSynthesis.cancel(); };
    document.getElementById("go").onclick = () => {
      const v = document.getElementById("from").value;
      let pool = v === "learned" ? learnedCards() : v === "all" ? ORDER.slice() : CARDS.filter((c) => c.sec === v);
      if (!pool.length) { alert("Start some cards in Study first."); return; }
      st.settings.gap = +document.getElementById("gap").value || 6; save();
      listening = true; let i = 0;
      const step = () => {
        if (!listening) return;
        const c = pool[Math.floor(Math.random() * pool.length)];
        const now = document.getElementById("now"); if (now) now.textContent = c.prompt;
        speak(c.prompt, () => setTimeout(() => {
          if (!listening) return;
          speak((c.lead ? c.lead + " " : "") + c.answer, () => setTimeout(step, 1200));
        }, st.settings.gap * 1000));
        i++;
      };
      step();
    };
  }

  // ---- CARDS -----------------------------------------------------------------------------
  function status(c) {
    const s = st.cards[c.id];
    if (!s) return '<span class="chip">new</span>';
    if (s.box >= 4) return '<span class="chip g">solid</span>';
    if (s.misses >= 3 && s.box < 3) return '<span class="chip r">weak</span>';
    return `<span class="chip">box ${s.box}</span>`;
  }
  function renderCards() {
    const secs = [...new Set(CARDS.map((c) => c.sec))];
    const started = learnedCards().length;
    $app.innerHTML = `<div class="card"><div class="prompt">${started} of ${CARDS.length} started</div>
      <div class="bar"><i style="width:${(started / CARDS.length) * 100}%"></i></div>
      <p class="mute">${dueCards().length} due today. ${CARDS.filter((c) => (st.cards[c.id] || {}).box >= 4).length} solid.</p></div>` +
      secs.map((k) => {
        const cs = CARDS.filter((c) => c.sec === k);
        return `<details class="card"><summary><b>${esc(cs[0].secName)}</b> <span class="chip">${cs.filter((c) => st.cards[c.id]).length}/${cs.length}</span></summary><div class="list">${cs.map((c) =>
          `<div><b>${esc(c.prompt)}</b> ${status(c)}<div class="mute">${esc((c.lead ? c.lead + " " : "") + c.answer)}</div>${k === "chain" ? `<button class="btn alt" data-edit="${c.id}" style="padding:6px 12px;font-size:14px">Edit this link</button>` : ""}</div>`).join("")}</div></details>`;
      }).join("");
    $app.querySelectorAll("[data-edit]").forEach((b) => b.onclick = () => {
      const c = card(b.dataset.edit);
      const v = prompt(`${c.prompt}\nThe chain of command differs by class. Enter the title and name for this link:`, c.answer);
      if (v && v.trim()) { st.edits[c.id] = v.trim(); applyEdits(); save(); renderCards(); }
    });
  }

  // ---- MORE ------------------------------------------------------------------------------
  function renderMore() {
    const days = L.daysBetween(today(), st.settings.ship);
    const week = st.log.slice(-7);
    $app.innerHTML = `<div class="card"><div class="prompt">Settings</div>
      <label>Ship date</label><input type="date" id="ship" value="${st.settings.ship}">
      <label>New cards per day</label><input type="number" id="npd" min="1" max="30" value="${st.settings.newPerDay}">
      <label>Pass mark (share of words right, in order)</label><select id="thr"><option value="1">100% (perfect)</option><option value="0.95">95%</option><option value="0.9">90%</option></select>
      <label>Voice speed</label><select id="rate"><option value="0.8">Slow</option><option value="1">Normal</option><option value="1.2">Fast</option></select>
      <button class="btn" id="saveSet">Save settings</button></div>
      <div class="card"><div class="prompt">Backup</div>
      <p class="mute">Progress lives in this browser only. If the browser clears site data you lose it, so export now and then.</p>
      <button class="btn" id="exp">Export progress</button><button class="btn alt" id="imp">Import progress</button><input type="file" id="file" accept="application/json" style="display:none">
      <button class="btn bad" id="reset">Reset everything</button></div>
      <div class="card"><div class="prompt">Last 7 study days</div>${week.length ? week.map((e) => `<div class="mute">${e.d}: ${e.ok} of ${e.n} clean</div>`).join("") : '<div class="mute">Nothing yet.</div>'}</div>
      <div class="card"><div class="prompt">Voice input</div>
      <p class="mute">Tap the answer box, then the microphone key on the iPhone keyboard (or press Fn twice on a Mac) and speak. Scoring ignores case and punctuation. ${SR ? "This browser also has a built-in Mic button, which sends audio to the browser vendor." : "This browser has no built-in Mic button, so use keyboard dictation."}</p></div>
      <div class="card"><div class="prompt">About</div><p class="mute">${days} days to ship. Source: OCSINST 1530.1A Appendix B deck, as pasted. The spaced-repetition scheduler is a simple box system with a cap so reviews never slip past a quarter of the time left. Chain of Command varies by class: edit it under Cards.</p></div>`;
    document.getElementById("thr").value = String(st.settings.threshold);
    document.getElementById("rate").value = String(st.settings.rate);
    document.getElementById("saveSet").onclick = () => {
      st.settings.ship = document.getElementById("ship").value || st.settings.ship;
      st.settings.newPerDay = Math.max(1, +document.getElementById("npd").value || 5);
      st.settings.threshold = +document.getElementById("thr").value;
      st.settings.rate = +document.getElementById("rate").value;
      save(); countdown(); renderMore();
    };
    document.getElementById("exp").onclick = () => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([JSON.stringify(st, null, 1)], { type: "application/json" }));
      a.download = `ocs-prep-${today()}.json`; a.click();
    };
    document.getElementById("imp").onclick = () => document.getElementById("file").click();
    document.getElementById("file").onchange = (e) => {
      const f = e.target.files[0]; if (!f) return;
      f.text().then((t) => { const d = JSON.parse(t); if (!d.cards) throw new Error("not a backup"); st = Object.assign(DEFAULTS(), d); applyEdits(); save(); countdown(); renderMore(); }).catch((er) => alert("Import failed: " + er.message));
    };
    document.getElementById("reset").onclick = () => { if (confirm("Erase all progress?")) { st = DEFAULTS(); save(); location.reload(); } };
  }

  // ---- shell -----------------------------------------------------------------------------
  function countdown() {
    const d = L.daysBetween(today(), st.settings.ship);
    document.getElementById("countdown").textContent = d >= 0 ? `${d} days to ship` : "";
  }
  const TABS = { study: () => { S ? renderStudy() : startStudy(0); }, test: renderTestSetup, drill: () => renderDrill(), listen: renderListen, cards: renderCards, more: renderMore };
  function show(tab) {
    clearInterval(tick); listening = false; if ("speechSynthesis" in window) speechSynthesis.cancel();
    document.querySelectorAll("#tabs button").forEach((b) => b.classList.toggle("on", b.dataset.tab === tab));
    try { sessionStorage.setItem("ocsprep.tab", tab); } catch (e) { /* ignore */ }
    TABS[tab]();
  }
  document.getElementById("tabs").addEventListener("click", (e) => { const b = e.target.closest("button[data-tab]"); if (b) { if (b.dataset.tab === "study") S = null; show(b.dataset.tab); } });

  fetch("data/cards.json").then((r) => r.json()).then((d) => {
    CARDS = d; load(); applyEdits(); ORDER = L.studyOrder(CARDS); countdown();
    let tab = "study"; try { tab = sessionStorage.getItem("ocsprep.tab") || "study"; } catch (e) { /* ignore */ }
    show(TABS[tab] ? tab : "study");
  }).catch((e) => { $app.innerHTML = `<div class="card">Could not load the card file: ${esc(e.message)}. Serve this folder over http, do not open index.html as a file.</div>`; });

  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("sw.js").catch(() => {});
})();
