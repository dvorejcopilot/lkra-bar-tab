import { useState, useRef, useEffect, useCallback } from "react";
import QR from "qrcode";

// ─── QR code ──────────────────────────────────────────────────────────────────
// QR kód se generuje přímo v prohlížeči (knihovna "qrcode"), nepotřebuje žádnou cizí službu.
const QRCode = ({ value, size = 160 }) => {
  const [src, setSrc] = useState("");
  useEffect(() => { QR.toDataURL(value, { width: size * 2, margin: 1 }).then(setSrc).catch(() => setSrc("")); }, [value, size]);
  return src ? <img src={src} alt="QR platba" style={{width:size,height:size,borderRadius:8,display:"block",margin:"0 auto"}} /> : null;
};

// Český standard "QR Platba" (SPD) – tomu rozumí všechny české bankovní appky.
function paymentQR(iban, amount, msg) {
  const acc = (iban || "").replace(/\s+/g, "").toUpperCase();
  const clean = (t) => (t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\*/g, "").slice(0, 60);
  return `SPD*1.0*ACC:${acc}*AM:${Number(amount).toFixed(2)}*CUR:CZK*MSG:${clean(msg)}`;
}

// ─── Czech vocative ───────────────────────────────────────────────────────────
function vocative(name) {
  const first = name.split(" ")[0];
  const l = first.toLowerCase();
  if (l.endsWith("a")) return first.slice(0,-1) + "o";
  if (l.endsWith("ek")) return first.slice(0,-2) + "ku";
  if (l.endsWith("el")) return first.slice(0,-2) + "le";
  if (l.endsWith("k")) return first.slice(0,-1) + "ku";
  if (["r","n","t","s","l","p","v"].some(e => l.endsWith(e))) return first + "e";
  if (l.endsWith("š")) return first + "i";
  return first;
}

// ─── Komunikace se serverem ───────────────────────────────────────────────────
// Všechna data teď leží na serveru (Netlify), aby je viděli všichni správci
// a tablet v baru najednou. Tyhle funkce s ním mluví.
const ADMIN_PW_KEY = "lkra-admin-password";
const getAdminPw = () => { try { return sessionStorage.getItem(ADMIN_PW_KEY) || ""; } catch { return ""; } };
const setAdminPw = (v) => { try { v ? sessionStorage.setItem(ADMIN_PW_KEY, v) : sessionStorage.removeItem(ADMIN_PW_KEY); } catch {} };

async function api(path, body, { admin = false, password } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (admin) headers["x-admin-password"] = password ?? getAdminPw();
  const resp = await fetch(path, body === undefined ? { headers } : { method: "POST", headers, body: JSON.stringify(body) });
  let data = {};
  try { data = await resp.json(); } catch {}
  if (!resp.ok) { const e = new Error(data.error || "Chyba spojení se serverem"); e.status = resp.status; throw e; }
  return data;
}

// ─── CSV export ───────────────────────────────────────────────────────────────
function generateCSV(members, products) {
  const now = new Date().toLocaleString("cs-CZ");
  let csv = `LKRA Club Bar – Záloha stavu systému\nVygenerováno: ${now}\n\n`;
  csv += "=== STAV KONT ČLENŮ ===\n";
  csv += "Jméno,Email,Saldo (Kč),Stav\n";
  members.forEach(m => { const s = m.balance>50?"OK":m.balance>=0?"Nízký kredit":"MINUS"; csv += `"${m.name}","${m.email}",${m.balance},"${s}"\n`; });
  csv += "\n=== STAV SKLADU ===\n";
  csv += "Produkt,Kategorie,Cena (Kč),Skladem,Stav\n";
  products.forEach(p => { const s = p.stock>10?"OK":p.stock>0?"Nízký stav":"VYPRODÁNO"; csv += `"${p.name}","${p.category}",${p.price},${p.stock},"${s}"\n`; });
  return csv;
}
function downloadCSV(content, filename) {
  const blob = new Blob(["\uFEFF"+content], {type:"text/csv;charset=utf-8;"});
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = filename; a.click();
}

// ─── LKRA Logo ────────────────────────────────────────────────────────────────
// Logo klubu je obrázek v public/logo.png (výška = size, šířka se dopočítá).
const LKRALogo = ({ size = 48 }) => (
  <img src="/logo.png" alt="LKRA" style={{height:size,width:"auto",display:"block",flexShrink:0}} />
);

// ─── Colors ───────────────────────────────────────────────────────────────────
const C = {
  bg:"#f5f7fa", card:"#ffffff", accent:"#1a3a6b", gold:"#c8a84b",
  green:"#2e7d52", red:"#c0392b", amber:"#d4860a",
  text:"#1a1a2e", muted:"#6b7280", border:"#e2e6ed",
  shadow:"0 2px 12px rgba(26,58,107,.10)", shadowHover:"0 6px 24px rgba(26,58,107,.16)",
};

const css = `
* { box-sizing:border-box; margin:0; padding:0; }
body { background:${C.bg}; color:${C.text}; font-family:'Segoe UI',system-ui,sans-serif; }
.app { min-height:100vh; }
.kiosk { max-width:960px; margin:0 auto; padding:20px; }
.logo-bar { display:flex; align-items:center; gap:16px; padding:12px 0 8px; border-bottom:2px solid ${C.border}; margin-bottom:20px; }
.logo-bar h1 { font-size:1.8rem; font-weight:900; color:${C.accent}; }
.logo-bar small { color:${C.muted}; font-size:.9rem; display:block; }
.cat-tabs { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:20px; }
.cat-btn { padding:10px 20px; border-radius:24px; border:2px solid ${C.border}; background:#fff; color:${C.muted}; cursor:pointer; font-size:1rem; font-weight:600; transition:.18s; }
.cat-btn.active { border-color:${C.accent}; color:${C.accent}; background:rgba(26,58,107,.07); }
.cat-btn:hover:not(.active) { border-color:${C.accent}; color:${C.accent}; }
.specials-banner { margin-bottom:20px; }
.specials-banner-title { font-size:.82rem; font-weight:800; color:${C.gold}; text-transform:uppercase; letter-spacing:1px; margin-bottom:10px; display:flex; align-items:center; gap:6px; }
.specials-row { display:flex; gap:12px; overflow-x:auto; padding-bottom:4px; }
.product-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(170px,1fr)); gap:14px; }
.prod-card { background:#fff; border-radius:16px; padding:20px 14px; text-align:center; cursor:pointer; border:2px solid ${C.border}; transition:.18s; user-select:none; box-shadow:${C.shadow}; }
.prod-card:hover { border-color:${C.accent}; box-shadow:${C.shadowHover}; transform:translateY(-2px); }
.prod-card.special { border-color:${C.gold}; background:linear-gradient(135deg,#fffbf0,#fff); min-width:160px; flex-shrink:0; }
.prod-card.in-cart { border-color:${C.accent}; background:rgba(26,58,107,.04); }
.prod-emoji { font-size:2.6rem; margin-bottom:10px; }
.prod-name { font-size:1rem; font-weight:700; margin-bottom:6px; color:${C.text}; }
.prod-price { color:${C.accent}; font-weight:800; font-size:1.15rem; }
.prod-stock { font-size:.78rem; color:${C.muted}; margin-top:4px; }
.cart-bar { position:sticky; bottom:0; background:#fff; border-top:2px solid ${C.border}; padding:14px 0; display:flex; align-items:center; gap:14px; box-shadow:0 -4px 16px rgba(0,0,0,.07); }
.cart-count { background:${C.accent}; color:#fff; border-radius:50%; width:30px; height:30px; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:.95rem; flex-shrink:0; }
.btn { padding:13px 26px; border-radius:10px; border:none; cursor:pointer; font-weight:700; font-size:1rem; transition:.18s; }
.btn-primary { background:${C.accent}; color:#fff; } .btn-primary:hover { background:#142d55; }
.btn-gold { background:${C.gold}; color:#fff; } .btn-gold:hover { background:#b5922e; }
.btn-ghost { background:transparent; border:2px solid ${C.border}; color:${C.muted}; }
.btn-ghost:hover { border-color:${C.accent}; color:${C.accent}; background:rgba(26,58,107,.04); }
.btn-green { background:${C.green}; color:#fff; }
.btn-red { background:${C.red}; color:#fff; }
.login-screen { max-width:560px; margin:0 auto; padding:36px 20px; }
.member-list { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin:22px 0; }
.member-btn { background:#fff; border:2px solid ${C.border}; border-radius:14px; padding:16px 12px; cursor:pointer; transition:.18s; text-align:center; box-shadow:${C.shadow}; }
.member-btn:hover,.member-btn.sel { border-color:${C.accent}; background:rgba(26,58,107,.04); }
.avatar { width:44px; height:44px; border-radius:50%; background:${C.accent}; color:#fff; font-weight:800; font-size:.95rem; display:flex; align-items:center; justify-content:center; margin:0 auto 8px; }
.pin-input { display:flex; gap:10px; justify-content:center; margin:18px 0; }
.pin-dot { width:16px; height:16px; border-radius:50%; background:${C.border}; transition:.2s; }
.pin-dot.filled { background:${C.accent}; }
.numpad { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; max-width:260px; margin:0 auto; }
.num-btn { background:#fff; border:2px solid ${C.border}; border-radius:12px; padding:18px; font-size:1.4rem; font-weight:700; cursor:pointer; transition:.18s; color:${C.text}; box-shadow:${C.shadow}; }
.num-btn:hover { border-color:${C.accent}; color:${C.accent}; }
.checkout { max-width:540px; margin:0 auto; padding:28px 20px; }
.balance-card { border-radius:16px; padding:18px; margin:18px 0; }
.balance-pos { background:rgba(46,125,82,.08); border:2px solid ${C.green}; }
.balance-warn { background:rgba(212,134,10,.08); border:2px solid ${C.amber}; }
.balance-neg { background:rgba(192,57,43,.08); border:2px solid ${C.red}; }
.cart-item { display:flex; justify-content:space-between; padding:12px 0; border-bottom:1px solid ${C.border}; font-size:1rem; }
.qr-box { background:#fffbf0; border-radius:16px; padding:22px; text-align:center; margin:18px 0; border:2px solid ${C.gold}; }
.admin { display:flex; min-height:100vh; }
.sidebar { width:230px; background:#fff; padding:20px 16px; display:flex; flex-direction:column; gap:6px; border-right:2px solid ${C.border}; box-shadow:2px 0 12px rgba(0,0,0,.04); }
.sidebar h2 { font-size:1rem; font-weight:800; margin-bottom:16px; color:${C.accent}; letter-spacing:.5px; text-transform:uppercase; }
.nav-btn { padding:11px 16px; border-radius:8px; border:none; background:transparent; color:${C.muted}; cursor:pointer; text-align:left; font-size:1rem; font-weight:600; transition:.18s; }
.nav-btn.active,.nav-btn:hover { background:rgba(26,58,107,.08); color:${C.accent}; }
.main-panel { flex:1; padding:28px; overflow-y:auto; background:${C.bg}; }
.stat-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(160px,1fr)); gap:14px; margin-bottom:26px; }
.stat-card { background:#fff; border-radius:14px; padding:18px; border:2px solid ${C.border}; box-shadow:${C.shadow}; }
.stat-val { font-size:2rem; font-weight:800; color:${C.accent}; }
.stat-label { font-size:.85rem; color:${C.muted}; margin-top:4px; }
table { width:100%; border-collapse:collapse; background:#fff; border-radius:12px; overflow:hidden; box-shadow:${C.shadow}; }
th { text-align:left; padding:12px 14px; font-size:.85rem; color:${C.muted}; background:#f8fafc; border-bottom:2px solid ${C.border}; }
td { padding:12px 14px; border-bottom:1px solid ${C.border}; font-size:.95rem; }
tr:last-child td { border-bottom:none; }
.badge { display:inline-block; padding:3px 10px; border-radius:20px; font-size:.8rem; font-weight:700; }
.badge-ok { background:rgba(46,125,82,.12); color:${C.green}; }
.badge-warn { background:rgba(212,134,10,.12); color:${C.amber}; }
.badge-bad { background:rgba(192,57,43,.12); color:${C.red}; }
.badge-blue { background:rgba(26,58,107,.12); color:${C.accent}; }
input,select,textarea { background:#fff; border:2px solid ${C.border}; border-radius:8px; padding:10px 14px; color:${C.text}; font-size:.95rem; width:100%; transition:.18s; }
input:focus,select:focus,textarea:focus { outline:none; border-color:${C.accent}; }
label { font-size:.85rem; color:${C.muted}; display:block; margin-bottom:5px; font-weight:600; }
.form-row { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px; }
.section-title { font-size:1.35rem; font-weight:800; margin-bottom:18px; color:${C.text}; }
.section-card { background:#fff; border-radius:14px; padding:20px; margin-bottom:18px; border:2px solid ${C.border}; box-shadow:${C.shadow}; }
.error { color:${C.red}; font-size:.9rem; margin-top:8px; font-weight:600; }
/* Receipt scanner */
.drop-zone { border:3px dashed ${C.border}; border-radius:16px; padding:40px 20px; text-align:center; cursor:pointer; transition:.2s; background:#fafbfc; }
.drop-zone:hover,.drop-zone.drag { border-color:${C.accent}; background:rgba(26,58,107,.03); }
.receipt-preview { max-width:100%; max-height:300px; border-radius:10px; display:block; margin:12px auto; box-shadow:${C.shadow}; }
.receipt-item { display:flex; align-items:center; gap:10px; padding:10px 14px; border-radius:10px; border:2px solid ${C.border}; margin-bottom:8px; background:#fff; }
.receipt-item.new-item { border-color:${C.gold}; background:#fffbf0; }
.receipt-item.match-item { border-color:${C.green}; background:#f0faf5; }
.spinner { display:inline-block; width:22px; height:22px; border:3px solid ${C.border}; border-top-color:${C.accent}; border-radius:50%; animation:spin .7s linear infinite; }
@keyframes spin { to { transform:rotate(360deg); } }
::-webkit-scrollbar { width:6px; } ::-webkit-scrollbar-track { background:${C.bg}; } ::-webkit-scrollbar-thumb { background:${C.border}; border-radius:3px; }
`;

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  // Správa běží na adrese /admin, tablet v baru na hlavní adrese.
  const isAdminUrl = window.location.pathname.startsWith("/admin");
  const [state, setState] = useState(null);       // data z serveru
  const [loadErr, setLoadErr] = useState("");
  const [view, setView] = useState(isAdminUrl ? "adminLogin" : "kiosk");
  const [cart, setCart] = useState([]);
  const [selMember, setSelMember] = useState(null);
  const [result, setResult] = useState(null);     // výsledek posledního nákupu
  const [catFilter, setCatFilter] = useState("Vše");
  const [adminView, setAdminView] = useState("dashboard");
  const [pinErr, setPinErr] = useState("");
  const [busy, setBusy] = useState(false);

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

  // Admin: pošle změnu na server a zobrazí nová data
  const dispatch = useCallback(async (action) => {
    try { setState(await api("/api/admin", { action }, { admin: true })); }
    catch (e) { alert("Nepodařilo se uložit: " + e.message); }
  }, []);

  const adminLogin = async (password) => {
    try {
      const data = await api("/api/admin", {}, { admin: true, password });
      setAdminPw(password); setState(data); setView("admin"); return null;
    } catch (e) { return e.message; }
  };
  const adminLogout = () => { setAdminPw(""); setState(null); setView(isAdminUrl ? "adminLogin" : "kiosk"); };

  // Automatické přihlášení správce po obnovení stránky
  useEffect(() => { if (view === "adminLogin" && getAdminPw()) adminLogin(getAdminPw()); }, []); // eslint-disable-line

  if (!state) {
    if (view === "adminLogin") return <div className="app"><style>{css}</style><AdminLoginView onLogin={adminLogin} onBack={isAdminUrl ? null : ()=>setView("kiosk")} /></div>;
    return (
      <div className="app" style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",flexDirection:"column",gap:16}}>
        <style>{css}</style>
        <LKRALogo size={64} />
        <div style={{color:C.muted}}>{loadErr ? `⚠️ ${loadErr}` : "Načítám…"}</div>
        {loadErr && <button className="btn btn-primary" onClick={refresh}>Zkusit znovu</button>}
      </div>
    );
  }

  const cats = ["Vše", ...new Set(state.products.filter(p=>!p.special).map(p=>p.category))];
  const specials = state.products.filter(p => p.special);

  const addToCart = (prod) => {
    if(prod.stock<=0) return;
    setCart(c=>{const ex=c.find(i=>i.id===prod.id);return ex?c.map(i=>i.id===prod.id?{...i,qty:i.qty+1}:i):[...c,{...prod,qty:1}];});
  };
  const cartTotal = cart.reduce((s,i)=>s+i.price*i.qty,0);
  const cartCount = cart.reduce((s,i)=>s+i.qty,0);

  // Zaplacení: server ověří PIN a odečte peníze. Vrací chybovou hlášku, nebo null.
  const doCheckout = async (pin) => {
    if(!selMember||!cart.length||busy) return "Prázdný košík";
    setBusy(true);
    try {
      const r = await api("/api/checkout", { memberId: selMember.id, pin, cart: cart.map(i=>({id:i.id,qty:i.qty})) });
      setState(r.state); setResult(r); setView("checkout"); return null;
    } catch (e) { return e.message; }
    finally { setBusy(false); }
  };
  const finishCheckout = () => { setCart([]); setSelMember(null); setResult(null); setView("kiosk"); };

  return (
    <div className="app">
      <style>{css}</style>
      {view==="kiosk" && <KioskView state={state} cart={cart} cartCount={cartCount} cartTotal={cartTotal} cats={cats} specials={specials} catFilter={catFilter} setCatFilter={setCatFilter} addToCart={addToCart} setView={setView} setCart={setCart} />}
      {view==="login" && <LoginView members={state.members} selMember={selMember} setSelMember={setSelMember} onBack={()=>setView("kiosk")} onLogin={doCheckout} />}
      {view==="checkout" && result && <CheckoutView member={result.member} cart={result.cart} cartTotal={result.total} bankAccount={state.bankAccount} threshold={state.lowBalanceThreshold} onDone={finishCheckout} />}
      {view==="adminLogin" && <AdminLoginView onLogin={adminLogin} onBack={isAdminUrl ? null : ()=>setView("kiosk")} />}
      {view==="admin" && state.transactions && <AdminView state={state} dispatch={dispatch} adminView={adminView} setAdminView={setAdminView} onLogout={adminLogout} />}
    </div>
  );
}

// ─── Kiosk ────────────────────────────────────────────────────────────────────
function KioskView({ state, cart, cartCount, cartTotal, cats, specials, catFilter, setCatFilter, addToCart, setView, setCart }) {
  const regularProds = state.products.filter(p => !p.special && (catFilter==="Vše" || p.category===catFilter));
  return (
    <div className="kiosk">
      <div className="logo-bar">
        <LKRALogo size={52} />
        <div>
          <h1>Aeroklub Raná</h1>
          <small>Samoobslužný bar · Vezmi si, zapiš si 🍺</small>
        </div>
      </div>

      {/* Specials always first */}
      {specials.length > 0 && (
        <div className="specials-banner">
          <div className="specials-banner-title">⭐ Speciál dne</div>
          <div className="specials-row">
            {specials.map(p => {
              const inCart = cart.find(i=>i.id===p.id);
              return (
                <div key={p.id} className={`prod-card special${inCart?" in-cart":""}`} onClick={()=>addToCart(p)} style={{opacity:p.stock===0?.45:1}}>
                  <div className="prod-emoji">{p.emoji}</div>
                  <div className="prod-name">{p.name}</div>
                  <div className="prod-price">{p.price} Kč</div>
                  <div className="prod-stock">{p.stock>0?`Zbývá: ${p.stock} ks`:"Vyprodáno"}</div>
                  {inCart && <div style={{marginTop:8,background:C.accent,color:"#fff",borderRadius:20,fontSize:".8rem",fontWeight:800,padding:"3px 10px",display:"inline-block"}}>{inCart.qty}× vybráno</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="cat-tabs">
        {cats.map(c=><button key={c} className={`cat-btn${catFilter===c?" active":""}`} onClick={()=>setCatFilter(c)}>{c}</button>)}
      </div>
      <div className="product-grid">
        {regularProds.map(p => {
          const inCart = cart.find(i=>i.id===p.id);
          return (
            <div key={p.id} className={`prod-card${inCart?" in-cart":""}`} onClick={()=>addToCart(p)} style={{opacity:p.stock===0?.45:1}}>
              <div className="prod-emoji">{p.emoji}</div>
              <div className="prod-name">{p.name}</div>
              <div className="prod-price">{p.price} Kč</div>
              <div className="prod-stock">{p.stock>0?`Skladem: ${p.stock}`:"Vyprodáno"}</div>
              {inCart && <div style={{marginTop:8,background:C.accent,color:"#fff",borderRadius:20,fontSize:".8rem",fontWeight:800,padding:"3px 10px",display:"inline-block"}}>{inCart.qty}× vybráno</div>}
            </div>
          );
        })}
      </div>
      {cartCount>0 && (
        <div className="cart-bar">
          <div className="cart-count">{cartCount}</div>
          <div style={{flex:1}}>
            <div style={{fontWeight:700,fontSize:"1rem"}}>Košík</div>
            <div style={{fontSize:".88rem",color:C.muted}}>{cart.map(i=>`${i.name} ×${i.qty}`).join(", ")}</div>
          </div>
          <div style={{fontWeight:800,color:C.accent,fontSize:"1.2rem"}}>{cartTotal} Kč</div>
          <button className="btn btn-primary" onClick={()=>setView("login")}>Zaplatit →</button>
          <button className="btn btn-ghost" style={{padding:"13px 16px"}} onClick={()=>setCart([])}>🗑</button>
        </div>
      )}
    </div>
  );
}

// ─── Login ────────────────────────────────────────────────────────────────────
function LoginView({ members, selMember, setSelMember, onBack, onLogin }) {
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const handleNum = (n) => {
    if(pin.length>=4) return;
    const np=pin+n; setPin(np);
    if(np.length===4) {
      if(!selMember){setErr("Nejdřív vyber jméno");setTimeout(()=>{setPin("");setErr("");},900);return;}
      onLogin(np).then(e=>{ if(e){setErr(e);setTimeout(()=>{setPin("");setErr("");},1200);} });
    }
  };
  return (
    <div className="login-screen">
      <button className="btn btn-ghost" style={{marginBottom:20}} onClick={onBack}>← Zpět na menu</button>
      <h2 style={{fontSize:"1.6rem",fontWeight:900,marginBottom:8}}>Kdo si bere? 👋</h2>
      <p style={{color:C.muted,fontSize:"1rem"}}>Vyber jméno a zadej PIN</p>
      <div className="member-list">
        {members.map(m=>(
          <div key={m.id} className={`member-btn${selMember?.id===m.id?" sel":""}`} onClick={()=>{setSelMember(m);setPin("");setErr("");}}>
            <div className="avatar">{m.avatar}</div>
            <div style={{fontSize:"1rem",fontWeight:700}}>{m.name.split(" ")[0]}</div>
            <div style={{fontSize:".82rem",color:C.muted}}>{m.name.split(" ")[1]}</div>
          </div>
        ))}
      </div>
      {selMember && (
        <div style={{textAlign:"center"}}>
          <div style={{fontWeight:700,fontSize:"1.1rem",marginBottom:14,color:C.accent}}>PIN pro {selMember.name.split(" ")[0]}</div>
          <div className="pin-input">{[0,1,2,3].map(i=><div key={i} className={`pin-dot${pin.length>i?" filled":""}`}/>)}</div>
          {err && <div className="error">{err}</div>}
          <div className="numpad" style={{marginTop:18}}>
            {[1,2,3,4,5,6,7,8,9,"",0,"⌫"].map((n,i)=>(
              <button key={i} className="num-btn" onClick={()=>n==="⌫"?setPin(p=>p.slice(0,-1)):n!==""?handleNum(String(n)):null} style={{opacity:n===""?0:1,pointerEvents:n===""?"none":"auto"}}>{n}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Checkout ────────────────────────────────────────────────────────────────
function CheckoutView({ member, cart, cartTotal, bankAccount, threshold, onDone }) {
  const nb = member.balance;
  const showQR = nb < threshold;
  const balClass = nb>threshold?"balance-pos":nb>=0?"balance-warn":"balance-neg";
  return (
    <div className="checkout">
      <div style={{textAlign:"center",marginBottom:24}}>
        <div style={{fontSize:"3.5rem"}}>✅</div>
        <h2 style={{fontWeight:900,fontSize:"1.6rem"}}>Hotovo, {vocative(member.name)}!</h2>
        <p style={{color:C.muted,fontSize:"1rem",marginTop:4}}>Tvůj nákup byl zaznamenán.</p>
      </div>
      <div style={{background:"#fff",borderRadius:16,padding:18,marginBottom:18,boxShadow:C.shadow,border:`2px solid ${C.border}`}}>
        <div style={{fontWeight:800,fontSize:"1rem",marginBottom:8,color:C.muted,textTransform:"uppercase",letterSpacing:.5}}>Shrnutí nákupu</div>
        {cart.map(i=>(
          <div key={i.id} className="cart-item">
            <span style={{fontWeight:600}}>{i.emoji} {i.name} <span style={{color:C.muted}}>×{i.qty}</span></span>
            <span style={{fontWeight:700,color:C.accent}}>{i.price*i.qty} Kč</span>
          </div>
        ))}
        <div style={{display:"flex",justifyContent:"space-between",padding:"14px 0 0",fontWeight:900,fontSize:"1.2rem"}}>
          <span>Celkem odečteno</span><span style={{color:C.accent}}>{cartTotal} Kč</span>
        </div>
      </div>
      <div className={`balance-card ${balClass}`}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:".88rem",fontWeight:600,marginBottom:4}}>Aktuální stav tvého účtu</div>
            <div style={{fontSize:"2.2rem",fontWeight:900}}>{nb} Kč</div>
          </div>
          <div style={{fontSize:"2.5rem"}}>{nb>threshold?"😊":nb>=0?"😐":"😅"}</div>
        </div>
      </div>
      {showQR && (
        <div className="qr-box">
          <div style={{color:C.amber,fontWeight:800,fontSize:"1.05rem",marginBottom:6}}>{nb<0?"💸 Jsi v minusu – dobij si kredit":"⚠️ Kredit se blíží k nule"}</div>
          <p style={{fontSize:".9rem",color:C.muted,marginBottom:16}}>Naskenuj QR pro bankovní převod. Žádný spěch – vyřešíme v pohodě 🙂</p>
          <QRCode value={paymentQR(bankAccount, Math.abs(Math.min(nb,0))+200, `LKRA bar ${member.name}`)} size={148} />
          <div style={{fontSize:".8rem",color:C.muted,marginTop:10,fontFamily:"monospace"}}>{bankAccount}</div>
        </div>
      )}
      <button className="btn btn-primary" style={{width:"100%",marginTop:10,padding:"18px",fontSize:"1.1rem"}} onClick={onDone}>Zavřít 👋</button>
    </div>
  );
}

// ─── Admin Login ──────────────────────────────────────────────────────────────
function AdminLoginView({ onLogin, onBack }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); if(!pw||busy) return;
    setBusy(true); const er = await onLogin(pw); setBusy(false);
    if(er){ setErr(er); setPw(""); }
  };
  return (
    <form onSubmit={submit} style={{maxWidth:340,margin:"60px auto",textAlign:"center",padding:24}}>
      {onBack && <button type="button" className="btn btn-ghost" style={{marginBottom:24}} onClick={onBack}>← Zpět</button>}
      <LKRALogo size={56} />
      <h2 style={{fontWeight:900,marginTop:12,marginBottom:4,fontSize:"1.4rem"}}>Správa baru</h2>
      <p style={{color:C.muted,marginBottom:22}}>Zadej heslo správce</p>
      <input type="password" autoFocus value={pw} onChange={e=>{setPw(e.target.value);setErr("");}} placeholder="Heslo" style={{marginBottom:12,textAlign:"center"}} />
      {err && <div className="error" style={{marginBottom:12}}>{err}</div>}
      <button type="submit" className="btn btn-primary" style={{width:"100%"}} disabled={busy}>{busy?"Ověřuji…":"Přihlásit"}</button>
    </form>
  );
}

// ─── Admin Shell ──────────────────────────────────────────────────────────────
function AdminView({ state, dispatch, adminView, setAdminView, onLogout }) {
  const nav = [
    {id:"dashboard",label:"📊 Dashboard"},
    {id:"members",label:"👥 Členové"},
    {id:"stock",label:"📦 Sklad"},
    {id:"receipt",label:"📷 Naskladnit z účtenky"},
    {id:"transactions",label:"📋 Transakce"},
    {id:"notifications",label:"🔔 Notifikace"},
    {id:"email",label:"📧 E-mailing"},
    {id:"settings",label:"⚙️ Nastavení"},
  ];
  return (
    <div className="admin">
      <div className="sidebar">
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}><LKRALogo size={36}/><h2 style={{marginBottom:0}}>Admin</h2></div>
        {nav.map(n=><button key={n.id} className={`nav-btn${adminView===n.id?" active":""}`} onClick={()=>setAdminView(n.id)}>{n.label}</button>)}
        <div style={{flex:1}}/>
        <button className="btn btn-ghost" style={{width:"100%",marginTop:8,fontSize:".9rem"}} onClick={onLogout}>Odhlásit</button>
      </div>
      <div className="main-panel">
        {adminView==="dashboard" && <AdminDashboard state={state}/>}
        {adminView==="members" && <AdminMembers state={state} dispatch={dispatch}/>}
        {adminView==="stock" && <AdminStock state={state} dispatch={dispatch}/>}
        {adminView==="receipt" && <AdminReceipt state={state} dispatch={dispatch}/>}
        {adminView==="transactions" && <AdminTransactions state={state}/>}
        {adminView==="notifications" && <AdminNotifications state={state} dispatch={dispatch}/>}
        {adminView==="email" && <AdminEmail state={state}/>}
        {adminView==="settings" && <AdminSettings state={state} dispatch={dispatch}/>}
      </div>
    </div>
  );
}

// ─── Receipt Scanner (AI powered) ────────────────────────────────────────────
function AdminReceipt({ state, dispatch }) {
  const [imgData, setImgData] = useState(null);
  const [imgFile, setImgFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [parsed, setParsed] = useState(null); // [{name, qty, unitPrice, matchedId, isNew, newProduct}]
  const [editItems, setEditItems] = useState(null);
  const [done, setDone] = useState(false);
  const [drag, setDrag] = useState(false);
  const [err, setErr] = useState("");
  const fileRef = useRef();

  const EMOJI_MAP = {
    "Pivo":"🍺","Nealko":"🥤","Káva/Čaj":"☕","Snacky":"🥜","Speciál":"🥘"
  };

  const handleFile = (file) => {
    if(!file) return;
    const reader = new FileReader();
    reader.onload = e => { setImgData(e.target.result); setImgFile(file); setParsed(null); setDone(false); setErr(""); };
    reader.readAsDataURL(file);
  };

  const analyzeReceipt = async () => {
    if(!imgData) return;
    setLoading(true); setErr("");
    try {
      const base64 = imgData.split(",")[1];
      const mtype = imgData.split(";")[0].split(":")[1];
      const existingList = state.products.map(p=>`ID:${p.id} | ${p.name} | ${p.category}`).join("\n");
      const prompt = `Jsi systém pro zpracování nákupních účtenek pro bar leteckého aeroklubu.

Stávající produkty v systému:
${existingList}

Na obrázku je nákupní účtenka / pokladní doklad. Analyzuj ji a vrať JSON seznam zakoupených položek.

Pro každou položku urči:
- name: název produktu (česky, stručně)
- qty: počet kusů (celé číslo)
- unitPrice: cena za kus v Kč (celé číslo, odhadni pokud není jasná)
- matchedId: ID stávajícího produktu pokud se shoduje, nebo null
- isNew: true pokud jde o nový produkt který ještě není v systému
- category: pokud isNew=true, odhadni kategorii z: Pivo, Nealko, Káva/Čaj, Snacky, Speciál
- emoji: pokud isNew=true, vhodné emoji

Vrať POUZE čistý JSON array, žádný text navíc:
[{"name":"...","qty":10,"unitPrice":30,"matchedId":1,"isNew":false},...]`;

      // Volá náš vlastní server (Netlify funkce), který drží tajný API klíč.
      const resp = await fetch("/api/scan-receipt", {
        method:"POST",
        headers:{"Content-Type":"application/json","x-admin-password":getAdminPw()},
        body:JSON.stringify({
          max_tokens:1000,
          messages:[{role:"user",content:[
            {type:"image",source:{type:"base64",media_type:mtype,data:base64}},
            {type:"text",text:prompt}
          ]}]
        })
      });
      const data = await resp.json();
      if(!resp.ok) throw new Error(data.error || "Chyba serveru");
      const text = data.content.map(c=>c.text||"").join("").replace(/```json|```/g,"").trim();
      const items = JSON.parse(text);
      // enrich with full product data
      const enriched = items.map(item => ({
        ...item,
        matchedProduct: item.matchedId ? state.products.find(p=>p.id===item.matchedId) : null,
        newProduct: item.isNew ? {name:item.name, category:item.category||"Snacky", price:item.unitPrice||0, emoji:item.emoji||EMOJI_MAP[item.category]||"📦", stock:0} : null
      }));
      setEditItems(enriched.map((it,i)=>({...it,_key:i})));
      setParsed(enriched);
    } catch(e) {
      setErr("Nepodařilo se přečíst účtenku. Zkus lepší/osvětlenější foto, nebo zadej ručně.");
      console.error(e);
    }
    setLoading(false);
  };

  const updateItem = (key, field, val) => {
    setEditItems(items => items.map(it => it._key===key ? {...it, [field]: field==="qty"||field==="unitPrice" ? parseInt(val)||0 : val} : it));
  };
  const removeItem = (key) => setEditItems(items => items.filter(it=>it._key!==key));

  const applyStock = () => {
    const toApply = editItems.map(item => ({
      id: item.matchedId,
      name: item.name,
      qty: item.qty,
      isNew: item.isNew,
      newProduct: item.newProduct ? {...item.newProduct, price: item.unitPrice||item.newProduct.price} : null
    }));
    dispatch({type:"APPLY_RECEIPT", items: toApply});
    setDone(true);
  };

  const reset = () => { setImgData(null); setImgFile(null); setParsed(null); setEditItems(null); setDone(false); setErr(""); };

  if(done) return (
    <div style={{textAlign:"center",padding:"60px 20px"}}>
      <div style={{fontSize:"4rem"}}>🎉</div>
      <h2 style={{fontWeight:900,fontSize:"1.6rem",margin:"12px 0 8px"}}>Sklad naskladněn!</h2>
      <p style={{color:C.muted,marginBottom:24}}>Zásoby byly úspěšně aktualizovány dle účtenky.</p>
      <button className="btn btn-primary" onClick={reset}>📷 Nová účtenka</button>
    </div>
  );

  return (
    <>
      <div className="section-title">📷 Naskladnění z účtenky</div>
      <p style={{color:C.muted,marginBottom:20,fontSize:".95rem"}}>Vyfoť nebo nahraj foto nákupní účtenky. AI automaticky rozpozná produkty, doplní stávající zásoby a navrhne přidání nových produktů.</p>

      {!imgData ? (
        <div className={`drop-zone${drag?" drag":""}`}
          onDragOver={e=>{e.preventDefault();setDrag(true);}}
          onDragLeave={()=>setDrag(false)}
          onDrop={e=>{e.preventDefault();setDrag(false);handleFile(e.dataTransfer.files[0]);}}
          onClick={()=>fileRef.current.click()}>
          <div style={{fontSize:"3.5rem",marginBottom:12}}>📸</div>
          <div style={{fontWeight:700,fontSize:"1.1rem",marginBottom:6}}>Nahraj foto účtenky</div>
          <div style={{color:C.muted,fontSize:".9rem"}}>Klikni nebo přetáhni soubor sem</div>
          <div style={{color:C.muted,fontSize:".82rem",marginTop:4}}>JPG, PNG, HEIC – foto z telefonu funguje skvěle</div>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={e=>handleFile(e.target.files[0])} />
        </div>
      ) : (
        <div>
          <div className="section-card">
            <div style={{display:"flex",gap:16,alignItems:"flex-start",flexWrap:"wrap"}}>
              <img src={imgData} className="receipt-preview" style={{maxWidth:220,maxHeight:320,flex:"0 0 auto"}} alt="účtenka" />
              <div style={{flex:1,minWidth:200}}>
                <div style={{fontWeight:700,marginBottom:8}}>{imgFile?.name}</div>
                <p style={{color:C.muted,fontSize:".9rem",marginBottom:16}}>Klikni na tlačítko níže a AI účtenku zpracuje a navrhne naskladnění.</p>
                {!editItems && !loading && <button className="btn btn-primary" onClick={analyzeReceipt}>🤖 Analyzovat účtenku</button>}
                {loading && <div style={{display:"flex",alignItems:"center",gap:12,padding:"12px 0"}}><div className="spinner"/><span style={{color:C.muted}}>AI čte účtenku…</span></div>}
                {err && <div style={{marginTop:8}}><div className="error">{err}</div><button className="btn btn-ghost" style={{marginTop:10,fontSize:".85rem"}} onClick={reset}>↺ Zkusit znovu</button></div>}
              </div>
            </div>
          </div>

          {editItems && (
            <div className="section-card">
              <div style={{fontWeight:800,fontSize:"1.1rem",marginBottom:6}}>📋 Rozpoznané položky</div>
              <p style={{color:C.muted,fontSize:".88rem",marginBottom:14}}>Zkontroluj a případně uprav. <span style={{color:C.green,fontWeight:700}}>Zelená = existující produkt</span>, <span style={{color:C.amber,fontWeight:700}}>zlatá = nový produkt</span>.</p>

              {editItems.map(item => (
                <div key={item._key} className={`receipt-item ${item.isNew?"new-item":"match-item"}`}>
                  <div style={{fontSize:"1.5rem"}}>{item.matchedProduct?.emoji || item.newProduct?.emoji || "📦"}</div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,fontSize:".95rem"}}>{item.isNew ? item.name : item.matchedProduct?.name || item.name}</div>
                    <div style={{fontSize:".78rem",marginTop:2}}>
                      {item.isNew
                        ? <span className="badge badge-warn">✨ Nový produkt – bude přidán</span>
                        : <span className="badge badge-ok">✓ Doplní stávající zásobu</span>}
                      {item.isNew && <span style={{marginLeft:8,color:C.muted}}>{item.newProduct?.category}</span>}
                    </div>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:4,alignItems:"flex-end"}}>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <label style={{marginBottom:0,fontSize:".78rem"}}>Počet</label>
                      <input type="number" value={item.qty} onChange={e=>updateItem(item._key,"qty",e.target.value)} style={{width:68,textAlign:"center",padding:"4px 8px",fontSize:".9rem"}} />
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <label style={{marginBottom:0,fontSize:".78rem"}}>Cena/ks</label>
                      <input type="number" value={item.unitPrice||0} onChange={e=>updateItem(item._key,"unitPrice",e.target.value)} style={{width:68,textAlign:"center",padding:"4px 8px",fontSize:".9rem"}} />
                    </div>
                    {item.isNew && (
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        <label style={{marginBottom:0,fontSize:".78rem"}}>Prodejní</label>
                        <input type="number" value={item.newProduct?.price||0}
                          onChange={e=>updateItem(item._key,"newProduct",{...item.newProduct,price:parseInt(e.target.value)||0})}
                          style={{width:68,textAlign:"center",padding:"4px 8px",fontSize:".9rem"}} />
                      </div>
                    )}
                  </div>
                  <button onClick={()=>removeItem(item._key)} style={{background:"none",border:"none",cursor:"pointer",color:C.muted,fontSize:"1.1rem",padding:"0 4px",flexShrink:0}}>✕</button>
                </div>
              ))}

              <div style={{display:"flex",gap:10,marginTop:16,flexWrap:"wrap"}}>
                <button className="btn btn-primary" onClick={applyStock}>✅ Naskladnit ({editItems.length} položek)</button>
                <button className="btn btn-ghost" onClick={reset}>↺ Nová účtenka</button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

// ─── Other admin panels ───────────────────────────────────────────────────────
function AdminDashboard({ state }) {
  const revenue=state.transactions.reduce((s,t)=>s+t.total,0);
  const negCount=state.members.filter(m=>m.balance<0).length;
  const totalBal=state.members.reduce((s,m)=>s+m.balance,0);
  const lowStock=state.products.filter(p=>p.stock<5).length;
  const top=Object.entries(state.transactions.flatMap(t=>t.items).reduce((a,i)=>{a[i.name]=(a[i.name]||0)+i.qty;return a;},{})).sort((a,b)=>b[1]-a[1]).slice(0,5);
  return (
    <>
      <div className="section-title">📊 Dashboard</div>
      <div className="stat-grid">
        <div className="stat-card"><div className="stat-val">{revenue} Kč</div><div className="stat-label">Celkové obraty</div></div>
        <div className="stat-card"><div className="stat-val" style={{color:totalBal>=0?C.green:C.red}}>{totalBal} Kč</div><div className="stat-label">Celkové saldo</div></div>
        <div className="stat-card"><div className="stat-val" style={{color:negCount>0?C.red:C.green}}>{negCount}</div><div className="stat-label">Členů v minusu</div></div>
        <div className="stat-card"><div className="stat-val" style={{color:lowStock>0?C.amber:C.green}}>{lowStock}</div><div className="stat-label">Nízký sklad</div></div>
        <div className="stat-card"><div className="stat-val">{state.transactions.length}</div><div className="stat-label">Transakcí</div></div>
        <div className="stat-card"><div className="stat-val">{state.members.length}</div><div className="stat-label">Členů</div></div>
      </div>
      <div className="section-title">🏆 Nejprodávanější</div>
      <div className="section-card">
        {top.map(([name,qty],i)=>(
          <div key={name} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
            <div style={{width:28,height:28,borderRadius:"50%",background:C.accent,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:".85rem"}}>{i+1}</div>
            <div style={{flex:1,fontWeight:600}}>{name}</div>
            <div style={{color:C.accent,fontWeight:800}}>{qty}×</div>
          </div>
        ))}
      </div>
    </>
  );
}

function AdminMembers({ state, dispatch }) {
  const [topupId,setTopupId]=useState(null);const[topupAmt,setTopupAmt]=useState("");
  const [showAdd,setShowAdd]=useState(false);const[newM,setNewM]=useState({name:"",pin:"",email:""});
  const doTopup=(id)=>{const a=parseInt(topupAmt);if(!isNaN(a)&&a!==0)dispatch({type:"TOPUP",id,amount:a});setTopupId(null);setTopupAmt("");};
  const doAdd=()=>{if(newM.name&&/^\d{4}$/.test(newM.pin)){dispatch({type:"ADD_MEMBER",...newM});setNewM({name:"",pin:"",email:""});setShowAdd(false);}};
  return (
    <>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
        <div className="section-title" style={{marginBottom:0}}>👥 Členové</div>
        <button className="btn btn-primary" style={{padding:"10px 18px",fontSize:".9rem"}} onClick={()=>setShowAdd(!showAdd)}>+ Přidat člena</button>
      </div>
      {showAdd&&(<div className="section-card" style={{marginBottom:16}}>
        <div className="form-row"><div><label>Jméno a příjmení</label><input value={newM.name} onChange={e=>setNewM({...newM,name:e.target.value})} placeholder="Jan Novák"/></div><div><label>PIN (4 číslice)</label><input value={newM.pin} onChange={e=>setNewM({...newM,pin:e.target.value})} maxLength={4} placeholder="1234"/></div></div>
        <div style={{marginBottom:12}}><label>Email</label><input value={newM.email} onChange={e=>setNewM({...newM,email:e.target.value})} placeholder="jan@example.com"/></div>
        <button className="btn btn-green" onClick={doAdd}>Uložit člena</button>
      </div>)}
      <table>
        <thead><tr><th>Člen</th><th>Email</th><th>Saldo</th><th>Akce</th></tr></thead>
        <tbody>{state.members.map(m=>(
          <tr key={m.id}>
            <td><div style={{display:"flex",alignItems:"center",gap:10}}><div className="avatar" style={{width:34,height:34,fontSize:".8rem"}}>{m.avatar}</div><div style={{fontWeight:700}}>{m.name}</div></div></td>
            <td style={{color:C.muted,fontSize:".88rem"}}>{m.email}</td>
            <td><span className={`badge ${m.balance>50?"badge-ok":m.balance>=0?"badge-warn":"badge-bad"}`}>{m.balance} Kč</span></td>
            <td>{topupId===m.id?(<div style={{display:"flex",gap:6,alignItems:"center"}}><input style={{width:85}} value={topupAmt} onChange={e=>setTopupAmt(e.target.value)} type="number" placeholder="Kč"/><button className="btn btn-green" style={{padding:"8px 12px",fontSize:".85rem"}} onClick={()=>doTopup(m.id)}>✓</button><button className="btn btn-ghost" style={{padding:"8px 12px",fontSize:".85rem"}} onClick={()=>setTopupId(null)}>✗</button></div>):(<div style={{display:"flex",gap:6,flexWrap:"wrap"}}><button className="btn btn-ghost" style={{padding:"8px 14px",fontSize:".85rem"}} onClick={()=>setTopupId(m.id)}>💰 Dobít</button><button className="btn btn-ghost" style={{padding:"8px 12px",fontSize:".85rem"}} onClick={()=>{const p=window.prompt(`Nový 4místný PIN pro ${m.name}:`);if(p&&/^\d{4}$/.test(p))dispatch({type:"SET_MEMBER_PIN",id:m.id,pin:p});else if(p)alert("PIN musí mít 4 číslice");}}>🔑 PIN</button><button className="btn btn-ghost" style={{padding:"8px 12px",fontSize:".85rem"}} onClick={()=>{if(window.confirm(`Opravdu smazat člena ${m.name}? (saldo ${m.balance} Kč)`))dispatch({type:"DELETE_MEMBER",id:m.id});}}>🗑</button></div>)}</td>
          </tr>))}</tbody>
      </table>
    </>
  );
}

function AdminStock({ state, dispatch }) {
  const [stockId,setStockId]=useState(null);const[stockQty,setStockQty]=useState("");
  const [showAdd,setShowAdd]=useState(false);const[newP,setNewP]=useState({name:"",category:"Pivo",price:"",emoji:"🍺",stock:"",special:false});
  const doStock=(id)=>{const q=parseInt(stockQty);if(!isNaN(q)&&q>0)dispatch({type:"ADD_STOCK",id,qty:q});setStockId(null);setStockQty("");};
  const doAdd=()=>{if(newP.name&&newP.price){dispatch({type:"ADD_PRODUCT",product:{...newP,price:parseInt(newP.price),stock:parseInt(newP.stock)||0}});setNewP({name:"",category:"Pivo",price:"",emoji:"🍺",stock:"",special:false});setShowAdd(false);}};
  return (
    <>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
        <div className="section-title" style={{marginBottom:0}}>📦 Správa skladu</div>
        <div style={{display:"flex",gap:8}}>
          <button className="btn btn-primary" style={{padding:"10px 18px",fontSize:".9rem"}} onClick={()=>setShowAdd(!showAdd)}>+ Nový produkt</button>
        </div>
      </div>
      {showAdd&&(<div className="section-card" style={{marginBottom:16}}>
        <div className="form-row"><div><label>Název</label><input value={newP.name} onChange={e=>setNewP({...newP,name:e.target.value})} placeholder="Název produktu"/></div><div><label>Emoji</label><input value={newP.emoji} onChange={e=>setNewP({...newP,emoji:e.target.value})}/></div></div>
        <div className="form-row"><div><label>Kategorie</label><select value={newP.category} onChange={e=>setNewP({...newP,category:e.target.value})}>{["Pivo","Nealko","Káva/Čaj","Snacky","Speciál"].map(c=><option key={c}>{c}</option>)}</select></div><div><label>Cena (Kč)</label><input type="number" value={newP.price} onChange={e=>setNewP({...newP,price:e.target.value})}/></div></div>
        <div className="form-row"><div><label>Počáteční sklad</label><input type="number" value={newP.stock} onChange={e=>setNewP({...newP,stock:e.target.value})}/></div><div style={{display:"flex",alignItems:"center",gap:8,paddingTop:24}}><input type="checkbox" id="sp" checked={newP.special} onChange={e=>setNewP({...newP,special:e.target.checked})} style={{width:"auto"}}/><label htmlFor="sp" style={{display:"inline"}}>⭐ Speciál dne</label></div></div>
        <button className="btn btn-green" onClick={doAdd}>Uložit produkt</button>
      </div>)}
      <table>
        <thead><tr><th>Produkt</th><th>Kategorie</th><th>Cena</th><th>Sklad</th><th>Akce</th></tr></thead>
        <tbody>{state.products.map(p=>(
          <tr key={p.id}>
            <td style={{fontWeight:600}}>{p.emoji} {p.name}{p.special&&<span style={{color:C.gold,marginLeft:6}}>⭐</span>}</td>
            <td style={{color:C.muted}}>{p.category}</td>
            <td style={{fontWeight:700}}>{p.price} Kč</td>
            <td><span className={`badge ${p.stock>10?"badge-ok":p.stock>0?"badge-warn":"badge-bad"}`}>{p.stock} ks</span></td>
            <td>{stockId===p.id?(<div style={{display:"flex",gap:6}}><input style={{width:75}} type="number" value={stockQty} onChange={e=>setStockQty(e.target.value)} placeholder="ks"/><button className="btn btn-green" style={{padding:"8px 12px",fontSize:".85rem"}} onClick={()=>doStock(p.id)}>✓</button><button className="btn btn-ghost" style={{padding:"8px 12px",fontSize:".85rem"}} onClick={()=>setStockId(null)}>✗</button></div>):(<button className="btn btn-ghost" style={{padding:"8px 14px",fontSize:".85rem"}} onClick={()=>setStockId(p.id)}>+ Naskladnit</button>)}{stockId!==p.id&&<button className="btn btn-ghost" style={{padding:"8px 12px",fontSize:".85rem",marginLeft:6}} onClick={()=>{if(window.confirm(`Opravdu smazat ${p.name}?`))dispatch({type:"DELETE_PRODUCT",id:p.id});}}>🗑</button>}</td>
          </tr>))}</tbody>
      </table>
    </>
  );
}

function AdminTransactions({ state }) {
  const getN=id=>state.members.find(m=>m.id===id)?.name||"Neznámý";
  return (
    <>
      <div className="section-title">📋 Historie transakcí</div>
      <table>
        <thead><tr><th>#</th><th>Datum</th><th>Člen</th><th>Položky</th><th>Celkem</th></tr></thead>
        <tbody>{state.transactions.map(t=>(
          <tr key={t.id}>
            <td style={{color:C.muted,fontSize:".85rem"}}>#{t.id}</td>
            <td style={{color:C.muted,fontSize:".88rem"}}>{t.date}</td>
            <td style={{fontWeight:600}}>{getN(t.memberId)}</td>
            <td style={{fontSize:".88rem",color:C.muted}}>{t.items.map(i=>`${i.name}×${i.qty}`).join(", ")}</td>
            <td style={{fontWeight:800,color:C.accent}}>{t.total} Kč</td>
          </tr>))}</tbody>
      </table>
    </>
  );
}

function AdminNotifications({ state, dispatch }) {
  return (
    <>
      <div className="section-title">🔔 Notifikace členům</div>
      <table>
        <thead><tr><th>Datum</th><th>Člen</th><th>Typ</th><th>Zpráva</th><th>Stav</th></tr></thead>
        <tbody>
          {state.notifications.map(n=>(
            <tr key={n.id}>
              <td style={{color:C.muted,fontSize:".88rem"}}>{n.date}</td>
              <td style={{fontWeight:600}}>{n.member}</td>
              <td><span className={`badge ${n.type==="critical"?"badge-bad":"badge-warn"}`}>{n.type==="critical"?"❗ Kritické":"⚠️ Varování"}</span></td>
              <td style={{fontSize:".9rem"}}>{n.msg}</td>
              <td>{n.sent?<span className="badge badge-ok">✓ Odesláno</span>:<button className="btn btn-primary" style={{padding:"6px 12px",fontSize:".82rem"}} onClick={()=>dispatch({type:"MARK_SENT",id:n.id})}>📧 Odeslat</button>}</td>
            </tr>))}
          {!state.notifications.length&&<tr><td colSpan={5} style={{textAlign:"center",color:C.muted,padding:"28px"}}>Žádné notifikace 🎉</td></tr>}
        </tbody>
      </table>
    </>
  );
}

function AdminEmail({ state }) {
  const [lastRun,setLastRun]=useState(null);const[preview,setPreview]=useState(false);
  const csv=generateCSV(state.members,state.products);
  const today=new Date().toLocaleDateString("cs-CZ").replace(/\./g,"-").replace(/\s/g,"");
  const negM=state.members.filter(m=>m.balance<0);const warnM=state.members.filter(m=>m.balance>=0&&m.balance<50);
  return (
    <>
      <div className="section-title">📧 E-mailing & záloha dat</div>
      <div className="section-card">
        <div style={{fontWeight:800,fontSize:"1.1rem",marginBottom:6}}>📁 Denní záloha CSV</div>
        <p style={{color:C.muted,fontSize:".95rem",marginBottom:16}}>Kompletní záloha kont členů a skladu. Doporučujeme stahovat každý den.</p>
        <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
          <button className="btn btn-primary" onClick={()=>{downloadCSV(csv,`LKRA-bar-zaloha-${today}.csv`);setLastRun(new Date().toLocaleString("cs-CZ"));}}>⬇️ Stáhnout CSV</button>
          <button className="btn btn-ghost" onClick={()=>setPreview(!preview)}>{preview?"Skrýt náhled":"👁 Náhled"}</button>
        </div>
        {lastRun&&<div style={{marginTop:12,fontSize:".88rem",color:C.green,fontWeight:600}}>✓ Staženo: {lastRun}</div>}
        {preview&&<pre style={{marginTop:14,background:C.bg,borderRadius:8,padding:14,fontSize:".78rem",color:C.muted,overflowX:"auto",border:`1px solid ${C.border}`,whiteSpace:"pre-wrap",lineHeight:1.6}}>{csv}</pre>}
      </div>
      <div className="section-card">
        <div style={{fontWeight:800,fontSize:"1.1rem",marginBottom:6}}>📬 Fronty notifikací</div>
        <div style={{marginBottom:12}}>
          <div style={{fontWeight:700,color:C.red,marginBottom:8}}>❗ Záporné saldo ({negM.length})</div>
          {negM.length===0?<div style={{color:C.muted,fontSize:".9rem"}}>Nikdo není v minusu 🎉</div>:negM.map(m=><div key={m.id} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${C.border}`,fontSize:".9rem"}}><span style={{fontWeight:600}}>{m.name}</span><span style={{color:C.red,fontWeight:700}}>{m.balance} Kč</span></div>)}
        </div>
        <div>
          <div style={{fontWeight:700,color:C.amber,marginBottom:8}}>⚠️ Nízký kredit ({warnM.length})</div>
          {warnM.length===0?<div style={{color:C.muted,fontSize:".9rem"}}>Nikdo nemá nízký kredit</div>:warnM.map(m=><div key={m.id} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${C.border}`,fontSize:".9rem"}}><span style={{fontWeight:600}}>{m.name}</span><span style={{color:C.amber,fontWeight:700}}>{m.balance} Kč</span></div>)}
        </div>
      </div>
    </>
  );
}

function AdminSettings({ state, dispatch }) {
  const [bank,setBank]=useState(state.bankAccount);const[thr,setThr]=useState(state.lowBalanceThreshold);const[saved,setSaved]=useState(false);
  const save=()=>{dispatch({type:"SET_BANK",value:bank});dispatch({type:"SET_THRESHOLD",value:parseInt(thr)});setSaved(true);setTimeout(()=>setSaved(false),2200);};
  return (
    <>
      <div className="section-title">⚙️ Nastavení</div>
      <div className="section-card" style={{maxWidth:520}}>
        <div style={{marginBottom:18}}><label>Číslo bankovního účtu (pro QR)</label><input value={bank} onChange={e=>setBank(e.target.value)} placeholder="CZ65 0800 0000 0012 3456 7890"/></div>
        <div style={{marginBottom:22}}><label>Práh upozornění (Kč)</label><input type="number" value={thr} onChange={e=>setThr(e.target.value)}/></div>
        <button className="btn btn-primary" onClick={save} style={{minWidth:180}}>{saved?"✓ Uloženo!":"Uložit nastavení"}</button>
      </div>
    </>
  );
}