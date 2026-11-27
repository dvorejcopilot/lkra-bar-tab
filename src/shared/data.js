// Sdílená logika: počáteční data a "reducer" – funkce, která podle akce
// (nákup, dobití, naskladnění…) spočítá nový stav. Používá ji server.
// Čas vždy v českém pásmu (server běží v UTC).
const nowCZ = () => new Date().toLocaleString("cs-CZ", { timeZone: "Europe/Prague" });

// ─── Initial Data ─────────────────────────────────────────────────────────────
const INIT_PRODUCTS = [
  { id:1, name:"Pilsner Urquell", category:"Pivo", price:35, emoji:"🍺", stock:48 },
  { id:2, name:"Kozel Tmavý", category:"Pivo", price:35, emoji:"🍺", stock:36 },
  { id:3, name:"Radler Citrón", category:"Nealko", price:30, emoji:"🍋", stock:24 },
  { id:4, name:"Coca-Cola", category:"Nealko", price:30, emoji:"🥤", stock:30 },
  { id:5, name:"Mattoni", category:"Nealko", price:20, emoji:"💧", stock:40 },
  { id:6, name:"Espresso", category:"Káva/Čaj", price:25, emoji:"☕", stock:99 },
  { id:7, name:"Čaj", category:"Káva/Čaj", price:20, emoji:"🍵", stock:99 },
  { id:8, name:"Solené mandle", category:"Snacky", price:25, emoji:"🥜", stock:20 },
  { id:9, name:"Tyčinky", category:"Snacky", price:15, emoji:"🥨", stock:25 },
  { id:10, name:"Guláš", category:"Speciál", price:80, emoji:"🥘", stock:8, special:true },
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
  { id:1, memberId:1, items:[{name:"Pilsner Urquell",qty:2,price:35}], total:70, date:"15.2.2025 18:32" },
  { id:2, memberId:2, items:[{name:"Coca-Cola",qty:1,price:30},{name:"Solené mandle",qty:1,price:25}], total:55, date:"15.2.2025 19:10" },
  { id:3, memberId:3, items:[{name:"Kozel Tmavý",qty:3,price:35}], total:105, date:"16.2.2025 14:20" },
];
const INIT_NOTIFICATIONS = [
  { id:1, memberId:2, member:"Petra Svobodová", type:"warning", msg:"Záporné saldo -80 Kč", date:"15.2.2025 20:00", sent:true },
  { id:2, memberId:5, member:"Pavel Kratochvíl", type:"critical", msg:"Záporné saldo -150 Kč", date:"16.2.2025 10:00", sent:true },
];

export function initialState() {
  return { products:INIT_PRODUCTS, members:INIT_MEMBERS, transactions:INIT_TRANSACTIONS, notifications:INIT_NOTIFICATIONS, bankAccount:"CZ65 0800 0000 0012 3456 7890", lowBalanceThreshold:50 };
}

export function reducer(state, action) {
  switch(action.type) {
    case "CHECKOUT": {
      const {memberId,cart} = action;
      const total = cart.reduce((s,i)=>s+i.price*i.qty,0);
      const newTx = {id:Date.now(),memberId,items:cart.map(i=>({name:i.name,qty:i.qty,price:i.price})),total,date:nowCZ()};
      const newProds = state.products.map(p=>{const ci=cart.find(c=>c.id===p.id);return ci?{...p,stock:Math.max(0,p.stock-ci.qty)}:p;});
      const newMembers = state.members.map(m=>m.id===memberId?{...m,balance:m.balance-total}:m);
      const mem = newMembers.find(m=>m.id===memberId);
      let notifs = [...state.notifications];
      if(mem&&mem.balance<0) notifs.push({id:Date.now()+1,memberId,member:mem.name,type:mem.balance<-100?"critical":"warning",msg:`Záporné saldo ${mem.balance} Kč`,date:nowCZ(),sent:false});
      return {...state,products:newProds,members:newMembers,transactions:[newTx,...state.transactions],notifications:notifs};
    }
    case "ADD_STOCK": return {...state,products:state.products.map(p=>p.id===action.id?{...p,stock:p.stock+action.qty}:p)};
    case "APPLY_RECEIPT": {
      // action.items = [{name, qty, isNew, newProduct?}]
      let prods = [...state.products];
      const newProds = [];
      action.items.forEach(item => {
        if(item.isNew && item.newProduct) {
          newProds.push({id:Date.now()+Math.random(),stock:item.qty,...item.newProduct});
        } else {
          const idx = prods.findIndex(p=>p.id===item.id);
          if(idx>=0) prods[idx] = {...prods[idx],stock:prods[idx].stock+item.qty};
        }
      });
      return {...state, products:[...prods,...newProds]};
    }
    case "ADD_MEMBER": {
      const nm={id:Date.now(),name:action.name,pin:action.pin,balance:0,email:action.email,avatar:action.name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase()};
      return {...state,members:[...state.members,nm]};
    }
    case "TOPUP": return {...state,members:state.members.map(m=>m.id===action.id?{...m,balance:m.balance+action.amount}:m)};
    case "MARK_SENT": return {...state,notifications:state.notifications.map(n=>n.id===action.id?{...n,sent:true}:n)};
    case "SET_BANK": return {...state,bankAccount:action.value};
    case "SET_THRESHOLD": return {...state,lowBalanceThreshold:action.value};
    case "ADD_PRODUCT": return {...state,products:[...state.products,{id:Date.now(),...action.product}]};
    case "DELETE_MEMBER": return {...state,members:state.members.filter(m=>m.id!==action.id)};
    case "DELETE_PRODUCT": return {...state,products:state.products.filter(p=>p.id!==action.id)};
    case "SET_MEMBER_PIN": return {...state,members:state.members.map(m=>m.id===action.id?{...m,pin:action.pin}:m)};
    default: return state;
  }
}

