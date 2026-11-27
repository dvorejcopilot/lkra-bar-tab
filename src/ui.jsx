// Společné stavební kameny: komunikace se serverem, okna, hlášky, stepper…
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { STATUS, stockStatus, minOf } from "./lib/stock.js";

// ─── Server ───────────────────────────────────────────────────────────────────
const ADMIN_PW_KEY = "lkra-admin-password";
export const getAdminPw = () => { try { return sessionStorage.getItem(ADMIN_PW_KEY) || ""; } catch { return ""; } };
export const setAdminPw = (v) => { try { v ? sessionStorage.setItem(ADMIN_PW_KEY, v) : sessionStorage.removeItem(ADMIN_PW_KEY); } catch {} };

export async function api(path, body, { admin = false, password } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (admin) headers["x-admin-password"] = password ?? getAdminPw();
  const resp = await fetch(path, body === undefined ? { headers } : { method: "POST", headers, body: JSON.stringify(body) });
  let data = {};
  try { data = await resp.json(); } catch {}
  if (!resp.ok) { const e = new Error(data.error || "Chyba spojení se serverem"); e.status = resp.status; throw e; }
  return data;
}

// ─── Hlášky (toast) a potvrzovací okno ────────────────────────────────────────
const UICtx = createContext(null);
export const useUI = () => useContext(UICtx);

export function UIProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [ask, setAsk] = useState(null);
  const toast = useCallback((msg, kind = "") => {
    const id = Math.random();
    setToasts((t) => [...t, { id, msg, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === "err" ? 5000 : 2600);
  }, []);
  // confirm({title, text, ok, danger}) → Promise<boolean>
  const confirm = useCallback((opts) => new Promise((resolve) => setAsk({ ...opts, resolve })), []);
  const close = (v) => { ask?.resolve(v); setAsk(null); };
  return (
    <UICtx.Provider value={{ toast, confirm }}>
      {children}
      <div className="toasts">{toasts.map((t) => <div key={t.id} className={`toast ${t.kind}`}>{t.msg}</div>)}</div>
      {ask && (
        <Modal title={ask.title || "Opravdu?"} onClose={() => close(false)} footer={<>
          <button className="btn btn-ghost" onClick={() => close(false)}>Zrušit</button>
          <button className={`btn ${ask.danger ? "btn-red" : "btn-primary"}`} onClick={() => close(true)} autoFocus>{ask.ok || "Potvrdit"}</button>
        </>}>
          <p style={{ color: "var(--muted)" }}>{ask.text}</p>
        </Modal>
      )}
    </UICtx.Provider>
  );
}

// ─── Modální okno ─────────────────────────────────────────────────────────────
export function Modal({ title, icon, onClose, children, footer, width }) {
  useEffect(() => {
    const k = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div className="modal-bg" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="modal" style={width ? { maxWidth: width } : null} role="dialog" aria-modal="true">
        <div className="modal-head">
          {icon && <span style={{ fontSize: "1.5rem" }}>{icon}</span>}
          <h3>{title}</h3>
          {onClose && <button className="icon-btn" onClick={onClose} aria-label="Zavřít">✕</button>}
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

// ─── Drobnosti ────────────────────────────────────────────────────────────────
export function Stepper({ value, onChange, min = 0, max = 9999 }) {
  const v = Number(value) || 0;
  const set = (n) => onChange(Math.min(max, Math.max(min, n)));
  return (
    <div className={`stepper${v ? " active" : ""}`}>
      <button type="button" onClick={() => set(v - 1)} aria-label="Méně">−</button>
      <input type="number" inputMode="numeric" value={value === 0 ? "" : value} placeholder="0"
        onChange={(e) => onChange(e.target.value === "" ? 0 : Math.min(max, Math.max(min, parseInt(e.target.value) || 0)))}
        onFocus={(e) => e.target.select()} />
      <button type="button" onClick={() => set(v + 1)} aria-label="Více">+</button>
    </div>
  );
}

export function StockBadge({ p }) {
  const s = STATUS[stockStatus(p)];
  return <span className={`badge ${s.cls}`}>{p.stock} ks</span>;
}

// Proužek zásoby: plný = 3× minimum a víc.
export function StockMeter({ p }) {
  const st = stockStatus(p);
  const full = Math.max(1, minOf(p) * 3);
  const pct = Math.max(st === "out" ? 0 : 4, Math.min(100, (p.stock / full) * 100));
  return <div className="meter"><span style={{ width: `${pct}%`, background: STATUS[st].color }} /></div>;
}

export function ProdCell({ p, sub }) {
  return (
    <div className="prod-cell">
      <div className="emo">{p.emoji || "📦"}</div>
      <div className="grow">
        <div className="nm">{p.name}{p.special && <span title="Speciál dne" style={{ color: "var(--gold)", marginLeft: 6 }}>⭐</span>}</div>
        {sub && <div className="sub">{sub}</div>}
      </div>
    </div>
  );
}

export function PageHead({ title, sub, children }) {
  return (
    <div className="page-head">
      <div><h1>{title}</h1>{sub && <p>{sub}</p>}</div>
      {children && <div className="actions">{children}</div>}
    </div>
  );
}

export function Search({ value, onChange, placeholder = "Hledat…" }) {
  return <div className="search"><input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} /></div>;
}

// Bez diakritiky a malými písmeny – pro hledání
export const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function useNow(ms = 1000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), ms); return () => clearInterval(t); }, [ms]);
  return now;
}

export function useIdle(ms, onIdle, active = true) {
  const cb = useRef(onIdle); cb.current = onIdle;
  useEffect(() => {
    if (!active) return;
    let t = setTimeout(() => cb.current(), ms);
    const reset = () => { clearTimeout(t); t = setTimeout(() => cb.current(), ms); };
    const ev = ["pointerdown", "keydown"];
    ev.forEach((e) => window.addEventListener(e, reset));
    return () => { clearTimeout(t); ev.forEach((e) => window.removeEventListener(e, reset)); };
  }, [ms, active]);
}
