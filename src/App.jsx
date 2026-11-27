import { useState, useEffect, useCallback } from "react";
import { css } from "./styles.js";
import { LKRALogo } from "./components/Logo.jsx";
import { api, getAdminPw, setAdminPw, UIProvider, useUI } from "./ui.jsx";
import { KioskView, LoginView, CheckoutView } from "./kiosk.jsx";
import { AdminView, AdminLoginView } from "./admin/AdminShell.jsx";

export default function App() {
  return (
    <UIProvider>
      <style>{css}</style>
      <Main />
    </UIProvider>
  );
}

function Main() {
  // Správa běží na adrese /admin, tablet v baru na hlavní adrese.
  const isAdminUrl = window.location.pathname.startsWith("/admin");
  const { toast } = useUI();
  const [state, setState] = useState(null);       // data ze serveru
  const [loadErr, setLoadErr] = useState("");
  const [view, setView] = useState(isAdminUrl ? "adminLogin" : "kiosk");
  const [cart, setCart] = useState([]);
  const [result, setResult] = useState(null);     // výsledek posledního nákupu

  const isAdmin = view === "admin";

  // Načtení dat ze serveru (a pak každých 15 s znovu, ať jsou vidět změny od ostatních)
  const refresh = useCallback(async () => {
    try {
      const data = isAdmin ? await api("/api/admin", {}, { admin: true }) : await api("/api/state");
      setState(data); setLoadErr("");
    } catch (e) {
      if (isAdmin && e.status === 401) { setAdminPw(""); setView("adminLogin"); }
      else setLoadErr(e.message);
    }
  }, [isAdmin]);
  useEffect(() => { refresh(); const t = setInterval(refresh, 15000); return () => clearInterval(t); }, [refresh]);

  // Admin: pošle změnu na server a zobrazí nová data. Vrací true/false.
  const dispatch = useCallback(async (action, okMsg) => {
    try {
      setState(await api("/api/admin", { action }, { admin: true }));
      if (okMsg) toast(okMsg, "ok");
      return true;
    } catch (e) { toast("Nepodařilo se uložit: " + e.message, "err"); return false; }
  }, [toast]);

  const adminLogin = async (password) => {
    try {
      const data = await api("/api/admin", {}, { admin: true, password });
      setAdminPw(password); setState(data); setView("admin"); return null;
    } catch (e) { return e.message; }
  };
  const adminLogout = () => { setAdminPw(""); setState(null); setView(isAdminUrl ? "adminLogin" : "kiosk"); };

  // Automatické přihlášení správce po obnovení stránky
  useEffect(() => { if (view === "adminLogin" && getAdminPw()) adminLogin(getAdminPw()); }, []); // eslint-disable-line

  // Když se mezitím změnil sklad nebo zmizel produkt, uprav košík.
  useEffect(() => {
    if (!state || !cart.length) return;
    setCart((c) => c.flatMap((i) => {
      const p = state.products.find((x) => x.id === i.id);
      if (!p || p.stock <= 0) return [];
      return [{ ...i, price: p.price, qty: Math.min(i.qty, p.stock) }];
    }));
  }, [state]); // eslint-disable-line

  if (view === "adminLogin") return <AdminLoginView onLogin={adminLogin} onBack={isAdminUrl ? null : () => setView("kiosk")} />;
  if (!state) {
    return (
      <div className="app" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", flexDirection: "column", gap: 16 }}>
        <LKRALogo size={64} />
        <div className="muted">{loadErr ? `⚠️ ${loadErr}` : "Načítám…"}</div>
        {loadErr && <button className="btn btn-primary" onClick={refresh}>Zkusit znovu</button>}
      </div>
    );
  }

  const cartTotal = cart.reduce((s, i) => s + i.price * i.qty, 0);

  // Zaplacení: server ověří PIN a odečte peníze. Vrací chybovou hlášku, nebo null.
  const doCheckout = async (member, pin) => {
    if (!member || !cart.length) return "Prázdný košík";
    try {
      const r = await api("/api/checkout", { memberId: member.id, pin, cart: cart.map((i) => ({ id: i.id, qty: i.qty })) });
      setState(r.state); setResult(r); setView("checkout"); return null;
    } catch (e) { return e.message; }
  };
  const finishCheckout = () => { setCart([]); setResult(null); setView("kiosk"); };

  return (
    <div className="app">
      {view === "kiosk" && <KioskView state={state} cart={cart} setCart={setCart} onPay={() => setView("login")} />}
      {view === "login" && <LoginView members={state.members} total={cartTotal} onBack={() => setView("kiosk")} onLogin={doCheckout} />}
      {view === "checkout" && result && <CheckoutView member={result.member} cart={result.cart} cartTotal={result.total} bankAccount={state.bankAccount} threshold={state.lowBalanceThreshold} onDone={finishCheckout} />}
      {view === "admin" && state.transactions && <AdminView state={state} dispatch={dispatch} onLogout={adminLogout} />}
    </div>
  );
}
