// Inventura: napočítáš, co je skutečně v lednici a ve skladu, a appka srovná rozdíly.
import { useMemo, useState } from "react";
import { PageHead, ProdCell, Search, norm, useUI } from "../ui.jsx";
import { kc } from "../lib/stock.js";

export function AdminCount({ state, dispatch, go }) {
  const { confirm } = useUI();
  const [counts, setCounts] = useState({});   // { [id]: "12" }
  const [q, setQ] = useState("");
  const [note, setNote] = useState("");

  const prods = useMemo(() => [...state.products]
    .filter((p) => !q || norm(p.name).includes(norm(q)))
    .sort((a, b) => a.category.localeCompare(b.category, "cs") || a.name.localeCompare(b.name, "cs")), [state.products, q]);

  const entered = state.products.filter((p) => counts[p.id] !== undefined && counts[p.id] !== "");
  const diffs = entered.map((p) => ({ p, d: (parseInt(counts[p.id]) || 0) - p.stock })).filter((x) => x.d !== 0);
  const lossValue = diffs.reduce((s, { p, d }) => s + d * (p.cost ?? p.price ?? 0), 0);

  const save = async () => {
    if (!entered.length) return;
    const ok = await confirm({
      title: "Uložit inventuru?",
      text: diffs.length ? `Sedí ${entered.length - diffs.length} z ${entered.length} položek. U ${diffs.length} se stav opraví na napočítaný počet a rozdíl se zapíše do pohybů.` : `Všech ${entered.length} napočítaných položek sedí. Zapíše se jen datum inventury.`,
      ok: "Uložit",
    });
    if (!ok) return;
    if (await dispatch({ type: "STOCK_COUNT", note: note || "Inventura", counts: entered.map((p) => ({ id: p.id, stock: parseInt(counts[p.id]) || 0 })) }, "Inventura uložena")) {
      setCounts({}); setNote("");
    }
  };
  const fillAll = () => setCounts(Object.fromEntries(state.products.map((p) => [p.id, counts[p.id] ?? String(p.stock)])));

  let lastCat = null;
  return (
    <>
      <PageHead title="Inventura" sub={state.lastCount ? `Poslední inventura: ${state.lastCount.date}` : "Zatím žádná inventura. Doporučujeme jednou za měsíc."}>
        <button className="btn btn-ghost" onClick={fillAll}>Předvyplnit podle systému</button>
      </PageHead>
      <div className="info">ℹ️ <div>Napočítej kusy a zapiš je do sloupce <b>Napočítáno</b>. Vyplňovat můžeš jen část, ostatní zůstanou beze změny.</div></div>
      <div className="toolbar"><Search value={q} onChange={setQ} placeholder="Hledat produkt…" /></div>

      <div className="table-wrap responsive">
        <table>
          <thead><tr><th>Produkt</th><th className="r">V systému</th><th style={{ width: 140 }}>Napočítáno</th><th className="r">Rozdíl</th></tr></thead>
          <tbody>
            {prods.flatMap((p) => {
              const v = counts[p.id];
              const d = v === undefined || v === "" ? null : (parseInt(v) || 0) - p.stock;
              const rows = [];
              if (p.category !== lastCat) {
                lastCat = p.category;
                rows.push(<tr key={"c" + p.category}><td colSpan={4} className="full" style={{ background: "#f8fafc", fontSize: ".75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--muted)", padding: "8px 14px" }}>{p.category}</td></tr>);
              }
              rows.push(
                <tr key={p.id}>
                  <td className="full"><ProdCell p={p} /></td>
                  <td data-label="V systému" className="r num">{p.stock}</td>
                  <td data-label="Napočítáno"><input type="number" inputMode="numeric" min={0} value={v ?? ""} onChange={(e) => setCounts({ ...counts, [p.id]: e.target.value })} placeholder="—" style={{ maxWidth: 110, textAlign: "center", fontWeight: 700 }} /></td>
                  <td data-label="Rozdíl" className="r num">{d === null ? <span className="muted">—</span> : d === 0 ? <span className="badge badge-ok">sedí</span> : <span className={d > 0 ? "diff-pos" : "diff-neg"}>{d > 0 ? "+" : ""}{d}</span>}</td>
                </tr>
              );
              return rows;
            })}
          </tbody>
        </table>
      </div>

      <div className="sticky-foot">
        <div style={{ minWidth: 160 }}>
          <div style={{ fontWeight: 800 }}>{entered.length ? `Napočítáno ${entered.length} položek` : "Zatím nic napočítáno"}</div>
          <div className="muted" style={{ fontSize: ".82rem" }}>{diffs.length ? <>nesedí {diffs.length} · rozdíl <b style={{ color: lossValue < 0 ? "var(--red)" : "var(--green)" }}>{lossValue > 0 ? "+" : ""}{kc(lossValue)}</b></> : entered.length ? "vše sedí 👍" : ""}</div>
        </div>
        <input className="grow" style={{ minWidth: 160 }} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Poznámka, např. Inventura listopad" />
        <button className="btn btn-ghost" onClick={() => go("moves")}>Historie</button>
        <button className="btn btn-primary" disabled={!entered.length} onClick={save}>Uložit inventuru</button>
      </div>
    </>
  );
}
