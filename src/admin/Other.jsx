// Členové, útraty, upozornění, záloha a nastavení.
import { useState } from "react";
import { Modal, PageHead, Search, norm, useUI } from "../ui.jsx";
import { kc, minOf } from "../lib/stock.js";

const balCls = (b, thr) => (b > thr ? "badge-ok" : b >= 0 ? "badge-warn" : "badge-bad");

// ─── Členové ──────────────────────────────────────────────────────────────────
export function AdminMembers({ state, dispatch }) {
  const { confirm } = useUI();
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("name");
  const [modal, setModal] = useState(null); // {kind:"add"|"topup"|"pin", member}
  const thr = state.lowBalanceThreshold;
  const list = state.members
    .filter((m) => !q || norm(m.name).includes(norm(q)) || norm(m.email).includes(norm(q)))
    .sort(sort === "name" ? (a, b) => a.name.localeCompare(b.name, "cs") : (a, b) => a.balance - b.balance);
  const del = async (m) => {
    if (await confirm({ title: `Smazat ${m.name}?`, text: `Saldo člena je ${m.balance} Kč. Smazání nejde vrátit.`, ok: "Smazat", danger: true }))
      dispatch({ type: "DELETE_MEMBER", id: m.id }, "Člen smazán");
  };
  return (
    <>
      <PageHead title="Členové" sub={`${state.members.length} členů · celkové saldo ${kc(state.members.reduce((s, m) => s + m.balance, 0))}`}>
        <button className="btn btn-primary" onClick={() => setModal({ kind: "add" })}>+ Přidat člena</button>
      </PageHead>
      <div className="toolbar">
        <Search value={q} onChange={setQ} placeholder="Hledat jméno nebo e-mail…" />
        <select value={sort} onChange={(e) => setSort(e.target.value)} style={{ width: "auto" }}>
          <option value="name">Podle jména</option>
          <option value="balance">Nejnižší saldo</option>
        </select>
      </div>
      <div className="table-wrap responsive">
        <table>
          <thead><tr><th>Člen</th><th>E-mail</th><th className="r">Saldo</th><th></th></tr></thead>
          <tbody>
            {list.map((m) => (
              <tr key={m.id}>
                <td className="full"><div className="row"><div className="avatar sm">{m.avatar}</div><b>{m.name}</b></div></td>
                <td data-label="E-mail" className="muted" style={{ fontSize: ".88rem" }}>{m.email || "—"}</td>
                <td data-label="Saldo" className="r"><span className={`badge ${balCls(m.balance, thr)}`}>{m.balance} Kč</span></td>
                <td className="r">
                  <div className="row" style={{ justifyContent: "flex-end", gap: 4 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => setModal({ kind: "topup", member: m })}>💰 Dobít</button>
                    <button className="btn btn-text btn-sm" onClick={() => setModal({ kind: "pin", member: m })}>🔑 PIN</button>
                    <button className="btn btn-text btn-sm" onClick={() => del(m)} aria-label="Smazat">🗑</button>
                  </div>
                </td>
              </tr>
            ))}
            {!list.length && <tr><td colSpan={4}><div className="empty">Nikdo nenalezen.</div></td></tr>}
          </tbody>
        </table>
      </div>
      {modal?.kind === "add" && <AddMemberModal dispatch={dispatch} onClose={() => setModal(null)} />}
      {modal?.kind === "topup" && <TopupModal m={modal.member} dispatch={dispatch} onClose={() => setModal(null)} />}
      {modal?.kind === "pin" && <PinModal m={modal.member} dispatch={dispatch} onClose={() => setModal(null)} />}
    </>
  );
}

function AddMemberModal({ dispatch, onClose }) {
  const [f, setF] = useState({ name: "", pin: "", email: "" });
  const ok = f.name.trim() && /^\d{4}$/.test(f.pin);
  const save = async () => { if (ok && await dispatch({ type: "ADD_MEMBER", ...f }, `Přidán: ${f.name}`)) onClose(); };
  return (
    <Modal title="Nový člen" icon="👤" onClose={onClose} width={440} footer={<>
      <button className="btn btn-ghost" onClick={onClose}>Zrušit</button>
      <button className="btn btn-primary" disabled={!ok} onClick={save}>Uložit</button>
    </>}>
      <div style={{ marginBottom: 12 }}><label>Jméno a příjmení</label><input autoFocus value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Jan Novák" /></div>
      <div className="form-grid">
        <div><label>PIN (4 číslice)</label><input inputMode="numeric" maxLength={4} value={f.pin} onChange={(e) => setF({ ...f, pin: e.target.value.replace(/\D/g, "") })} placeholder="1234" /></div>
        <div><label>E-mail</label><input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="jan@example.com" /></div>
      </div>
    </Modal>
  );
}

function TopupModal({ m, dispatch, onClose }) {
  const [amt, setAmt] = useState("");
  const a = parseInt(amt) || 0;
  const save = async () => { if (a && await dispatch({ type: "TOPUP", id: m.id, amount: a }, `${m.name}: ${a > 0 ? "+" : ""}${a} Kč`)) onClose(); };
  return (
    <Modal title={`Dobít kredit: ${m.name}`} icon="💰" onClose={onClose} width={420} footer={<>
      <button className="btn btn-ghost" onClick={onClose}>Zrušit</button>
      <button className="btn btn-green" disabled={!a} onClick={save}>{a < 0 ? "Odečíst" : "Připsat"} {Math.abs(a) || ""} Kč</button>
    </>}>
      <p className="muted" style={{ marginBottom: 12 }}>Současné saldo: <b style={{ color: m.balance < 0 ? "var(--red)" : "var(--text)" }}>{m.balance} Kč</b>{a ? <> → <b>{m.balance + a} Kč</b></> : null}</p>
      <div className="chips" style={{ marginBottom: 12 }}>
        {[200, 500, 1000].map((n) => <button key={n} className="chip" onClick={() => setAmt(String(n))}>+{n}</button>)}
        {m.balance < 0 && <button className="chip" onClick={() => setAmt(String(-m.balance))}>Vyrovnat na 0</button>}
      </div>
      <label>Částka (Kč, záporná pro opravu)</label>
      <input type="number" autoFocus value={amt} onChange={(e) => setAmt(e.target.value)} onKeyDown={(e) => e.key === "Enter" && save()} />
    </Modal>
  );
}

function PinModal({ m, dispatch, onClose }) {
  const [pin, setPin] = useState("");
  const ok = /^\d{4}$/.test(pin);
  const save = async () => { if (ok && await dispatch({ type: "SET_MEMBER_PIN", id: m.id, pin }, "PIN změněn")) onClose(); };
  return (
    <Modal title={`Nový PIN: ${m.name}`} icon="🔑" onClose={onClose} width={380} footer={<>
      <button className="btn btn-ghost" onClick={onClose}>Zrušit</button>
      <button className="btn btn-primary" disabled={!ok} onClick={save}>Uložit PIN</button>
    </>}>
      <label>4 číslice</label>
      <input autoFocus inputMode="numeric" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} onKeyDown={(e) => e.key === "Enter" && save()} style={{ fontSize: "1.4rem", letterSpacing: ".4em", textAlign: "center" }} />
    </Modal>
  );
}

// ─── Útraty ───────────────────────────────────────────────────────────────────
export function AdminTransactions({ state }) {
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(100);
  const getN = (id) => state.members.find((m) => m.id === id)?.name || "Neznámý";
  const list = state.transactions.filter((t) => !q || norm(getN(t.memberId)).includes(norm(q)) || t.items.some((i) => norm(i.name).includes(norm(q))));
  const total = list.reduce((s, t) => s + t.total, 0);
  return (
    <>
      <PageHead title="Útraty" sub={`${list.length} nákupů · ${kc(total)}`} />
      <div className="toolbar"><Search value={q} onChange={setQ} placeholder="Hledat člena nebo produkt…" /></div>
      <div className="table-wrap responsive">
        <table>
          <thead><tr><th>Datum</th><th>Člen</th><th>Položky</th><th className="r">Celkem</th></tr></thead>
          <tbody>
            {list.slice(0, limit).map((t) => (
              <tr key={t.id}>
                <td data-label="Datum" className="muted num" style={{ fontSize: ".85rem", whiteSpace: "nowrap" }}>{t.date}</td>
                <td className="full" style={{ fontWeight: 650 }}>{getN(t.memberId)}</td>
                <td data-label="Položky" className="muted" style={{ fontSize: ".88rem" }}>{t.items.map((i) => `${i.name} ×${i.qty}`).join(", ")}</td>
                <td data-label="Celkem" className="r num" style={{ fontWeight: 800, color: "var(--navy)" }}>{t.total} Kč</td>
              </tr>
            ))}
            {!list.length && <tr><td colSpan={4}><div className="empty">Žádné útraty.</div></td></tr>}
          </tbody>
        </table>
      </div>
      {list.length > limit && <button className="btn btn-ghost" onClick={() => setLimit(limit + 200)}>Zobrazit další</button>}
    </>
  );
}

// ─── Upozornění ───────────────────────────────────────────────────────────────
export function AdminNotifications({ state, dispatch }) {
  const list = [...state.notifications].reverse();
  return (
    <>
      <PageHead title="Upozornění členům" sub="Vznikají automaticky, když se někdo dostane do minusu." />
      <div className="table-wrap responsive">
        <table>
          <thead><tr><th>Datum</th><th>Člen</th><th>Typ</th><th>Zpráva</th><th className="r">Stav</th></tr></thead>
          <tbody>
            {list.map((n) => (
              <tr key={n.id}>
                <td data-label="Datum" className="muted num" style={{ fontSize: ".85rem" }}>{n.date}</td>
                <td className="full" style={{ fontWeight: 650 }}>{n.member}</td>
                <td data-label="Typ"><span className={`badge ${n.type === "critical" ? "badge-bad" : "badge-warn"}`}>{n.type === "critical" ? "Kritické" : "Varování"}</span></td>
                <td data-label="Zpráva" style={{ fontSize: ".9rem" }}>{n.msg}</td>
                <td className="r">{n.sent ? <span className="badge badge-ok">✓ Vyřízeno</span> : <button className="btn btn-primary btn-sm" onClick={() => dispatch({ type: "MARK_SENT", id: n.id })}>Označit vyřízené</button>}</td>
              </tr>
            ))}
            {!list.length && <tr><td colSpan={5}><div className="empty"><div className="big">🎉</div>Žádná upozornění</div></td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ─── Záloha ───────────────────────────────────────────────────────────────────
const q = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
function generateCSV(state) {
  const now = new Date().toLocaleString("cs-CZ");
  let csv = `LKRA Club Bar – Záloha stavu systému\nVygenerováno: ${now}\n\n`;
  csv += "=== STAV KONT ČLENŮ ===\nJméno,Email,Saldo (Kč),Stav\n";
  state.members.forEach((m) => { const s = m.balance > 50 ? "OK" : m.balance >= 0 ? "Nízký kredit" : "MINUS"; csv += `${q(m.name)},${q(m.email)},${m.balance},${q(s)}\n`; });
  csv += "\n=== STAV SKLADU ===\nProdukt,Kategorie,Prodejní cena (Kč),Nákupní cena (Kč),Skladem,Minimum,Stav\n";
  state.products.forEach((p) => { const s = p.stock <= 0 ? "VYPRODÁNO" : p.stock <= minOf(p) ? "Dochází" : "OK"; csv += `${q(p.name)},${q(p.category)},${p.price},${p.cost ?? ""},${p.stock},${minOf(p)},${q(s)}\n`; });
  csv += "\n=== POHYBY SKLADU ===\nDatum,Produkt,Typ,Změna (ks),Stav po,Nákupní cena,Poznámka\n";
  (state.stockMoves || []).forEach((m) => { csv += `${q(m.date)},${q(m.name)},${q(m.type)},${m.qty},${m.stockAfter},${m.cost ?? ""},${q(m.note)}\n`; });
  return csv;
}
function download(content, filename, type) {
  const blob = new Blob([type.includes("csv") ? "﻿" + content : content], { type });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export function AdminEmail({ state }) {
  const [preview, setPreview] = useState(false);
  const csv = generateCSV(state);
  const today = new Date().toISOString().slice(0, 10);
  const negM = state.members.filter((m) => m.balance < 0);
  const warnM = state.members.filter((m) => m.balance >= 0 && m.balance < state.lowBalanceThreshold);
  const emails = negM.map((m) => m.email).filter(Boolean).join(",");
  return (
    <>
      <PageHead title="Záloha a fronty" sub="Stažení dat a přehled členů, kterým je dobré připomenout dobití." />
      <div className="card">
        <div className="card-title">💾 Záloha dat</div>
        <div className="card-sub">CSV otevřeš v Excelu (členové, sklad, pohyby). JSON je úplná záloha všeho.</div>
        <div className="row wrap">
          <button className="btn btn-primary" onClick={() => download(csv, `LKRA-bar-zaloha-${today}.csv`, "text/csv;charset=utf-8;")}>⬇️ Stáhnout CSV</button>
          <button className="btn btn-ghost" onClick={() => download(JSON.stringify(state, null, 2), `LKRA-bar-zaloha-${today}.json`, "application/json")}>⬇️ Úplná záloha (JSON)</button>
          <button className="btn btn-text" onClick={() => setPreview(!preview)}>{preview ? "Skrýt náhled" : "👁 Náhled CSV"}</button>
        </div>
        {preview && <pre style={{ marginTop: 14, background: "var(--bg)", borderRadius: 8, padding: 14, fontSize: ".78rem", color: "var(--muted)", overflowX: "auto", border: "1px solid var(--border)", whiteSpace: "pre-wrap", lineHeight: 1.6, maxHeight: 400 }}>{csv}</pre>}
      </div>
      <div className="two-col">
        <div className="card">
          <div className="row"><div className="card-title grow" style={{ color: "var(--red)" }}>Záporné saldo ({negM.length})</div>{emails && <a className="btn btn-ghost btn-sm" href={`mailto:?bcc=${encodeURIComponent(emails)}&subject=${encodeURIComponent("LKRA bar – dobití kreditu")}`}>✉️ E-mail všem</a>}</div>
          {negM.length === 0 ? <div className="muted">Nikdo není v minusu 🎉</div> : negM.map((m) => <div key={m.id} className="rank"><b className="grow">{m.name}</b><span className="muted" style={{ fontSize: ".85rem" }}>{m.email}</span><b className="num" style={{ color: "var(--red)" }}>{m.balance} Kč</b></div>)}
        </div>
        <div className="card">
          <div className="card-title" style={{ color: "var(--amber)" }}>Nízký kredit ({warnM.length})</div>
          {warnM.length === 0 ? <div className="muted">Nikdo nemá nízký kredit</div> : warnM.map((m) => <div key={m.id} className="rank"><b className="grow">{m.name}</b><b className="num" style={{ color: "var(--amber)" }}>{m.balance} Kč</b></div>)}
        </div>
      </div>
    </>
  );
}

// ─── Nastavení ────────────────────────────────────────────────────────────────
export function AdminSettings({ state, dispatch }) {
  const [bank, setBank] = useState(state.bankAccount);
  const [thr, setThr] = useState(state.lowBalanceThreshold);
  const save = async () => {
    const a = await dispatch({ type: "SET_BANK", value: bank });
    const b = a && await dispatch({ type: "SET_THRESHOLD", value: parseInt(thr) || 0 }, "Nastavení uloženo");
    return b;
  };
  return (
    <>
      <PageHead title="Nastavení" />
      <div className="card" style={{ maxWidth: 560 }}>
        <div style={{ marginBottom: 16 }}><label>Číslo účtu ve formátu IBAN (pro QR platbu)</label><input value={bank} onChange={(e) => setBank(e.target.value)} placeholder="CZ65 0800 0000 0012 3456 7890" /></div>
        <div style={{ marginBottom: 20 }}><label>Upozornit na nízký kredit pod (Kč)</label><input type="number" value={thr} onChange={(e) => setThr(e.target.value)} /><div className="muted" style={{ fontSize: ".78rem", marginTop: 4 }}>Pod touto hranicí se po nákupu ukáže QR kód na dobití.</div></div>
        <button className="btn btn-primary" onClick={save}>Uložit nastavení</button>
      </div>
      <div className="card" style={{ maxWidth: 560 }}>
        <div className="card-title">📦 Minima skladu</div>
        <div className="card-sub" style={{ marginBottom: 0 }}>Minimum se nastavuje u každého produktu zvlášť v <b>Stav skladu</b> (klikni na produkt). Nové produkty dostanou výchozí minimum 5 ks.</div>
      </div>
    </>
  );
}
