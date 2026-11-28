// POST /api/checkout – zákazník zaplatí košík svým PINem.
// Ceny se berou ze serveru, ne z prohlížeče, aby si nikdo nemohl cenu "upravit".
import { json, readState, updateState, apply, publicState, isLocked, recordFail, clearFails } from "../lib/store.mjs";

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Použij POST" }, 405);
  let body;
  try { body = await req.json(); } catch { return json({ error: "Neplatná data" }, 400); }
  const { memberId, pin, cart } = body || {};
  if (!Array.isArray(cart) || !cart.length) return json({ error: "Prázdný košík" }, 400);

  const who = `member-${memberId}`;
  if (await isLocked(who)) return json({ error: "Moc pokusů. Zkus to za 15 minut." }, 429);

  const state = await readState();
  const member = state.members.find((m) => m.id === memberId);
  if (!member || String(pin) !== String(member.pin)) {
    await recordFail(who);
    return json({ error: "Špatný PIN" }, 401);
  }
  await clearFails(who);

  // Sestav košík z aktuálních cen na serveru
  const items = [];
  for (const c of cart) {
    const qty = Math.floor(Number(c.qty));
    // „Jiná položka“ – vlastní částka zadaná na tabletu (není v nabídce, neubírá sklad)
    if (c && c.custom) {
      const price = Math.floor(Number(c.price));
      if (!(price > 0 && price <= 5000) || !(qty > 0 && qty <= 20)) return json({ error: "Neplatná částka" }, 400);
      items.push({ id: `custom-${String(c.id).replace(/\D/g, "").slice(0, 20)}`, name: "Jiná položka", emoji: "✏️", price, qty, custom: true });
      continue;
    }
    const p = state.products.find((x) => x.id === c.id);
    if (!p || !(qty > 0 && qty <= 50)) return json({ error: "Neplatná položka v košíku" }, 400);
    items.push({ id: p.id, name: p.name, emoji: p.emoji, price: p.price, qty });
  }

  let next;
  try { next = await updateState(apply({ type: "CHECKOUT", memberId, cart: items })); }
  catch (e) { return json({ error: e.message }, e.status || 500); }
  const m = next.members.find((x) => x.id === memberId);
  return json({
    state: publicState(next),
    member: { id: m.id, name: m.name, avatar: m.avatar, balance: m.balance },
    cart: items,
    total: items.reduce((s, i) => s + i.price * i.qty, 0),
  });
};

export const config = { path: "/api/checkout" };
