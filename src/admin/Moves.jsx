// Pohyby skladu: historie naskladnění, inventur a odpisů.
import { useMemo, useState } from "react";
import { MOVE_TYPES, kc } from "../lib/stock.js";
import { PageHead, Search, norm } from "../ui.jsx";

const DAY = 86400000;

export function AdminMoves({ state, go }) {
  const moves = state.stockMoves || [];
  const [type, setType] = useState("all");
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(100);

  const list = moves.filter((m) => (type === "all" || m.type === type || (type === "in" && m.type === "new")) && (!q || norm(m.name).includes(norm(q)) || norm(m.note).includes(norm(q))));

  const month = useMemo(() => {
    const from = Date.now() - 30 * DAY;
    const r = { inQty: 0, inCost: 0, lossQty: 0, lossCost: 0, countDiff: 0 };
    for (const m of moves) {
      if (m.ts < from) continue;
      if (m.type === "in" || m.type === "new") { r.inQty += m.qty; r.inCost += m.qty * (m.cost || 0); }
      if (m.type === "loss") { r.lossQty += -m.qty; r.lossCost += -m.qty * (m.cost ?? state.products.find((p) => p.id === m.productId)?.cost ?? 0); }
      if (m.type === "count") r.countDiff += m.qty;
    }
    return r;
  }, [moves, state.products]);

  return (
    <>
      <PageHead title="Pohyby skladu" sub="Kdy se co naskladnilo, odepsalo nebo opravilo inventurou. Prodeje najdeš v Útratách.">
        <button className="btn btn-primary" onClick={() => go("restock")}>📥 Naskladnit</button>
      </PageHead>

      <div className="stat-grid">
        <div className="stat"><div className="stat-label">📥 Naskladněno (30 dní)</div><div className="stat-val">{month.inQty} ks</div><div className="stat-sub">{month.inCost ? `za ${kc(month.inCost)}` : "bez nákupních cen"}</div></div>
        <div className="stat"><div className="stat-label">🗑 Odepsáno (30 dní)</div><div className="stat-val" style={{ color: month.lossQty ? "var(--red)" : undefined }}>{month.lossQty} ks</div><div className="stat-sub">{month.lossCost ? `cca ${kc(month.lossCost)}` : "—"}</div></div>
        <div className="stat"><div className="stat-label">📋 Rozdíl z inventur</div><div className="stat-val" style={{ color: month.countDiff < 0 ? "var(--red)" : undefined }}>{month.countDiff > 0 ? "+" : ""}{month.countDiff} ks</div><div className="stat-sub">{state.lastCount ? `poslední ${state.lastCount.date.replace(/\s+\d{1,2}:\d{2}(:\d{2})?$/, "")}` : "zatím žádná"}</div></div>
      </div>

      <div className="toolbar">
        <Search value={q} onChange={setQ} placeholder="Hledat produkt nebo poznámku…" />
        <div className="chips">
          {[["all", "Vše"], ["in", "Naskladnění"], ["count", "Inventury"], ["loss", "Odpisy"]].map(([k, l]) => (
            <button key={k} className={`chip${type === k ? " active" : ""}`} onClick={() => setType(k)}>{l}</button>
          ))}
        </div>
      </div>

      <div className="table-wrap responsive">
        <table>
          <thead><tr><th>Datum</th><th>Produkt</th><th>Typ</th><th className="r">Změna</th><th className="r">Stav po</th><th>Poznámka</th></tr></thead>
          <tbody>
            {list.slice(0, limit).map((m) => {
              const t = MOVE_TYPES[m.type] || MOVE_TYPES.in;
              return (
                <tr key={m.id}>
                  <td data-label="Datum" className="muted num" style={{ fontSize: ".85rem", whiteSpace: "nowrap" }}>{m.date}</td>
                  <td className="full" style={{ fontWeight: 600 }}>{m.emoji} {m.name}</td>
                  <td data-label="Typ"><span className={`badge ${t.cls}`}>{t.icon} {t.label}</span></td>
                  <td data-label="Změna" className={`r num ${m.qty >= 0 ? "diff-pos" : "diff-neg"}`}>{m.qty > 0 ? "+" : ""}{m.qty}{m.cost ? <div className="muted" style={{ fontSize: ".75rem", fontWeight: 400 }}>{m.cost} Kč/ks</div> : null}</td>
                  <td data-label="Stav po" className="r num">{m.stockAfter}</td>
                  <td data-label="Poznámka" className="muted" style={{ fontSize: ".88rem" }}>{m.note || "—"}{m.source === "receipt" && " 🧾"}</td>
                </tr>
              );
            })}
            {!list.length && <tr><td colSpan={6}><div className="empty"><div className="big">🔁</div>{moves.length ? "Nic neodpovídá filtru." : "Zatím žádné pohyby. Objeví se tu po prvním naskladnění, inventuře nebo odpisu."}</div></td></tr>}
          </tbody>
        </table>
      </div>
      {list.length > limit && <button className="btn btn-ghost" onClick={() => setLimit(limit + 200)}>Zobrazit další</button>}
    </>
  );
}
