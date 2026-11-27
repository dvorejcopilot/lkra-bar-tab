// Stav skladu: přehled zásob, spotřeba, na jak dlouho vystačí, úprava produktů.
import { useMemo, useState } from "react";
import { CATEGORIES } from "../shared/data.js";
import { productStats, stockValue, fmtDays, kc, STATUS } from "../lib/stock.js";
import { Modal, PageHead, ProdCell, Search, StockMeter, norm, useUI } from "../ui.jsx";

const SORTS = {
  status: { label: "Podle stavu", fn: (a, b) => rank(a) - rank(b) || a.daysLeft - b.daysLeft || a.name.localeCompare(b.name, "cs") },
  name: { label: "Podle názvu", fn: (a, b) => a.name.localeCompare(b.name, "cs") },
  sold: { label: "Nejprodávanější", fn: (a, b) => b.sold - a.sold },
  days: { label: "Nejdřív dojde", fn: (a, b) => a.daysLeft - b.daysLeft },
  stock: { label: "Nejvíc kusů", fn: (a, b) => b.stock - a.stock },
};
const rank = (p) => ({ out: 0, low: 1, ok: 2 }[p.status]);

export function AdminStock({ state, dispatch, go }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("Vše");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("status");
  const [edit, setEdit] = useState(null);      // produkt v editaci, nebo "new"
  const [writeOff, setWriteOff] = useState(null);
  const [shopping, setShopping] = useState(false);

  const stats = useMemo(() => productStats(state, 30), [state]);
  const visible = stats.filter((p) => !p.hidden);
  const val = stockValue(visible);
  const low = visible.filter((p) => p.status === "low");
  const out = visible.filter((p) => p.status === "out");
  const cats = ["Vše", ...new Set(stats.map((p) => p.category))];

  const list = stats
    .filter((p) => cat === "Vše" || p.category === cat)
    .filter((p) => !q || norm(p.name).includes(norm(q)))
    .filter((p) => filter === "all" ? true : filter === "attention" ? p.status !== "ok" && !p.hidden : filter === "hidden" ? p.hidden : true)
    .sort(SORTS[sort].fn);

  return (
    <>
      <PageHead title="Stav skladu" sub="Zásoby, prodeje za posledních 30 dní a odhad, na jak dlouho vystačí.">
        <button className="btn btn-ghost" onClick={() => setShopping(true)}>🛒 Nákupní seznam</button>
        <button className="btn btn-ghost" onClick={() => setEdit("new")}>+ Nový produkt</button>
        <button className="btn btn-primary" onClick={() => go("restock")}>📥 Naskladnit</button>
      </PageHead>

      <div className="stat-grid">
        <div className="stat"><div className="stat-label">📦 Produktů v nabídce</div><div className="stat-val">{visible.length}</div><div className="stat-sub">{visible.reduce((s, p) => s + Math.max(0, p.stock), 0)} ks celkem</div></div>
        <div className="stat"><div className="stat-label">💰 Hodnota skladu</div><div className="stat-val">{kc(val.sale)}</div><div className="stat-sub">{val.costKnown ? `nákupně ${kc(val.cost)}` : "v prodejních cenách"}</div></div>
        <button className="stat" onClick={() => setFilter("attention")}><div className="stat-label">⚠️ Dochází</div><div className="stat-val" style={{ color: low.length ? "var(--amber)" : "var(--green)" }}>{low.length}</div><div className="stat-sub">pod nastaveným minimem</div></button>
        <button className="stat" onClick={() => setFilter("attention")}><div className="stat-label">⛔ Vyprodáno</div><div className="stat-val" style={{ color: out.length ? "var(--red)" : "var(--green)" }}>{out.length}</div><div className="stat-sub">{out.length ? out.slice(0, 2).map((p) => p.name).join(", ") + (out.length > 2 ? "…" : "") : "nic nechybí"}</div></button>
      </div>

      <div className="toolbar">
        <Search value={q} onChange={setQ} placeholder="Hledat produkt…" />
        <select value={sort} onChange={(e) => setSort(e.target.value)} style={{ width: "auto" }}>
          {Object.entries(SORTS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
        </select>
        <div className="chips">
          <button className={`chip${filter === "all" ? " active" : ""}`} onClick={() => setFilter("all")}>Vše</button>
          <button className={`chip${filter === "attention" ? " active" : ""}`} onClick={() => setFilter("attention")}>K doplnění<span className="count">{low.length + out.length}</span></button>
          {stats.some((p) => p.hidden) && <button className={`chip${filter === "hidden" ? " active" : ""}`} onClick={() => setFilter("hidden")}>Skryté</button>}
        </div>
      </div>
      <div className="chips" style={{ marginBottom: 14 }}>
        {cats.map((c) => <button key={c} className={`chip${cat === c ? " active" : ""}`} onClick={() => setCat(c)}>{c}</button>)}
      </div>

      <div className="table-wrap responsive">
        <table>
          <thead><tr><th>Produkt</th><th>Skladem</th><th className="r hide-m">Min.</th><th className="r">Prodáno 30 d</th><th>Vystačí</th><th className="r">Cena</th><th></th></tr></thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.id} className="clickable" onClick={() => setEdit(p)}>
                <td className="full" style={{ minWidth: 190 }}><ProdCell p={p} sub={<>{p.category}{p.hidden && <span className="badge badge-grey" style={{ marginLeft: 6 }}>skryto</span>}</>} /></td>
                <td data-label="Skladem" style={{ minWidth: 150 }}>
                  <div className="row" style={{ gap: 8 }}>
                    <span className={`badge ${STATUS[p.status].cls}`}>{p.stock} ks</span>
                    <div style={{ width: 70 }}><StockMeter p={p} /></div>
                  </div>
                </td>
                <td data-label="Minimum" className="r num muted hide-m">{p.min}</td>
                <td data-label="Prodáno 30 d" className="r num">{p.sold || <span className="muted">0</span>}</td>
                <td data-label="Vystačí" className="num" style={{ color: p.daysLeft < 7 ? "var(--amber)" : undefined, fontWeight: p.daysLeft < 7 ? 700 : 400 }}>{p.stock <= 0 ? "—" : fmtDays(p.daysLeft)}</td>
                <td data-label="Cena" className="r num nw">
                  <b>{p.price} Kč</b>
                  {p.cost !== undefined && p.cost !== null && <div className="muted" style={{ fontSize: ".75rem" }}>nákup {p.cost} Kč</div>}
                </td>
                <td className="r nw" onClick={(e) => e.stopPropagation()}>
                  <div className="row" style={{ justifyContent: "flex-end", gap: 4 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => go("restock", { items: { [p.id]: { qty: p.suggest || 0 } } })}>+ Doplnit</button>
                    <button className="btn btn-text btn-sm" title="Odepsat (rozbité, prošlé…)" onClick={() => setWriteOff(p)}>Odepsat</button>
                  </div>
                </td>
              </tr>
            ))}
            {!list.length && <tr><td colSpan={7}><div className="empty"><div className="big">🔍</div>Nic tu není.</div></td></tr>}
          </tbody>
        </table>
      </div>

      {edit && <ProductModal product={edit === "new" ? null : edit} state={state} dispatch={dispatch} onClose={() => setEdit(null)} />}
      {writeOff && <WriteOffModal product={writeOff} dispatch={dispatch} onClose={() => setWriteOff(null)} />}
      {shopping && <ShoppingModal stats={visible} onClose={() => setShopping(false)} go={go} />}
    </>
  );
}

// ─── Úprava / nový produkt ────────────────────────────────────────────────────
export function ProductModal({ product, state, dispatch, onClose }) {
  const { confirm } = useUI();
  const isNew = !product;
  const [f, setF] = useState(() => product
    ? { name: product.name, emoji: product.emoji, category: product.category, price: product.price, cost: product.cost ?? "", minStock: product.minStock ?? 5, special: !!product.special, hidden: !!product.hidden }
    : { name: "", emoji: "🍺", category: "Pivo", price: "", cost: "", minStock: 5, stock: "", special: false, hidden: false });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });
  const cats = [...new Set([...CATEGORIES, ...state.products.map((p) => p.category)])];
  const margin = f.price && f.cost !== "" ? Math.round(((f.price - f.cost) / f.price) * 100) : null;

  const save = async () => {
    if (!f.name.trim() || f.price === "") return;
    const ok = isNew
      ? await dispatch({ type: "ADD_PRODUCT", product: f }, `Přidáno: ${f.name}`)
      : await dispatch({ type: "UPDATE_PRODUCT", id: product.id, patch: f }, "Uloženo");
    if (ok) onClose();
  };
  const del = async () => {
    if (await confirm({ title: `Smazat ${product.name}?`, text: "Produkt zmizí z nabídky i ze skladu. Historie útrat zůstane. Pokud ho jen dočasně nemáte, raději ho skryj.", ok: "Smazat", danger: true })) {
      if (await dispatch({ type: "DELETE_PRODUCT", id: product.id }, "Smazáno")) onClose();
    }
  };

  return (
    <Modal title={isNew ? "Nový produkt" : "Upravit produkt"} icon={f.emoji} onClose={onClose} footer={<>
      {!isNew && <button className="btn btn-danger-text" style={{ marginRight: "auto" }} onClick={del}>Smazat</button>}
      <button className="btn btn-ghost" onClick={onClose}>Zrušit</button>
      <button className="btn btn-primary" onClick={save} disabled={!f.name.trim() || f.price === ""}>Uložit</button>
    </>}>
      <div className="form-grid" style={{ gridTemplateColumns: "76px 1fr" }}>
        <div><label>Emoji</label><input value={f.emoji} onChange={set("emoji")} style={{ textAlign: "center", fontSize: "1.3rem", padding: "6px" }} /></div>
        <div><label>Název</label><input value={f.name} onChange={set("name")} placeholder="např. Pilsner Urquell 0,5 l" autoFocus={isNew} /></div>
      </div>
      <div className="form-grid">
        <div><label>Kategorie</label>
          <input list="cats" value={f.category} onChange={set("category")} />
          <datalist id="cats">{cats.map((c) => <option key={c} value={c} />)}</datalist>
        </div>
        <div><label>Prodejní cena (Kč)</label><input type="number" inputMode="numeric" value={f.price} onChange={set("price")} /></div>
        <div><label>Nákupní cena/ks (Kč)</label><input type="number" inputMode="numeric" value={f.cost} onChange={set("cost")} placeholder="nepovinné" /></div>
      </div>
      <div className="form-grid">
        <div><label>Minimum na skladě</label><input type="number" inputMode="numeric" value={f.minStock} onChange={set("minStock")} /><div className="muted" style={{ fontSize: ".75rem", marginTop: 4 }}>Pod tímto počtem se ukáže „Dochází“.</div></div>
        {isNew && <div><label>Počáteční stav (ks)</label><input type="number" inputMode="numeric" value={f.stock} onChange={set("stock")} placeholder="0" /></div>}
        {margin !== null && <div><label>Marže</label><div style={{ padding: "10px 0", fontWeight: 700, color: margin < 0 ? "var(--red)" : "var(--green)" }}>{margin} % · {f.price - f.cost} Kč/ks</div></div>}
      </div>
      <div className="row wrap" style={{ gap: 20, marginBottom: 10 }}>
        <label className="check"><input type="checkbox" checked={f.special} onChange={set("special")} /> ⭐ Speciál dne (na tabletu nahoře)</label>
        <label className="check"><input type="checkbox" checked={f.hidden} onChange={set("hidden")} /> Skrýt z tabletu</label>
      </div>
      {!isNew && <div className="info" style={{ marginTop: 8 }}>ℹ️ Počet kusů se nemění tady, ale přes <b>&nbsp;Naskladnit</b>, <b>&nbsp;Inventuru</b> nebo <b>&nbsp;Odepsat</b>, aby zůstala historie pohybů.</div>}
    </Modal>
  );
}

// ─── Odpis ────────────────────────────────────────────────────────────────────
const REASONS = ["Rozbité", "Prošlé", "Vypito na akci klubu", "Ztráta / nesedí"];
function WriteOffModal({ product, dispatch, onClose }) {
  const [qty, setQty] = useState(1);
  const [reason, setReason] = useState(REASONS[0]);
  const [note, setNote] = useState("");
  const save = async () => {
    if (await dispatch({ type: "WRITE_OFF", id: product.id, qty, note: [reason, note].filter(Boolean).join(" – ") }, `Odepsáno ${qty} ks`)) onClose();
  };
  return (
    <Modal title={`Odepsat: ${product.name}`} icon={product.emoji} onClose={onClose} width={420} footer={<>
      <button className="btn btn-ghost" onClick={onClose}>Zrušit</button>
      <button className="btn btn-red" onClick={save} disabled={!(qty > 0)}>Odepsat {qty} ks</button>
    </>}>
      <p className="muted" style={{ marginBottom: 14 }}>Skladem je {product.stock} ks. Odpis sníží stav a zapíše se do pohybů skladu.</p>
      <div className="form-grid">
        <div><label>Počet kusů</label><input type="number" min={1} max={product.stock} value={qty} onChange={(e) => setQty(Math.max(0, parseInt(e.target.value) || 0))} /></div>
        <div><label>Důvod</label><select value={reason} onChange={(e) => setReason(e.target.value)}>{REASONS.map((r) => <option key={r}>{r}</option>)}</select></div>
      </div>
      <div style={{ marginBottom: 8 }}><label>Poznámka</label><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="nepovinné" /></div>
    </Modal>
  );
}

// ─── Nákupní seznam ───────────────────────────────────────────────────────────
function ShoppingModal({ stats, onClose, go }) {
  const { toast } = useUI();
  const items = stats.filter((p) => p.suggest > 0).sort((a, b) => a.category.localeCompare(b.category, "cs") || a.name.localeCompare(b.name, "cs"));
  const cost = items.reduce((s, p) => s + (p.cost || 0) * p.suggest, 0);
  const text = `Nákup do baru LKRA (${new Date().toLocaleDateString("cs-CZ")})\n` + items.map((p) => `- ${p.name}: ${p.suggest} ks`).join("\n");
  const copy = async () => { try { await navigator.clipboard.writeText(text); toast("Zkopírováno", "ok"); } catch { toast("Kopírování se nepovedlo", "err"); } };
  const prefill = { items: Object.fromEntries(items.map((p) => [p.id, { qty: p.suggest }])), note: "Nákup podle seznamu" };
  return (
    <Modal title="Nákupní seznam" icon="🛒" onClose={onClose} footer={items.length ? <>
      <button className="btn btn-ghost" onClick={copy}>📋 Kopírovat</button>
      <button className="btn btn-primary" onClick={() => go("restock", prefill)}>Nakoupeno → naskladnit</button>
    </> : null}>
      {!items.length ? <div className="empty"><div className="big">✅</div>Všeho je dost, není co kupovat.</div> : <>
        <p className="muted" style={{ marginBottom: 12, fontSize: ".9rem" }}>Doplní zásobu na dvojnásobek minima, nebo na zhruba 3 týdny prodeje podle posledních 30 dní.</p>
        {items.map((p) => (
          <div key={p.id} className="rank">
            <span style={{ fontSize: "1.3rem" }}>{p.emoji}</span>
            <div className="grow"><b>{p.name}</b><div className="muted" style={{ fontSize: ".78rem" }}>skladem {p.stock} · min. {p.min} · prodáno {p.sold}/30 d</div></div>
            <b className="num">{p.suggest} ks</b>
          </div>
        ))}
        {cost > 0 && <div style={{ marginTop: 12, textAlign: "right" }} className="muted">Odhad nákupu: <b style={{ color: "var(--text)" }}>{kc(cost)}</b></div>}
      </>}
    </Modal>
  );
}
