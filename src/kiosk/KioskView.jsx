import { useState, useEffect, useRef } from "react";
import "./kiosk.css";
import { catIcon, catLabel, productLook, plural, LOW_STOCK } from "./theme.js";

const Icon = ({ name, style }) => <span className="ms" aria-hidden="true" style={style}>{name}</span>;

// Pozdrav podle denní doby + krátké datum („Dobrý večer · so 28. 11.“)
const DAYS = ["ne", "po", "út", "st", "čt", "pá", "so"];
function greeting(d) {
  const h = d.getHours();
  const [text, icon] =
    h >= 4 && h < 9 ? ["Dobré ráno", "wb_twilight"] :
    h < 12 && h >= 9 ? ["Dobré dopoledne", "light_mode"] :
    h >= 12 && h < 18 ? ["Dobré odpoledne", "light_mode"] :
    h >= 18 && h < 22 ? ["Dobrý večer", "wb_twilight"] : ["Dobrou noc", "dark_mode"];
  return { text: `${text} · ${DAYS[d.getDay()]} ${d.getDate()}. ${d.getMonth() + 1}.`, icon };
}
function useNow(ms = 60000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), ms); return () => clearInterval(t); }, [ms]);
  return now;
}

// Badge s počtem v košíku – krátce „poskočí“, když se počet změní
function QtyBadge({ qty }) {
  const prev = useRef(qty);
  const [pop, setPop] = useState(false);
  useEffect(() => {
    if (qty !== prev.current) { setPop(true); const t = setTimeout(() => setPop(false), 260); prev.current = qty; return () => clearTimeout(t); }
  }, [qty]);
  return <div className={`k-badge${pop ? " pop" : ""}`}>{qty}×</div>;
}

function stockLabel(p) {
  if (p.stock <= 0) return { text: "Vyprodáno", low: true };
  if (p.stock <= LOW_STOCK) return { text: `Poslední ${p.stock}`, low: true };
  return { text: `${p.stock} ks`, low: false };
}

function ProductCard({ p, qty, onAdd }) {
  const look = productLook(p);
  const out = p.stock <= 0;
  const s = stockLabel(p);
  return (
    <button type="button" className={`k-card${qty ? " sel" : ""}${out ? " out" : ""}`} disabled={out} onClick={() => onAdd(p)}
      aria-label={`${p.name}, ${p.price} Kč${qty ? `, v košíku ${qty}` : ""}`}>
      <div className="k-card-top">
        <div className="k-ico" style={{ background: look.bg, color: look.fg }}><Icon name={look.icon} /></div>
        {qty > 0 && <QtyBadge qty={qty} />}
      </div>
      <div className="k-name">{p.name}</div>
      <div className="k-foot">
        <div className="k-price">{p.price} Kč</div>
        <div className={`k-stock${s.low ? " low" : ""}`}>{s.text}</div>
      </div>
    </button>
  );
}

function SpecialCard({ p, qty, onAdd }) {
  const out = p.stock <= 0;
  return (
    <button type="button" className={`k-card k-special${qty ? " sel" : ""}${out ? " out" : ""}`} disabled={out} onClick={() => onAdd(p)}>
      <div className="k-card-top" style={{ alignItems: "center" }}>
        <div className="k-sp-label"><Icon name="star" />Speciál dne</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className="k-sp-left">{out ? "Vyprodáno" : `Zbývá ${p.stock} ${plural(p.stock, "porce", "porce", "porcí")}`}</div>
          {qty > 0 && <QtyBadge qty={qty} />}
        </div>
      </div>
      <div className="k-sp-name">{p.name}</div>
      <div className="k-sp-foot">
        <div className="k-sp-price">{p.price} Kč</div>
        {!out && <div className="k-sp-add"><Icon name="add" />Přidat</div>}
      </div>
    </button>
  );
}

// Zadání vlastní částky (položka, která není v nabídce)
function CustomAmount({ onClose, onAdd }) {
  const [val, setVal] = useState("");
  const MAX = 5000;
  const n = parseInt(val || "0", 10);
  const press = (k) => {
    if (k === "back") return setVal((v) => v.slice(0, -1));
    if (k === "clear") return setVal("");
    setVal((v) => (v.length >= 4 || (v === "" && k === "0") ? v : v + k));
  };
  return (
    <div className="k-modal-bg" onClick={onClose}>
      <div className="k-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Jiná položka">
        <h3>Jiná položka</h3>
        <p>Zadej částku, kterou si zapíšeš na účet.</p>
        <div className={`k-amount${val ? "" : " empty"}`}>{val || "0"} Kč</div>
        {n > MAX && <div className="k-err">Nejvýš {MAX} Kč</div>}
        <div className="k-pad">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "clear", "0", "back"].map((k) => (
            <button key={k} type="button" className="k-key" onClick={() => press(k)} aria-label={k === "back" ? "Smazat" : k === "clear" ? "Vymazat" : k}>
              {k === "back" ? <Icon name="backspace" style={{ fontSize: 30 }} /> : k === "clear" ? <span style={{ fontSize: 20 }}>C</span> : k}
            </button>
          ))}
        </div>
        <div className="k-modal-btns">
          <button type="button" className="cancel" onClick={onClose}>Zpět</button>
          <button type="button" className="ok" disabled={!(n > 0 && n <= MAX)} onClick={() => onAdd(n)}>Přidat {n > 0 ? `${n} Kč` : ""}</button>
        </div>
      </div>
    </div>
  );
}

function Cart({ cart, cartCount, cartTotal, setQty, onCheckout, onClear }) {
  return (
    <aside className="k-cart">
      <div className="k-cart-head">
        <h2>Košík</h2>
        {cartCount > 0 && <div className="k-pill">{cartCount} {plural(cartCount, "položka", "položky", "položek")}</div>}
      </div>
      {cart.length === 0 ? (
        <div className="k-empty">
          <Icon name="shopping_basket" />
          <div>Košík je prázdný.<br />Klepni na položku v nabídce.</div>
        </div>
      ) : (
        <div className="k-lines">
          {cart.map((i) => {
            const max = i.custom ? 20 : i.stock;
            return (
              <div key={i.id} className="k-line">
                <div className="k-line-txt">
                  <div className="k-line-name">{i.name}</div>
                  <div className="k-line-sub">{i.qty} × {i.price} Kč</div>
                </div>
                <button type="button" className="k-step minus" onClick={() => setQty(i.id, i.qty - 1)} aria-label={i.qty === 1 ? "Odebrat" : "Ubrat"}>
                  <Icon name={i.qty === 1 ? "delete" : "remove"} />
                </button>
                <div className="k-qty">{i.qty}</div>
                <button type="button" className="k-step plus" disabled={i.qty >= max} onClick={() => setQty(i.id, i.qty + 1)} aria-label="Přidat">
                  <Icon name="add" />
                </button>
              </div>
            );
          })}
        </div>
      )}
      <div className="k-hint">
        <Icon name="touch_app" />
        <div>Klepni na položku pro přidání. Zaplatíš PINem na další obrazovce.</div>
      </div>
      <div className="k-total"><span>Celkem</span><b>{cartTotal} Kč</b></div>
      <button type="button" className="k-cta" disabled={!cart.length} onClick={onCheckout}>
        Zapsat na účet <Icon name="arrow_forward" />
      </button>
      <button type="button" className="k-clear" disabled={!cart.length} onClick={onClear}>
        <Icon name="close" style={{ fontSize: 22 }} />Vyprázdnit košík
      </button>
    </aside>
  );
}

export default function KioskView({ state, cart, setCart, cartCount, cartTotal, cats, specials, catFilter, setCatFilter, addToCart, onCheckout }) {
  const now = useNow();
  const g = greeting(now);
  const [customOpen, setCustomOpen] = useState(false);
  const qtyOf = (id) => cart.find((i) => i.id === id)?.qty || 0;

  const showSpecial = catFilter === "Vše" && specials.length > 0;
  const [mainSpecial, ...otherSpecials] = specials;
  const regular = state.products.filter((p) => !p.special && (catFilter === "Vše" || p.category === catFilter));
  const products = showSpecial ? [...otherSpecials, ...regular] : regular;

  const setQty = (id, qty) => setCart((c) => (qty <= 0 ? c.filter((i) => i.id !== id) : c.map((i) => (i.id === id ? { ...i, qty } : i))));
  const addCustom = (amount) => {
    addToCart({ id: `custom-${Date.now()}`, name: "Jiná položka", price: amount, emoji: "✏️", custom: true, stock: 20 });
    setCustomOpen(false);
  };

  return (
    <div className="k-screen">
      <main className="k-main">
        <header className="k-header">
          <div className="k-brand">
            <img src="/logo-navy.svg" alt="" />
            <div style={{ minWidth: 0 }}>
              <div className="k-word"><b>BAR</b><span>Raná</span></div>
              <div className="k-sub">Bar Aeroklubu Raná · Vezmi si, zapiš si</div>
            </div>
          </div>
          <div className="k-greet"><Icon name={g.icon} />{g.text}</div>
        </header>

        <nav className="k-tabs">
          {cats.map((c) => (
            <button key={c} type="button" className={`k-tab${catFilter === c ? " on" : ""}`} onClick={() => setCatFilter(c)}>
              <Icon name={catIcon(c)} /><span>{catLabel(c)}</span>
            </button>
          ))}
        </nav>

        <section className="k-grid">
          {showSpecial && <SpecialCard p={mainSpecial} qty={qtyOf(mainSpecial.id)} onAdd={addToCart} />}
          {products.map((p) => <ProductCard key={p.id} p={p} qty={qtyOf(p.id)} onAdd={addToCart} />)}
          <button type="button" className="k-card k-other" onClick={() => setCustomOpen(true)}>
            <div className="k-ico"><Icon name="edit" /></div>
            <div>
              <div className="k-other-t">Jiná položka</div>
              <div className="k-other-s">Zadat vlastní částku</div>
            </div>
          </button>
        </section>
      </main>

      <Cart cart={cart} cartCount={cartCount} cartTotal={cartTotal} setQty={setQty} onCheckout={onCheckout} onClear={() => setCart([])} />
      {customOpen && <CustomAmount onClose={() => setCustomOpen(false)} onAdd={addCustom} />}
    </div>
  );
}
