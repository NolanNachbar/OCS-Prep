// Pure queue selection for a Study session, so it can be tested under node (tools/test_lib.mjs).
// A card is due when its due date has come, unless it was already reviewed today
// (after the ship date every pass is due "today", and "Check due cards" must not re-serve it).
export function isDue(cs, today) {
  return !!(cs && cs.due && cs.due <= today && cs.last !== today);
}

// Owner-set topic order for Study's new cards (Listen, Test and Cards keep their own order).
export const TOPICS = ["phon", "basics", "coc", "go", "chain", "watch", "dev", "const"];
export const PART = 12; // a topic over 12 cards and over 100 words comes in parts of 12
const wc = (c) => String(c.key || "").split(/\s+/).filter(Boolean).length;

// The current topic: the first in TOPICS with unseen cards. take: the default count for its next session.
/** @param {{ order: any[], cards: Record<string, any> }} a */
export function currentTopic({ order, cards }) {
  for (const sec of TOPICS) {
    const all = order.filter((c) => c.sec === sec);
    const unseen = all.filter((c) => !cards[c.id]);
    if (!unseen.length) continue;
    const whole = all.length <= PART || all.reduce((n, c) => n + wc(c), 0) <= 100;
    const parts = whole ? 1 : Math.ceil(all.length / PART);
    const part = whole ? 1 : Math.min(parts, Math.floor((all.length - unseen.length) / PART) + 1);
    const take = whole ? unseen.length : Math.min(unseen.length, PART);
    const name = all[0].secName;
    return { sec, name, unseen: unseen.map((c) => c.id), take, part, parts, label: parts > 1 ? `${name}, part ${part} of ${parts}` : name };
  }
  return null;
}

// order: cards in study order (ranks already removed). cards: the store's card states.
// intro: { date, n } new cards introduced today. extra: allowance on top of newPerDay ("Learn N more").
// Returns { pinned, reviews, news }, each a list of { id, stage }: pins first, then reviews (oldest due first,
// capped at maxReviews), then new cards up to the day's allowance. New cards always join, not only when nothing is due.
// Topic mode (settings.learn !== "count"): new cards come from the current topic only, in card order, one topic a day.
// now: the learner asked for the next topic today ("Learn it now"). take: the learn-fewer count for that session.
/** @param {{ order: any[], cards: Record<string, any>, pins?: string[], today: string, settings: { newPerDay: number, maxReviews?: number, learn?: string }, intro: { date: string, n: number }, extra?: number, now?: boolean, take?: number }} a */
export function buildQueue({ order, cards, pins = [], today, settings, intro, extra = 0, now = false, take }) {
  const known = new Set(order.map((c) => c.id));
  const n = intro && intro.date === today ? intro.n : 0;
  const stage = (id) => (cards[id] ? (cards[id].box >= 2 ? 4 : 2) : 0);
  const pinned = pins.filter((id) => known.has(id)).map((id) => ({ id, stage: stage(id) }));
  const reviews = order
    .filter((c) => !pins.includes(c.id) && isDue(cards[c.id], today))
    .sort((a, b) => cards[a.id].due.localeCompare(cards[b.id].due) || cards[a.id].box - cards[b.id].box)
    .slice(0, settings.maxReviews ?? 60)
    .map((c) => ({ id: c.id, stage: stage(c.id) }));
  if (settings.learn !== "count") {
    const top = currentTopic({ order, cards });
    const want = top && (now || n === 0) ? Math.max(0, Math.min(top.take, take ?? top.take)) : 0;
    const news = top ? top.unseen.filter((id) => !pins.includes(id)).slice(0, want).map((id) => ({ id, stage: 0 })) : [];
    return { pinned, reviews, news };
  }
  const room = Math.max(0, settings.newPerDay + extra - n);
  const news = order.filter((c) => !cards[c.id] && !pins.includes(c.id)).slice(0, room).map((c) => ({ id: c.id, stage: 0 }));
  return { pinned, reviews, news };
}

// New cards still allowed today under the base allowance (0 when none are unseen).
/** @param {{ order: { id: string }[], cards: Record<string, any>, today: string, settings: { newPerDay: number }, intro: { date: string, n: number } }} a */
export function newLeft({ order, cards, today, settings, intro }) {
  const n = intro && intro.date === today ? intro.n : 0;
  const unseen = order.filter((c) => !cards[c.id]).length;
  return Math.min(unseen, Math.max(0, settings.newPerDay - n));
}
