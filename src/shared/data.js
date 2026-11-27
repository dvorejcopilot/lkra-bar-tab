// Sdílená logika: počáteční data a "reducer" – funkce, která podle akce
// (nákup, dobití, naskladnění…) spočítá nový stav. Používá ji server.
// Čas vždy v českém pásmu (server běží v UTC).
const nowCZ = () => new Date().toLocaleString("cs-CZ", { timeZone: "Europe/Prague" });

export const CATEGORIES = ["Pivo", "Nealko", "Káva/Čaj", "Snacky", "Speciál"];
export const DEFAULT_MIN_STOCK = 5;
const MAX_MOVES = 3000;

// ─── Initial Data ─────────────────────────────────────────────────────────────
const INIT_PRODUCTS = [
  { id:1, name:"Pilsner Urquell", category:"Pivo", price:35, cost:22, emoji:"🍺", stock:48, minStock:12 },
  { id:2, name:"Kozel Tmavý", category:"Pivo", price:35, cost:20, emoji:"🍺", stock:36, minStock:12 },
  { id:3, name:"Radler Citrón", category:"Nealko", price:30, cost:18, emoji:"🍋", stock:24, minStock:6 },
  { id:4, name:"Coca-Cola", category:"Nealko", price:30, cost:19, emoji:"🥤", stock:30, minStock:8 },
  { id:5, name:"Mattoni", category:"Nealko", price:20, cost:11, emoji:"💧", stock:40, minStock:8 },
  { id:6, name:"Espresso", category:"Káva/Čaj", price:25, cost:6, emoji:"☕", stock:99, minStock:20 },
  { id:7, name:"Čaj", category:"Káva/Čaj", price:20, cost:4, emoji:"🍵", stock:99, minStock:10 },
  { id:8, name:"Solené mandle", category:"Snacky", price:25, cost:14, emoji:"🥜", stock:20, minStock:5 },
  { id:9, name:"Tyčinky", category:"Snacky", price:15, cost:8, emoji:"🥨", stock:4, minStock:5 },
  { id:10, name:"Guláš", category:"Speciál", price:80, emoji:"🥘", stock:8, special:true, minStock:0 },
];
const INIT_MEMBERS = [
  { id:1, name:"Tomáš Novák", pin:"1234", balance:250, email:"tomas@example.com", avatar:"TN" },
  { id:2, name:"Petra Svobodová", pin:"2222", balance:-80, email:"petra@example.com", avatar:"PS" },
  { id:3, name:"Martin Dvořák", pin:"3333", balance:520, email:"martin@example.com", avatar:"MD" },
  { id:4, name:"Jana Horáčková", pin:"4444", balance:30, email:"jana@example.com", avatar:"JH" },
  { id:5, name:"Pavel Kratochvíl", pin:"5555", balance:-150, email:"pavel@example.com", avatar:"PK" },
  { id:6, name:"Lucie Marková", pin:"6666", balance:0, email:"lucie@example.com", avatar:"LM" },
];
const INIT_TRANSACTIONS = [
  { id:1, memberId:1, items:[{id:1,name:"Pilsner Urquell",qty:2,price:35}], total:70, date:"15.2.2025 18:32" },
  { id:2, memberId:2, items:[{id:4,name:"Coca-Cola",qty:1,price:30},{id:8,name:"Solené mandle",qty:1,price:25}], total:55, date:"15.2.2025 19:10" },
  { id:3, memberId:3, items:[{id:2,name:"Kozel Tmavý",qty:3,price:35}], total:105, date:"16.2.2025 14:20" },
];
const INIT_NOTIFICATIONS = [
  { id:1, memberId:2, member:"Petra Svobodová", type:"warning", msg:"Záporné saldo -80 Kč", date:"15.2.2025 20:00", sent:true },
  { id:2, memberId:5, member:"Pavel Kratochvíl", type:"critical", msg:"Záporné saldo -150 Kč", date:"16.2.2025 10:00", sent:true },
];

export function initialState() {
  return {
    products: INIT_PRODUCTS, members: INIT_MEMBERS, transactions: INIT_TRANSACTIONS,
    notifications: INIT_NOTIFICATIONS, stockMoves: [],
    bankAccount: "CZ65 0800 0000 0012 3456 7890", lowBalanceThreshold: 50,
  };
}

// ─── Pomocné funkce pro bezpečné hodnoty ──────────────────────────────────────
const int = (v, min = -1e6, max = 1e6) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : 0;
};
const optInt = (v, min, max) => (v === "" || v === null || v === undefined || !Number.isFinite(Number(v)) ? undefined : int(v, min, max));
const str = (v, max = 80) => String(v ?? "").trim().slice(0, max);
const nextId = (list) => list.reduce((m, x) => (typeof x.id === "number" && x.id > m ? x.id : m), 0) + 1;

// Vyčistí data produktu z formuláře (jen povolená pole, rozumné hodnoty).
function cleanProduct(p, base = {}) {
  const out = { ...base };
  if (p.name !== undefined) out.name = str(p.name) || base.name || "Bez názvu";
  if (p.category !== undefined) out.category = str(p.category, 30) || "Ostatní";
  if (p.emoji !== undefined) out.emoji = str(p.emoji, 8) || "📦";
  if (p.price !== undefined) out.price = int(p.price, 0, 100000);
  if (p.cost !== undefined) out.cost = optInt(p.cost, 0, 100000);
  if (p.minStock !== undefined) out.minStock = optInt(p.minStock, 0, 10000);
  if (p.special !== undefined) out.special = !!p.special;
  if (p.hidden !== undefined) out.hidden = !!p.hidden;
  return out;
}

// Záznam do historie pohybů skladu.
function move(product, qty, type, extra = {}) {
  return {
    id: Date.now() + Math.random(), ts: Date.now(), date: nowCZ(),
    productId: product.id, name: product.name, emoji: product.emoji,
    qty, type, stockAfter: product.stock, ...extra,
  };
}
const withMoves = (state, moves) => [...moves, ...(state.stockMoves || [])].slice(0, MAX_MOVES);

// Naskladnění: doplní existující produkty a případně založí nové.
// items = [{id, qty, cost?}], newProducts = [{name, category, price, emoji, cost, minStock, qty}]
function restock(state, { items = [], newProducts = [], note = "", source = "manual" }) {
  const n = str(note, 120);
  const moves = [];
  let products = state.products.map((p) => {
    const it = items.find((i) => i.id === p.id);
    const qty = it ? int(it.qty, 0, 10000) : 0;
    if (!qty) return p;
    const cost = optInt(it.cost, 0, 100000);
    const next = { ...p, stock: p.stock + qty, ...(cost !== undefined ? { cost } : {}) };
    moves.push(move(next, qty, "in", { cost: cost ?? p.cost, note: n, source }));
    return next;
  });
  let id = nextId(products);
  for (const np of newProducts) {
    const qty = int(np.qty, 0, 10000);
    const p = { ...cleanProduct({ category: "Snacky", emoji: "📦", price: 0, ...np }), id: id++, stock: qty };
    if (p.minStock === undefined) p.minStock = DEFAULT_MIN_STOCK;
    products = [...products, p];
    moves.push(move(p, qty, "new", { cost: p.cost, note: n, source }));
  }
  if (!moves.length) return state;
  return { ...state, products, stockMoves: withMoves(state, moves) };
}

export function reducer(state, action) {
  switch(action.type) {
    case "CHECKOUT": {
      const {memberId,cart} = action;
      const total = cart.reduce((s,i)=>s+i.price*i.qty,0);
      const newTx = {id:Date.now(),ts:Date.now(),memberId,items:cart.map(i=>({id:i.id,name:i.name,qty:i.qty,price:i.price})),total,date:nowCZ()};
      const newProds = state.products.map(p=>{const ci=cart.find(c=>c.id===p.id);return ci?{...p,stock:Math.max(0,p.stock-ci.qty)}:p;});
      const newMembers = state.members.map(m=>m.id===memberId?{...m,balance:m.balance-total}:m);
      const mem = newMembers.find(m=>m.id===memberId);
      let notifs = [...state.notifications];
      if(mem&&mem.balance<0) notifs.push({id:Date.now()+1,memberId,member:mem.name,type:mem.balance<-100?"critical":"warning",msg:`Záporné saldo ${mem.balance} Kč`,date:nowCZ(),sent:false});
      return {...state,products:newProds,members:newMembers,transactions:[newTx,...state.transactions],notifications:notifs};
    }

    // ── Sklad ──
    case "RESTOCK": return restock(state, action);
    // Starší akce (kvůli kompatibilitě) převedené na RESTOCK
    case "ADD_STOCK": return restock(state, { items: [{ id: action.id, qty: action.qty }] });
    case "APPLY_RECEIPT": return restock(state, {
      source: "receipt",
      items: action.items.filter((i) => !i.isNew).map((i) => ({ id: i.id, qty: i.qty })),
      newProducts: action.items.filter((i) => i.isNew && i.newProduct).map((i) => ({ ...i.newProduct, qty: i.qty })),
    });
    case "STOCK_COUNT": {
      // Inventura: counts = [{id, stock}] – skutečně napočítané kusy
      const n = str(action.note, 120);
      const moves = [];
      const products = state.products.map((p) => {
        const c = (action.counts || []).find((x) => x.id === p.id);
        if (!c) return p;
        const stock = int(c.stock, 0, 100000);
        if (stock === p.stock) return p;
        const next = { ...p, stock };
        moves.push(move(next, stock - p.stock, "count", { note: n }));
        return next;
      });
      const counted = { ...state, lastCount: { ts: Date.now(), date: nowCZ(), items: (action.counts || []).length } };
      return moves.length ? { ...counted, products, stockMoves: withMoves(state, moves) } : counted;
    }
    case "WRITE_OFF": {
      // Odpis: rozbité, prošlé, spotřebované na akci…
      const p = state.products.find((x) => x.id === action.id);
      const qty = int(action.qty, 1, 10000);
      if (!p) return state;
      const next = { ...p, stock: Math.max(0, p.stock - qty) };
      return {
        ...state,
        products: state.products.map((x) => (x.id === p.id ? next : x)),
        stockMoves: withMoves(state, [move(next, -(p.stock - next.stock), "loss", { note: str(action.note, 120) || "Odpis" })]),
      };
    }
    case "ADD_PRODUCT": {
      const p = { ...cleanProduct({ category: "Snacky", emoji: "📦", price: 0, ...action.product }), id: nextId(state.products), stock: int(action.product.stock, 0, 100000) };
      if (p.minStock === undefined) p.minStock = DEFAULT_MIN_STOCK;
      const moves = p.stock ? [move(p, p.stock, "new", { cost: p.cost })] : [];
      return { ...state, products: [...state.products, p], stockMoves: withMoves(state, moves) };
    }
    case "UPDATE_PRODUCT": return { ...state, products: state.products.map((p) => (p.id === action.id ? cleanProduct(action.patch || {}, p) : p)) };
    case "DELETE_PRODUCT": return {...state,products:state.products.filter(p=>p.id!==action.id)};

    // ── Členové ──
    case "ADD_MEMBER": {
      const name = str(action.name);
      const nm={id:nextId(state.members),name,pin:action.pin,balance:0,email:str(action.email,120),avatar:name.split(/\s+/).map(w=>w[0]).join("").slice(0,2).toUpperCase()};
      return {...state,members:[...state.members,nm]};
    }
    case "TOPUP": return {...state,members:state.members.map(m=>m.id===action.id?{...m,balance:m.balance+int(action.amount,-100000,100000)}:m)};
    case "DELETE_MEMBER": return {...state,members:state.members.filter(m=>m.id!==action.id)};
    case "SET_MEMBER_PIN": return {...state,members:state.members.map(m=>m.id===action.id?{...m,pin:action.pin}:m)};

    // ── Ostatní ──
    case "MARK_SENT": return {...state,notifications:state.notifications.map(n=>n.id===action.id?{...n,sent:true}:n)};
    case "SET_BANK": return {...state,bankAccount:str(action.value,50)};
    case "SET_THRESHOLD": return {...state,lowBalanceThreshold:int(action.value,-10000,10000)};
    default: return state;
  }
}
