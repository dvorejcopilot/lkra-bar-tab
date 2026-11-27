// Tablet v baru: výběr zboží, výběr člena + PIN, potvrzení nákupu.
import { useEffect, useMemo, useState } from "react";
import QR from "qrcode";
import { LKRALogo } from "./components/Logo.jsx";
import { norm, Search, useIdle, useNow } from "./ui.jsx";

// ─── QR platba ────────────────────────────────────────────────────────────────
// QR kód se generuje přímo v prohlížeči (knihovna "qrcode"), nepotřebuje žádnou cizí službu.
const QRCode = ({ value, size = 160 }) => {
  const [src, setSrc] = useState("");
  useEffect(() => { QR.toDataURL(value, { width: size * 2, margin: 1 }).then(setSrc).catch(() => setSrc("")); }, [value, size]);
  return src ? <img src={src} alt="QR platba" style={{ width: size, height: size, borderRadius: 8, display: "block", margin: "0 auto" }} /> : null;
};

// Český standard "QR Platba" (SPD) – tomu rozumí všechny české bankovní appky.
function paymentQR(iban, amount, msg) {
  const acc = (iban || "").replace(/\s+/g, "").toUpperCase();
  const clean = (t) => (t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\*/g, "").slice(0, 60);
  return `SPD*1.0*ACC:${acc}*AM:${Number(amount).toFixed(2)}*CUR:CZK*MSG:${clean(msg)}`;
}

// ─── Český 5. pád ─────────────────────────────────────────────────────────────
function vocative(name) {
  const first = name.split(" ")[0];
  const l = first.toLowerCase();
  if (l.endsWith("a")) return first.slice(0, -1) + "o";
  if (l.endsWith("ek")) return first.slice(0, -2) + "ku";
  if (l.endsWith("el")) return first.slice(0, -2) + "le";
  if (l.endsWith("k")) return first.slice(0, -1) + "ku";
  if (["r", "n", "t", "s", "l", "p", "v"].some((e) => l.endsWith(e))) return first + "e";
  if (l.endsWith("š")) return first + "i";
  return first;
}

// ─── Nabídka ──────────────────────────────────────────────────────────────────
export function KioskView({ state, cart, setCart, onPay }) {
  const [cat, setCat] = useState("Vše");
  const [open, setOpen] = useState(false);
  const now = useNow(15000);
  const specials = state.products.filter((p) => p.special);
  const cats = ["Vše", ...new Set(state.products.filter((p) => !p.special).map((p) => p.category))];
  const regular = state.products.filter((p) => !p.special && (cat === "Vše" || p.category === cat));
  const count = cart.reduce((s, i) => s + i.qty, 0);
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);

  // Když tablet chvíli nikdo nepoužívá, košík se vyprázdní.
  useIdle(3 * 60 * 1000, () => { setCart([]); setOpen(false); }, count > 0);

  const add = (p) => {
    if (p.stock <= 0) return;
    setCart((c) => {
      const ex = c.find((i) => i.id === p.id);
      if (ex) return ex.qty >= p.stock ? c : c.map((i) => (i.id === p.id ? { ...i, qty: i.qty + 1 } : i));
      return [...c, { ...p, qty: 1 }];
    });
  };
  const dec = (id) => setCart((c) => c.flatMap((i) => (i.id !== id ? [i] : i.qty > 1 ? [{ ...i, qty: i.qty - 1 }] : [])));
  useEffect(() => { if (!count) setOpen(false); }, [count]);

  const card = (p) => {
    const inCart = cart.find((i) => i.id === p.id);
    const low = p.stock > 0 && p.stock <= 3;
    return (
      <div key={p.id} className={`prod-card${p.special ? " special" : ""}${inCart ? " in-cart" : ""}${p.stock <= 0 ? " out" : ""}`} onClick={() => add(p)}>
        {inCart && <div className="qty-pill">{inCart.qty}×</div>}
        <div className="prod-emoji">{p.emoji}</div>
        <div className="prod-name">{p.name}</div>
        <div className="prod-price">{p.price} Kč</div>
        <div className={`prod-stock${low ? " low" : ""}`}>{p.stock <= 0 ? "Vyprodáno" : low ? `Poslední ${p.stock} ks` : `Skladem ${p.stock}`}</div>
      </div>
    );
  };

  return (
    <div className="kiosk">
      <div className="kiosk-head">
        <LKRALogo size={56} />
        <div>
          <h1>Aeroklub Raná</h1>
          <small>Samoobslužný bar · vezmi si, zapiš si</small>
        </div>
        <div className="clock">
          {now.toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" })}
          <small style={{ display: "block", color: "var(--muted)" }}>{now.toLocaleDateString("cs-CZ", { weekday: "long", day: "numeric", month: "long" })}</small>
        </div>
      </div>

      {specials.length > 0 && <>
        <div className="section-label">⭐ Speciál dne</div>
        <div className="specials-row">{specials.map(card)}</div>
      </>}

      <div className="cat-tabs">
        {cats.map((c) => <button key={c} className={`cat-btn${cat === c ? " active" : ""}`} onClick={() => setCat(c)}>{c}</button>)}
      </div>
      <div className="product-grid">{regular.map(card)}</div>
      {!state.products.length && <div className="empty"><div className="big">🍻</div>Nabídka je zatím prázdná.</div>}

      {count > 0 && (
        <div className="cart-bar">
          <div className="cart-inner">
            {open && (
              <div className="cart-lines">
                {cart.map((i) => (
                  <div key={i.id} className="cart-line">
                    <span style={{ fontSize: "1.4rem" }}>{i.emoji}</span>
                    <span className="grow" style={{ fontWeight: 600 }}>{i.name}</span>
                    <button className="icon-btn" onClick={() => dec(i.id)}>−</button>
                    <b className="num" style={{ minWidth: 28, textAlign: "center" }}>{i.qty}</b>
                    <button className="icon-btn" onClick={() => add(state.products.find((p) => p.id === i.id) || i)}>+</button>
                    <span className="num" style={{ minWidth: 70, textAlign: "right", fontWeight: 700 }}>{i.price * i.qty} Kč</span>
                  </div>
                ))}
              </div>
            )}
            <div className="cart-main">
              <button className="btn btn-text" onClick={() => setOpen(!open)} style={{ padding: 0, gap: 12, color: "var(--text)" }}>
                <div className="cart-count">{count}</div>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontWeight: 700 }}>Košík {open ? "▾" : "▴"}</div>
                  <div style={{ fontSize: ".82rem", color: "var(--muted)" }}>{open ? "Skrýt položky" : "Klepni pro úpravu"}</div>
                </div>
              </button>
              <div className="spacer" />
              <div className="num" style={{ fontWeight: 850, color: "var(--navy)", fontSize: "1.35rem" }}>{total} Kč</div>
              <button className="btn btn-ghost btn-lg" style={{ padding: "16px 18px" }} onClick={() => setCart([])} aria-label="Vyprázdnit košík">🗑</button>
              <button className="btn btn-primary btn-lg" onClick={onPay}>Zaplatit →</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Výběr člena a PIN ────────────────────────────────────────────────────────
export function LoginView({ members, total, onBack, onLogin }) {
  const [sel, setSel] = useState(null);
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");
  useIdle(90 * 1000, onBack);

  const list = useMemo(() => [...members].sort((a, b) => a.name.localeCompare(b.name, "cs")).filter((m) => !q || norm(m.name).includes(norm(q))), [members, q]);

  const press = (n) => {
    if (busy || pin.length >= 4) return;
    const np = pin + n; setPin(np); setErr("");
    if (np.length === 4) {
      setBusy(true);
      onLogin(sel, np).then((e) => { setBusy(false); if (e) { setErr(e); setTimeout(() => setPin(""), 700); } });
    }
  };

  return (
    <div className="login-screen">
      <div className="row" style={{ marginBottom: 18 }}>
        <button className="btn btn-ghost" onClick={onBack}>← Zpět</button>
        <div className="spacer" />
        <div style={{ fontWeight: 800, color: "var(--navy)", fontSize: "1.15rem" }}>K zaplacení {total} Kč</div>
      </div>

      {!sel ? <>
        <h2 style={{ fontSize: "1.6rem", fontWeight: 850, marginBottom: 4 }}>Kdo si bere? 👋</h2>
        <p className="muted">Vyber své jméno</p>
        {members.length > 12 && <div style={{ marginTop: 14 }}><Search value={q} onChange={setQ} placeholder="Hledat jméno…" /></div>}
        <div className="member-list">
          {list.map((m) => (
            <div key={m.id} className="member-btn" onClick={() => { setSel(m); setPin(""); setErr(""); }}>
              <div className="avatar">{m.avatar}</div>
              <div style={{ fontWeight: 700 }}>{m.name.split(" ")[0]}</div>
              <div style={{ fontSize: ".8rem", color: "var(--muted)" }}>{m.name.split(" ").slice(1).join(" ")}</div>
            </div>
          ))}
        </div>
      </> : (
        <div className="pin-sheet">
          <div className="row" style={{ justifyContent: "center", marginBottom: 6 }}>
            <div className="avatar sm">{sel.avatar}</div>
            <div style={{ fontWeight: 800, fontSize: "1.15rem" }}>{sel.name}</div>
          </div>
          <button className="btn btn-text btn-sm" onClick={() => setSel(null)}>Nejsem to já</button>
          <div className="pin-input">{[0, 1, 2, 3].map((i) => <div key={i} className={`pin-dot${pin.length > i ? " filled" : ""}`} />)}</div>
          <div style={{ minHeight: 26 }}>{busy ? <span className="spinner" /> : err && <div className="error" style={{ marginTop: 0 }}>{err}</div>}</div>
          <div className="numpad" style={{ marginTop: 10 }}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, "", 0, "⌫"].map((n, i) => (
              <button key={i} className="num-btn" disabled={busy}
                onClick={() => (n === "⌫" ? setPin((p) => p.slice(0, -1)) : n !== "" && press(String(n)))}
                style={{ visibility: n === "" ? "hidden" : "visible" }}>{n}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Potvrzení nákupu ─────────────────────────────────────────────────────────
export function CheckoutView({ member, cart, cartTotal, bankAccount, threshold, onDone }) {
  const nb = member.balance;
  const showQR = nb < threshold;
  const balClass = nb > threshold ? "balance-pos" : nb >= 0 ? "balance-warn" : "balance-neg";
  const [left, setLeft] = useState(showQR ? 45 : 15);
  useEffect(() => {
    const t = setInterval(() => setLeft((s) => { if (s <= 1) { clearInterval(t); onDone(); } return s - 1; }), 1000);
    return () => clearInterval(t);
  }, []); // eslint-disable-line
  return (
    <div className="checkout">
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div style={{ fontSize: "3.5rem" }}>✅</div>
        <h2 style={{ fontWeight: 850, fontSize: "1.6rem" }}>Hotovo, {vocative(member.name)}!</h2>
        <p className="muted" style={{ marginTop: 4 }}>Tvůj nákup je zapsaný. Na zdraví!</p>
      </div>
      <div className="card">
        <div className="label" style={{ textTransform: "uppercase", letterSpacing: ".05em" }}>Shrnutí nákupu</div>
        {cart.map((i) => (
          <div key={i.id} className="cart-item">
            <span style={{ fontWeight: 600 }}>{i.emoji} {i.name} <span className="muted">×{i.qty}</span></span>
            <span className="num" style={{ fontWeight: 700, color: "var(--navy)" }}>{i.price * i.qty} Kč</span>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 0 0", fontWeight: 850, fontSize: "1.2rem" }}>
          <span>Celkem</span><span className="num" style={{ color: "var(--navy)" }}>{cartTotal} Kč</span>
        </div>
      </div>
      <div className={`balance-card ${balClass}`}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: ".88rem", fontWeight: 600, marginBottom: 4 }}>Stav tvého účtu</div>
            <div className="num" style={{ fontSize: "2.2rem", fontWeight: 900 }}>{nb} Kč</div>
          </div>
          <div style={{ fontSize: "2.5rem" }}>{nb > threshold ? "😊" : nb >= 0 ? "😐" : "😅"}</div>
        </div>
      </div>
      {showQR && (
        <div className="qr-box">
          <div style={{ color: "var(--amber)", fontWeight: 800, fontSize: "1.05rem", marginBottom: 6 }}>{nb < 0 ? "💸 Jsi v minusu, dobij si kredit" : "⚠️ Kredit se blíží k nule"}</div>
          <p className="muted" style={{ fontSize: ".9rem", marginBottom: 16 }}>Naskenuj QR v bankovní appce. Žádný spěch, vyřešíme v pohodě 🙂</p>
          <QRCode value={paymentQR(bankAccount, Math.abs(Math.min(nb, 0)) + 200, `LKRA bar ${member.name}`)} size={160} />
          <div style={{ fontSize: ".8rem", color: "var(--muted)", marginTop: 10, fontFamily: "monospace" }}>{bankAccount}</div>
        </div>
      )}
      <button className="btn btn-primary btn-lg btn-block" style={{ marginTop: 8 }} onClick={onDone}>Zavřít ({left})</button>
    </div>
  );
}
