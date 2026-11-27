// Společné funkce pro server: čtení a ukládání dat v Netlify Blobs
// (jednoduchá online "databáze", která je součástí Netlify zdarma).
import { getStore } from "@netlify/blobs";
import { initialState, reducer } from "../../src/shared/data.js";

const KEY = "state";
const db = () => getStore({ name: "lkra-bar", consistency: "strong" });

export const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export async function readState() {
  const res = await db().getWithMetadata(KEY, { type: "json" });
  return res?.data ?? initialState();
}

// Bezpečná změna dat: když dva lidé uloží naráz, druhý to zkusí znovu
// s čerstvými daty, takže se žádná změna neztratí.
export async function updateState(fn) {
  for (let attempt = 0; attempt < 12; attempt++) {
    if (attempt) await new Promise((r) => setTimeout(r, 30 + Math.random() * 120 * attempt));
    const res = await db().getWithMetadata(KEY, { type: "json" });
    const current = res?.data ?? initialState();
    const next = fn(current);
    if (next === current) return current;
    const opts = res ? { onlyIfMatch: res.etag } : { onlyIfNew: true };
    const { modified } = await db().setJSON(KEY, next, opts);
    if (modified) return next;
  }
  const err = new Error("Server je teď vytížený, zkus to prosím znovu.");
  err.status = 503;
  throw err;
}

export const apply = (action) => (state) => reducer(state, action);

// Co smí vidět kdokoli (tablet v baru): žádné PINy, e-maily ani zůstatky ostatních.
export function publicState(s) {
  return {
    products: s.products
      .filter((p) => !p.hidden)
      .map(({ id, name, category, price, emoji, stock, special }) => ({ id, name, category, price, emoji, stock, special })),
    members: s.members.map(({ id, name, avatar }) => ({ id, name, avatar })),
    bankAccount: s.bankAccount,
    lowBalanceThreshold: s.lowBalanceThreshold,
  };
}

// Co vidí správce: všechno kromě PINů.
export function adminState(s) {
  return { ...s, members: s.members.map(({ pin, ...m }) => m) };
}

// ─── Ochrana proti hádání PINů a hesla ────────────────────────────────────────
// Po 5 chybách se daný účet na 15 minut zamkne.
const MAX_FAILS = 5, LOCK_MS = 15 * 60 * 1000;
const sec = () => getStore({ name: "lkra-bar-security", consistency: "strong" });

export async function isLocked(who) {
  const r = await sec().get(who, { type: "json" });
  return !!(r && r.until && r.until > Date.now());
}
export async function recordFail(who) {
  const r = (await sec().get(who, { type: "json" })) || { fails: 0 };
  const fails = (r.until && r.until < Date.now() ? 0 : r.fails) + 1;
  await sec().setJSON(who, { fails, until: fails >= MAX_FAILS ? Date.now() + LOCK_MS : 0 });
}
export async function clearFails(who) {
  await sec().delete(who);
}

// Ověří heslo správce z hlavičky x-admin-password.
// Vrátí null, když je vše v pořádku, jinak odpověď s chybou.
export async function checkAdmin(req) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return json({ error: "Na Netlify chybí nastavení ADMIN_PASSWORD." }, 503);
  if (await isLocked("admin")) return json({ error: "Moc pokusů. Zkus to za 15 minut." }, 429);
  if (req.headers.get("x-admin-password") !== expected) {
    await recordFail("admin");
    return json({ error: "Špatné heslo" }, 401);
  }
  await clearFails("admin");
  return null;
}
