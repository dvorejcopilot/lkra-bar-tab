// Výpočty pro přehled skladu: prodeje, spotřeba za den, na jak dlouho zásoba vystačí,
// a kolik doporučujeme dokoupit.
import { DEFAULT_MIN_STOCK } from "../shared/data.js";

const DAY = 86400000;

// Čas transakce v ms. Nové transakce mají "ts", starší jen český text data.
export function txTime(t) {
  if (t.ts) return t.ts;
  const m = /(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/.exec(t.date || "");
  if (m) return new Date(+m[3], +m[2] - 1, +m[1], +(m[4] || 0), +(m[5] || 0)).getTime();
  return t.id > 1e12 ? t.id : 0;
}

export const minOf = (p) => (p.minStock ?? DEFAULT_MIN_STOCK);

export function stockStatus(p) {
  if (p.stock <= 0) return "out";
  if (p.stock <= minOf(p)) return "low";
  return "ok";
}
export const STATUS = {
  out: { label: "Vyprodáno", cls: "badge-bad", color: "var(--red)" },
  low: { label: "Dochází", cls: "badge-warn", color: "var(--amber)" },
  ok: { label: "V pořádku", cls: "badge-ok", color: "var(--green)" },
};

// Prodané kusy po produktech za posledních `days` dní.
export function salesSince(transactions, products, days, now = Date.now()) {
  const from = now - days * DAY;
  const byName = new Map(products.map((p) => [p.name, p.id]));
  const out = new Map();
  for (const t of transactions) {
    if (txTime(t) < from) continue;
    for (const i of t.items) {
      const id = i.id ?? byName.get(i.name);
      if (id === undefined) continue;
      out.set(id, (out.get(id) || 0) + i.qty);
    }
  }
  return out;
}

// Statistiky ke každému produktu.
export function productStats(state, days = 30) {
  const sold = salesSince(state.transactions, state.products, days);
  const first = state.transactions.reduce((m, t) => Math.min(m, txTime(t) || Infinity), Infinity);
  // Když appka běží kratší dobu než `days`, počítej spotřebu jen za skutečnou dobu provozu.
  const span = Math.max(1, Math.min(days, Number.isFinite(first) ? (Date.now() - first) / DAY : days));
  return state.products.map((p) => {
    const s = sold.get(p.id) || 0;
    const perDay = s / span;
    const daysLeft = perDay > 0 ? p.stock / perDay : Infinity;
    const min = minOf(p);
    const status = stockStatus(p);
    // Doporučené doplnění: na 2× minimum, nebo na ~3 týdny spotřeby (co je víc)
    const target = Math.max(min * 2, Math.ceil(perDay * 21));
    const suggest = status === "ok" && daysLeft > 7 ? 0 : Math.max(0, target - p.stock);
    return { ...p, sold: s, perDay, daysLeft, min, status, suggest };
  });
}

export function stockValue(products) {
  let sale = 0, cost = 0, costKnown = 0;
  for (const p of products) {
    const n = Math.max(0, p.stock);
    sale += n * (p.price || 0);
    if (p.cost !== undefined && p.cost !== null) { cost += n * p.cost; costKnown++; }
  }
  return { sale, cost, costKnown };
}

export function fmtDays(d) {
  if (!Number.isFinite(d)) return "—";
  if (d < 1) return "< 1 den";
  const n = Math.round(d);
  if (n > 365) return "> rok";
  return `${n} ${n === 1 ? "den" : n < 5 ? "dny" : "dní"}`;
}

export const kc = (n) => `${Math.round(n || 0).toLocaleString("cs-CZ")} Kč`;

export const MOVE_TYPES = {
  in: { label: "Naskladnění", cls: "badge-ok", icon: "📥" },
  new: { label: "Nový produkt", cls: "badge-gold", icon: "✨" },
  count: { label: "Inventura", cls: "badge-blue", icon: "📋" },
  loss: { label: "Odpis", cls: "badge-bad", icon: "🗑" },
};
