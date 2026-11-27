// Naskladnění: hromadně ručně, nebo předvyplněné z fotky účtenky.
import { useEffect, useMemo, useRef, useState } from "react";
import { CATEGORIES } from "../shared/data.js";
import { productStats, kc } from "../lib/stock.js";
import { getAdminPw, PageHead, ProdCell, Search, Stepper, norm, useUI } from "../ui.jsx";

const EMOJI_MAP = { "Pivo": "🍺", "Nealko": "🥤", "Káva/Čaj": "☕", "Snacky": "🥜", "Speciál": "🥘" };
const emptyNew = () => ({ key: Math.random(), name: "", category: "Nealko", emoji: "🥤", price: "", cost: "", qty: 0 });

export function AdminRestock({ state, dispatch, go, prefill, clearPrefill }) {
  const { toast, confirm } = useUI();
  const [tab, setTab] = useState("manual");
  const [items, setItems] = useState({});        // { [productId]: { qty, cost } }
  const [newProds, setNewProds] = useState([]);  // nové produkty
  const [note, setNote] = useState("");
  const [q, setQ] = useState("");
  const [onlyLow, setOnlyLow] = useState(false);
  const [banner, setBanner] = useState("");
  const [busy, setBusy] = useState(false);

  // Předvyplnění ze Stavu skladu nebo nákupního seznamu
  useEffect(() => {
    if (!prefill) return;
    setItems((cur) => ({ ...cur, ...prefill.items }));
    if (prefill.note) setNote(prefill.note);
    clearPrefill();
  }, [prefill]); // eslint-disable-line

  const stats = useMemo(() => productStats(state, 30), [state]);
  const byCat = useMemo(() => {
    const list = stats
      .filter((p) => !q || norm(p.name).includes(norm(q)))
      .filter((p) => !onlyLow || p.status !== "ok" || items[p.id]?.qty)
      .sort((a, b) => a.name.localeCompare(b.name, "cs"));
    const m = new Map();
    for (const p of list) m.set(p.category, [...(m.get(p.category) || []), p]);
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0], "cs"));
  }, [stats, q, onlyLow, items]);

  const setItem = (id, patch) => setItems((cur) => ({ ...cur, [id]: { ...cur[id], ...patch } }));
  const fillSuggested = () => {
    const s = stats.filter((p) => p.suggest > 0 && !p.hidden);
    if (!s.length) return toast("Nic nedochází, není co doplňovat");
    setItems((cur) => ({ ...cur, ...Object.fromEntries(s.map((p) => [p.id, { ...cur[p.id], qty: p.suggest }])) }));
    toast(`Předvyplněno ${s.length} položek podle doporučení`);
  };

  const chosen = stats.filter((p) => items[p.id]?.qty > 0);
  const validNew = newProds.filter((n) => n.name.trim() && n.qty > 0);
  const totalQty = chosen.reduce((s, p) => s + items[p.id].qty, 0) + validNew.reduce((s, n) => s + n.qty, 0);
  const totalCost = chosen.reduce((s, p) => s + items[p.id].qty * (Number(items[p.id].cost) || p.cost || 0), 0)
    + validNew.reduce((s, n) => s + n.qty * (Number(n.cost) || 0), 0);
  const lines = chosen.length + validNew.length;

  const reset = () => { setItems({}); setNewProds([]); setNote(""); setBanner(""); };
  const submit = async () => {
    if (!lines || busy) return;
    if (newProds.some((n) => n.qty > 0 && n.name.trim() && n.price === "")) return toast("Doplň prodejní cenu u nových produktů", "err");
    setBusy(true);
    const ok = await dispatch({
      type: "RESTOCK",
      note,
      source: banner ? "receipt" : "manual",
      items: chosen.map((p) => ({ id: p.id, qty: items[p.id].qty, cost: items[p.id].cost === "" ? undefined : items[p.id].cost })),
      newProducts: validNew.map(({ key, ...n }) => ({ ...n, price: Number(n.price) || 0, cost: n.cost === "" ? undefined : n.cost })),
    }, `Naskladněno ${totalQty} ks (${lines} položek)`);
    setBusy(false);
    if (ok) reset();
  };
  const cancel = async () => { if (await confirm({ title: "Zahodit rozpracované naskladnění?", ok: "Zahodit", danger: true })) reset(); };

  // Výsledek z účtenky → předvyplnit formulář
  const fromReceipt = (rows) => {
    const ex = {}; const nw = [];
    for (const r of rows) {
      const p = r.matchedId != null && state.products.find((x) => x.id === r.matchedId);
      if (p) ex[p.id] = { qty: (ex[p.id]?.qty || 0) + r.qty, cost: r.unitPrice || "" };
      else nw.push({ ...emptyNew(), name: r.name, category: r.category || "Snacky", emoji: r.emoji || EMOJI_MAP[r.category] || "📦", cost: r.unitPrice || "", price: r.unitPrice ? Math.ceil((r.unitPrice * 1.6) / 5) * 5 : "", qty: r.qty });
    }
    setItems((cur) => ({ ...cur, ...ex }));
    setNewProds((cur) => [...cur, ...nw]);
    setBanner(`Z účtenky předvyplněno ${Object.keys(ex).length} známých a ${nw.length} nových položek. Zkontroluj počty a ceny a potvrď dole.`);
    if (!note) setNote(`Účtenka ${new Date().toLocaleDateString("cs-CZ")}`);
    setTab("manual");
  };

  return (
    <>
      <PageHead title="Naskladnit" sub="Zadej, co jsi přivezl. Všechno se uloží najednou a zapíše do pohybů skladu.">
        <button className="btn btn-ghost" onClick={() => go("count")}>📋 Inventura</button>
      </PageHead>

      <div className="tabs">
        <button className={`tab${tab === "manual" ? " active" : ""}`} onClick={() => setTab("manual")}>✍️ Ručně {lines > 0 && `(${lines})`}</button>
        <button className={`tab${tab === "receipt" ? " active" : ""}`} onClick={() => setTab("receipt")}>📷 Z účtenky</button>
      </div>

      {tab === "receipt" && <ReceiptScanner state={state} onResult={fromReceipt} />}

      {tab === "manual" && <>
        {banner && <div className="info gold">🧾 <div className="grow">{banner}</div><button className="btn btn-text btn-sm" onClick={() => setBanner("")}>✕</button></div>}
        <div className="toolbar">
          <Search value={q} onChange={setQ} placeholder="Hledat produkt…" />
          <label className="check"><input type="checkbox" checked={onlyLow} onChange={(e) => setOnlyLow(e.target.checked)} /> Jen co dochází</label>
          <div className="spacer" />
          <button className="btn btn-ghost btn-sm" onClick={fillSuggested}>✨ Doplnit vše, co dochází</button>
        </div>

        <div className="restock-list">
          {byCat.map(([cat, prods]) => (
            <div key={cat}>
              <div className="restock-cat">{cat}</div>
              {prods.map((p) => {
                const it = items[p.id] || {};
                return (
                  <div key={p.id} className={`restock-row${it.qty > 0 ? " on" : ""}`}>
                    <div className="grow" style={{ minWidth: 180 }}>
                      <ProdCell p={p} sub={<>
                        skladem <b style={{ color: p.status === "ok" ? undefined : p.status === "low" ? "var(--amber)" : "var(--red)" }}>{p.stock}</b> · min. {p.min}
                        {it.qty > 0 && <span style={{ color: "var(--green)", fontWeight: 700 }}> → {p.stock + it.qty}</span>}
                        {p.suggest > 0 && !it.qty && <span> · doporučeno {p.suggest}</span>}
                      </>} />
                    </div>
                    <div className="quick">
                      {[6, 12, 24].map((n) => <button key={n} className={`btn btn-ghost btn-sm q${n}`} onClick={() => setItem(p.id, { qty: (it.qty || 0) + n })}>+{n}</button>)}
                    </div>
                    <Stepper value={it.qty || 0} onChange={(v) => setItem(p.id, { qty: v })} />
                    <div className="cost" title="Nákupní cena za kus (nepovinné)">
                      <input type="number" inputMode="numeric" value={it.cost ?? ""} onChange={(e) => setItem(p.id, { cost: e.target.value })} placeholder={p.cost != null ? `${p.cost} Kč` : "Kč/ks"} />
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
          {!byCat.length && <div className="empty">Nic nenalezeno.</div>}
        </div>

        <div className="restock-cat" style={{ display: "flex", alignItems: "center" }}>
          <span className="grow">Nové produkty</span>
          <button className="btn btn-ghost btn-sm" onClick={() => setNewProds((c) => [...c, emptyNew()])}>+ Přidat nový produkt</button>
        </div>
        {newProds.map((n, i) => (
          <NewProductRow key={n.key} n={n} products={state.products}
            onChange={(patch) => setNewProds((c) => c.map((x, j) => (j === i ? { ...x, ...patch } : x)))}
            onRemove={() => setNewProds((c) => c.filter((_, j) => j !== i))}
            onMatch={(id) => { setItem(id, { qty: (items[id]?.qty || 0) + n.qty, cost: n.cost }); setNewProds((c) => c.filter((_, j) => j !== i)); }} />
        ))}
        {!newProds.length && <div className="muted" style={{ fontSize: ".88rem", padding: "4px 4px 8px" }}>Přivezl jsi něco, co ještě v nabídce není? Přidej to tady.</div>}

        <div className="sticky-foot">
          <div style={{ minWidth: 150 }}>
            <div style={{ fontWeight: 800 }}>{lines ? `${lines} položek · ${totalQty} ks` : "Zatím nic"}</div>
            <div className="muted" style={{ fontSize: ".82rem" }}>{totalCost > 0 ? `nákup cca ${kc(totalCost)}` : "vyber, co naskladnit"}</div>
          </div>
          <input className="grow" style={{ minWidth: 160 }} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Poznámka, např. Makro 27. 11." />
          {lines > 0 && <button className="btn btn-ghost" onClick={cancel}>Zrušit</button>}
          <button className="btn btn-green" disabled={!lines || busy} onClick={submit}>{busy ? "Ukládám…" : "📥 Naskladnit"}</button>
        </div>
      </>}
    </>
  );
}

function NewProductRow({ n, products, onChange, onRemove, onMatch }) {
  const cats = [...new Set([...CATEGORIES, ...products.map((p) => p.category)])];
  const set = (k) => (e) => onChange({ [k]: e.target.value });
  return (
    <div className="restock-row on" style={{ borderColor: "var(--gold)", background: "var(--gold-soft)", alignItems: "flex-end" }}>
      <div style={{ width: 56 }}><label>Emoji</label><input value={n.emoji} onChange={set("emoji")} style={{ textAlign: "center", padding: "8px 4px" }} /></div>
      <div className="grow" style={{ minWidth: 160 }}><label>Název</label><input value={n.name} onChange={set("name")} placeholder="Název produktu" /></div>
      <div style={{ width: 130 }}><label>Kategorie</label><select value={n.category} onChange={(e) => onChange({ category: e.target.value, emoji: n.emoji || EMOJI_MAP[e.target.value] })}>{cats.map((c) => <option key={c}>{c}</option>)}</select></div>
      <div style={{ width: 90 }}><label>Nákup/ks</label><input type="number" value={n.cost} onChange={set("cost")} /></div>
      <div style={{ width: 90 }}><label>Prodej</label><input type="number" value={n.price} onChange={set("price")} /></div>
      <div><label>Počet</label><Stepper value={n.qty} onChange={(v) => onChange({ qty: v })} /></div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <select value="" onChange={(e) => e.target.value && onMatch(Number(e.target.value))} style={{ width: 150, padding: "6px 8px", fontSize: ".8rem" }} title="Je to vlastně produkt, který už máme?">
          <option value="">Už ho máme…</option>
          {products.map((p) => <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>)}
        </select>
        <button className="btn btn-danger-text btn-sm" onClick={onRemove}>Odebrat</button>
      </div>
    </div>
  );
}

// ─── Čtení účtenky přes AI ────────────────────────────────────────────────────
function ReceiptScanner({ state, onResult }) {
  const [img, setImg] = useState(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [drag, setDrag] = useState(false);
  const [err, setErr] = useState("");
  const fileRef = useRef();

  const handleFile = (file) => {
    if (!file) return;
    // Zmenšení fotky, ať je odeslání rychlé i z mobilu (max. 1600 px)
    const reader = new FileReader();
    reader.onload = (e) => {
      const im = new Image();
      im.onload = () => {
        const k = Math.min(1, 1600 / Math.max(im.width, im.height));
        const c = document.createElement("canvas");
        c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
        c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
        setImg(c.toDataURL("image/jpeg", 0.85));
      };
      im.onerror = () => setImg(e.target.result);
      im.src = e.target.result;
      setName(file.name); setErr("");
    };
    reader.readAsDataURL(file);
  };

  const analyze = async () => {
    if (!img) return;
    setLoading(true); setErr("");
    try {
      const base64 = img.split(",")[1];
      const mtype = img.split(";")[0].split(":")[1];
      const existing = state.products.map((p) => `ID:${p.id} | ${p.name} | ${p.category}`).join("\n");
      const prompt = `Jsi systém pro zpracování nákupních účtenek pro bar leteckého aeroklubu.

Stávající produkty v systému:
${existing}

Na obrázku je nákupní účtenka / pokladní doklad. Analyzuj ji a vrať JSON seznam zakoupených položek.
Pokud je položka balení (např. "6x0,5l", "karton 24 ks"), přepočti počet na jednotlivé kusy.

Pro každou položku urči:
- name: název produktu (česky, stručně)
- qty: počet kusů (celé číslo)
- unitPrice: nákupní cena za 1 kus v Kč včetně DPH (celé číslo, odhadni pokud není jasná)
- matchedId: ID stávajícího produktu, pokud jde o stejný produkt, jinak null
- category: odhadni kategorii z: ${CATEGORIES.join(", ")}
- emoji: vhodné emoji

Vrať POUZE čistý JSON array, žádný text navíc:
[{"name":"...","qty":10,"unitPrice":30,"matchedId":1,"category":"Pivo","emoji":"🍺"},...]`;

      // Volá náš vlastní server (Netlify funkce), který drží tajný API klíč.
      const resp = await fetch("/api/scan-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-password": getAdminPw() },
        body: JSON.stringify({
          max_tokens: 2000,
          messages: [{ role: "user", content: [
            { type: "image", source: { type: "base64", media_type: mtype, data: base64 } },
            { type: "text", text: prompt },
          ] }],
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Chyba serveru");
      const text = data.content.map((c) => c.text || "").join("");
      const json = text.slice(text.indexOf("["), text.lastIndexOf("]") + 1);
      const rows = JSON.parse(json)
        .map((r) => ({ ...r, qty: Math.max(0, parseInt(r.qty) || 0), unitPrice: Math.max(0, Math.round(Number(r.unitPrice) || 0)) }))
        .filter((r) => r.name && r.qty > 0);
      if (!rows.length) throw new Error("Na účtence jsem nenašel žádné položky.");
      onResult(rows);
      setImg(null);
    } catch (e) {
      console.error(e);
      setErr(e.message?.includes("ANTHROPIC") || e.message?.includes("není zapnuté") ? e.message : "Nepodařilo se přečíst účtenku. Zkus ostřejší a světlejší foto, nebo zadej položky ručně.");
    }
    setLoading(false);
  };

  return (
    <div className="card">
      <div className="card-title">Naskladnění z účtenky</div>
      <div className="card-sub">Vyfoť účtenku z Makra nebo obchodu. AI rozpozná položky a předvyplní naskladnění, které pak jen zkontroluješ.</div>
      {!img ? (
        <div className={`drop-zone${drag ? " drag" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files[0]); }}
          onClick={() => fileRef.current.click()}>
          <div style={{ fontSize: "3rem", marginBottom: 10 }}>📸</div>
          <div style={{ fontWeight: 700, fontSize: "1.05rem", marginBottom: 4 }}>Vyfoť nebo nahraj účtenku</div>
          <div className="muted" style={{ fontSize: ".88rem" }}>Klikni nebo přetáhni soubor sem · JPG, PNG, foto z telefonu</div>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={(e) => handleFile(e.target.files[0])} />
        </div>
      ) : (
        <div className="row wrap" style={{ alignItems: "flex-start", gap: 18 }}>
          <img src={img} className="receipt-preview" alt="účtenka" />
          <div className="grow" style={{ minWidth: 200 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>{name}</div>
            {loading
              ? <div className="row" style={{ padding: "12px 0" }}><span className="spinner" /><span className="muted">Čtu účtenku… (pár vteřin)</span></div>
              : <div className="row wrap">
                  <button className="btn btn-primary" onClick={analyze}>🤖 Přečíst účtenku</button>
                  <button className="btn btn-ghost" onClick={() => { setImg(null); setErr(""); }}>Jiná fotka</button>
                </div>}
            {err && <div className="error">{err}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
