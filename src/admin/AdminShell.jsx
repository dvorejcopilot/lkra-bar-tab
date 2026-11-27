// Správa baru: přihlášení, menu a přepínání stránek.
import { useEffect, useState } from "react";
import { LKRALogo } from "../components/Logo.jsx";
import { stockStatus } from "../lib/stock.js";
import { AdminDashboard } from "./Dashboard.jsx";
import { AdminStock } from "./Stock.jsx";
import { AdminRestock } from "./Restock.jsx";
import { AdminCount } from "./Count.jsx";
import { AdminMoves } from "./Moves.jsx";
import { AdminMembers, AdminTransactions, AdminNotifications, AdminEmail, AdminSettings } from "./Other.jsx";

const NAV = [
  { id: "dashboard", icon: "📊", label: "Přehled" },
  { group: "Sklad" },
  { id: "stock", icon: "📦", label: "Stav skladu" },
  { id: "restock", icon: "📥", label: "Naskladnit" },
  { id: "count", icon: "📋", label: "Inventura" },
  { id: "moves", icon: "🔁", label: "Pohyby skladu" },
  { group: "Členové" },
  { id: "members", icon: "👥", label: "Členové" },
  { id: "transactions", icon: "🧾", label: "Útraty" },
  { id: "notifications", icon: "🔔", label: "Upozornění" },
  { group: "Systém" },
  { id: "email", icon: "💾", label: "Záloha a fronty" },
  { id: "settings", icon: "⚙️", label: "Nastavení" },
];
const IDS = NAV.filter((n) => n.id).map((n) => n.id);
// Starší odkaz "receipt" vede na naskladnění z účtenky
const fromHash = () => { const h = window.location.hash.slice(1); return h === "receipt" ? "restock" : IDS.includes(h) ? h : "dashboard"; };

export function AdminView({ state, dispatch, onLogout }) {
  const [page, setPage] = useState(fromHash);
  const [restockPrefill, setRestockPrefill] = useState(null);
  useEffect(() => {
    const f = () => setPage(fromHash());
    window.addEventListener("hashchange", f);
    return () => window.removeEventListener("hashchange", f);
  }, []);
  const go = (id, prefill) => {
    if (prefill !== undefined) setRestockPrefill(prefill);
    if (window.location.hash.slice(1) !== id) window.location.hash = id;
    setPage(id); window.scrollTo(0, 0);
  };

  const counts = {
    stock: state.products.filter((p) => stockStatus(p) !== "ok" && !p.hidden).length,
    notifications: state.notifications.filter((n) => !n.sent).length,
  };
  const props = { state, dispatch, go };

  return (
    <div className="admin">
      <aside className="sidebar">
        <div className="brand"><LKRALogo size={40} /><div><b>LKRA Bar</b><small>Správa baru</small></div></div>
        {NAV.map((n, i) => n.group
          ? <div key={i} className="nav-group">{n.group}</div>
          : <button key={n.id} className={`nav-btn${page === n.id ? " active" : ""}`} onClick={() => go(n.id)}>
              <span className="ic">{n.icon}</span>{n.label}{counts[n.id] > 0 && <span className="cnt">{counts[n.id]}</span>}
            </button>)}
        <div className="spacer" />
        <a className="nav-btn" href="/" target="_blank" rel="noreferrer"><span className="ic">🖥</span>Otevřít tablet</a>
        <button className="btn btn-ghost btn-sm logout" onClick={onLogout}>Odhlásit</button>
      </aside>

      <div className="mobile-top">
        <LKRALogo size={34} /><b>LKRA Bar · správa</b>
        <button className="btn btn-sm logout" style={{ color: "#fff", border: "1px solid rgba(255,255,255,.3)", background: "none" }} onClick={onLogout}>Odhlásit</button>
      </div>
      <nav className="mobile-nav">
        {NAV.filter((n) => n.id).map((n) => (
          <button key={n.id} className={`chip${page === n.id ? " active" : ""}`} onClick={() => go(n.id)}>
            {n.icon} {n.label}{counts[n.id] > 0 && <span className="count">({counts[n.id]})</span>}
          </button>
        ))}
      </nav>

      <main className="main-panel">
        {page === "dashboard" && <AdminDashboard {...props} />}
        {page === "stock" && <AdminStock {...props} />}
        {page === "restock" && <AdminRestock {...props} prefill={restockPrefill} clearPrefill={() => setRestockPrefill(null)} />}
        {page === "count" && <AdminCount {...props} />}
        {page === "moves" && <AdminMoves {...props} />}
        {page === "members" && <AdminMembers {...props} />}
        {page === "transactions" && <AdminTransactions {...props} />}
        {page === "notifications" && <AdminNotifications {...props} />}
        {page === "email" && <AdminEmail {...props} />}
        {page === "settings" && <AdminSettings {...props} />}
      </main>
    </div>
  );
}

export function AdminLoginView({ onLogin, onBack }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); if (!pw || busy) return;
    setBusy(true); const er = await onLogin(pw); setBusy(false);
    if (er) { setErr(er); setPw(""); }
  };
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: "linear-gradient(160deg,#1a3a6b,#0f2447)" }}>
      <form onSubmit={submit} className="card" style={{ width: "100%", maxWidth: 360, textAlign: "center", padding: 28, marginBottom: 0 }}>
        <LKRALogo size={64} />
        <h2 style={{ fontWeight: 850, marginTop: 12, fontSize: "1.4rem" }}>Správa baru</h2>
        <p className="muted" style={{ marginBottom: 20 }}>Aeroklub Raná · zadej heslo správce</p>
        <input type="password" autoFocus value={pw} onChange={(e) => { setPw(e.target.value); setErr(""); }} placeholder="Heslo" style={{ marginBottom: 12, textAlign: "center" }} />
        {err && <div className="error" style={{ marginBottom: 12 }}>{err}</div>}
        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>{busy ? "Ověřuji…" : "Přihlásit"}</button>
        {onBack && <button type="button" className="btn btn-text" style={{ marginTop: 10 }} onClick={onBack}>← Zpět na tablet</button>}
      </form>
    </div>
  );
}
