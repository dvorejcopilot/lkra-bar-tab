// Vzhled celé appky. Barvy jsou jako CSS proměnné (--navy, --gold…),
// takže jdou změnit na jednom místě.
export const C = {
  navy: "#1a3a6b", gold: "#c8a84b", green: "#1f8a5b", red: "#c63d2f", amber: "#c97c06",
  text: "#14213d", muted: "#64748b", border: "#e3e8f0",
};

export const css = `
:root {
  --navy:#1a3a6b; --navy-2:#142d55; --navy-soft:rgba(26,58,107,.08);
  --gold:#c8a84b; --gold-2:#b4922f; --gold-soft:#fbf5e4;
  --green:#1f8a5b; --green-soft:#e6f5ee;
  --red:#c63d2f; --red-soft:#fcebe9;
  --amber:#c97c06; --amber-soft:#fdf2df;
  --bg:#f3f5f9; --card:#fff; --text:#14213d; --muted:#64748b; --border:#e3e8f0; --line:#eef1f6;
  --shadow:0 1px 2px rgba(20,33,61,.05),0 4px 16px rgba(20,33,61,.06);
  --shadow-lg:0 10px 40px rgba(20,33,61,.18);
  --radius:14px;
}
* { box-sizing:border-box; margin:0; padding:0; }
html { -webkit-text-size-adjust:100%; }
body { background:var(--bg); color:var(--text); font-family:'Inter',system-ui,-apple-system,'Segoe UI',Roboto,sans-serif; font-size:15px; line-height:1.45; -webkit-font-smoothing:antialiased; }
button { font-family:inherit; }
.app { min-height:100vh; }
.muted { color:var(--muted); }
.num { font-variant-numeric:tabular-nums; }
.row { display:flex; align-items:center; gap:10px; }
.wrap { flex-wrap:wrap; }
.grow { flex:1; min-width:0; }
.spacer { flex:1; }

/* ── Tlačítka ── */
.btn { display:inline-flex; align-items:center; justify-content:center; gap:8px; padding:11px 20px; border-radius:10px; border:1.5px solid transparent; cursor:pointer; font-weight:650; font-size:.95rem; transition:background .15s,border-color .15s,color .15s,transform .05s; white-space:nowrap; text-decoration:none; }
.btn:active { transform:translateY(1px); }
.btn:disabled { opacity:.5; cursor:not-allowed; }
.btn-sm { padding:7px 12px; font-size:.85rem; border-radius:8px; }
.btn-lg { padding:16px 26px; font-size:1.08rem; border-radius:12px; }
.btn-block { width:100%; }
.btn-primary { background:var(--navy); color:#fff; } .btn-primary:hover:not(:disabled) { background:var(--navy-2); }
.btn-gold { background:var(--gold); color:#fff; } .btn-gold:hover:not(:disabled) { background:var(--gold-2); }
.btn-green { background:var(--green); color:#fff; } .btn-green:hover:not(:disabled) { filter:brightness(.94); }
.btn-red { background:var(--red); color:#fff; }
.btn-ghost { background:#fff; border-color:var(--border); color:var(--text); }
.btn-ghost:hover:not(:disabled) { border-color:var(--navy); color:var(--navy); }
.btn-text { background:none; border:none; color:var(--muted); padding:6px 8px; }
.btn-text:hover { color:var(--navy); }
.btn-danger-text { background:none; border:none; color:var(--red); padding:6px 8px; }
.icon-btn { width:34px; height:34px; padding:0; border-radius:8px; border:1.5px solid var(--border); background:#fff; color:var(--text); cursor:pointer; display:inline-flex; align-items:center; justify-content:center; font-size:1rem; font-weight:700; }
.icon-btn:hover { border-color:var(--navy); color:var(--navy); }

/* ── Formuláře ── */
input,select,textarea { background:#fff; border:1.5px solid var(--border); border-radius:9px; padding:10px 12px; color:var(--text); font-size:.95rem; width:100%; font-family:inherit; transition:border-color .15s,box-shadow .15s; }
input:focus,select:focus,textarea:focus { outline:none; border-color:var(--navy); box-shadow:0 0 0 3px var(--navy-soft); }
input[type=checkbox] { width:18px; height:18px; accent-color:var(--navy); }
label, .label { font-size:.8rem; color:var(--muted); display:block; margin-bottom:5px; font-weight:600; }
.form-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(170px,1fr)); gap:12px; margin-bottom:14px; }
.check { display:flex; align-items:center; gap:8px; font-size:.92rem; color:var(--text); font-weight:500; margin:0; cursor:pointer; }
.search { position:relative; }
.search input { padding-left:36px; }
.search::before { content:"🔍"; position:absolute; left:12px; top:50%; transform:translateY(-50%); font-size:.85rem; opacity:.6; }
.error { color:var(--red); font-size:.9rem; margin-top:8px; font-weight:600; }

/* ── Karty, odznaky ── */
.card { background:var(--card); border-radius:var(--radius); padding:20px; border:1px solid var(--border); box-shadow:var(--shadow); margin-bottom:18px; }
.card-title { font-weight:750; font-size:1.02rem; margin-bottom:4px; }
.card-sub { color:var(--muted); font-size:.88rem; margin-bottom:14px; }
.badge { display:inline-flex; align-items:center; gap:4px; padding:3px 9px; border-radius:20px; font-size:.76rem; font-weight:700; white-space:nowrap; }
.badge-ok { background:var(--green-soft); color:var(--green); }
.badge-warn { background:var(--amber-soft); color:var(--amber); }
.badge-bad { background:var(--red-soft); color:var(--red); }
.badge-blue { background:var(--navy-soft); color:var(--navy); }
.badge-gold { background:var(--gold-soft); color:var(--gold-2); }
.badge-grey { background:#eef1f5; color:var(--muted); }
.chips { display:flex; gap:6px; flex-wrap:wrap; }
.chip { padding:7px 14px; border-radius:20px; border:1.5px solid var(--border); background:#fff; color:var(--muted); cursor:pointer; font-size:.86rem; font-weight:600; }
.chip.active { border-color:var(--navy); color:var(--navy); background:var(--navy-soft); }
.chip .count { opacity:.65; margin-left:4px; font-weight:500; }
.tabs { display:flex; gap:4px; background:#e9edf3; padding:4px; border-radius:11px; margin-bottom:18px; width:fit-content; max-width:100%; overflow-x:auto; }
.tab { padding:8px 16px; border-radius:8px; border:none; background:none; color:var(--muted); font-weight:650; font-size:.9rem; cursor:pointer; white-space:nowrap; }
.tab.active { background:#fff; color:var(--navy); box-shadow:0 1px 3px rgba(0,0,0,.08); }
.empty { text-align:center; color:var(--muted); padding:36px 16px; }
.empty .big { font-size:2.4rem; margin-bottom:8px; }

/* ── Ukazatel zásoby ── */
.meter { height:6px; border-radius:6px; background:#e9edf3; overflow:hidden; width:100%; min-width:60px; }
.meter > span { display:block; height:100%; border-radius:6px; }

/* ── KPI dlaždice ── */
.stat-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(155px,1fr)); gap:12px; margin-bottom:20px; }
.stat { background:#fff; border-radius:var(--radius); padding:16px 18px; border:1px solid var(--border); box-shadow:var(--shadow); text-align:left; }
button.stat { cursor:pointer; font:inherit; color:inherit; }
button.stat:hover { border-color:var(--navy); }
.stat-label { font-size:.8rem; color:var(--muted); font-weight:600; display:flex; align-items:center; gap:6px; }
.stat-val { font-size:1.65rem; font-weight:800; margin-top:4px; letter-spacing:-.02em; font-variant-numeric:tabular-nums; }
.stat-sub { font-size:.78rem; color:var(--muted); margin-top:2px; }

/* ── Tabulky (na mobilu se mění v karty) ── */
.table-wrap { background:#fff; border-radius:var(--radius); border:1px solid var(--border); box-shadow:var(--shadow); overflow:hidden; margin-bottom:18px; }
table { width:100%; border-collapse:collapse; }
th { text-align:left; padding:11px 14px; font-size:.76rem; text-transform:uppercase; letter-spacing:.04em; color:var(--muted); background:#f8fafc; border-bottom:1px solid var(--border); font-weight:700; white-space:nowrap; }
th.r, td.r { text-align:right; }
td.nw { white-space:nowrap; }
td { padding:12px 14px; border-bottom:1px solid var(--line); font-size:.93rem; vertical-align:middle; }
tr:last-child td { border-bottom:none; }
tbody tr:hover td { background:#fafbfd; }
tr.clickable { cursor:pointer; }
.prod-cell { display:flex; align-items:center; gap:10px; }
.prod-cell .emo { font-size:1.5rem; width:36px; height:36px; border-radius:10px; background:#f3f5f9; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.prod-cell .nm { font-weight:650; }
.prod-cell .sub { font-size:.78rem; color:var(--muted); }
@media (max-width:760px) {
  .table-wrap.responsive { background:none; border:none; box-shadow:none; overflow:visible; }
  .responsive table, .responsive tbody, .responsive tr, .responsive td { display:block; width:100%; }
  .responsive thead { display:none; }
  .responsive tr { background:#fff; border:1px solid var(--border); border-radius:12px; box-shadow:var(--shadow); margin-bottom:10px; padding:6px 4px; }
  .responsive td { border:none; padding:6px 12px; display:flex; justify-content:space-between; align-items:center; gap:10px; text-align:right; }
  .responsive td.r { text-align:right; }
  .responsive td[data-label]::before { content:attr(data-label); font-size:.75rem; color:var(--muted); font-weight:600; text-transform:uppercase; letter-spacing:.03em; text-align:left; }
  .responsive td.full { display:block; text-align:left; }
  .responsive tbody tr:hover td { background:none; }
}

/* ── Modální okno a toast ── */
.modal-bg { position:fixed; inset:0; background:rgba(15,25,45,.45); display:flex; align-items:center; justify-content:center; padding:16px; z-index:50; animation:fade .15s; }
.modal { background:#fff; border-radius:18px; box-shadow:var(--shadow-lg); width:100%; max-width:520px; max-height:calc(100vh - 32px); overflow:auto; animation:pop .18s; }
.modal-head { display:flex; align-items:center; gap:10px; padding:18px 20px 6px; }
.modal-head h3 { font-size:1.15rem; font-weight:800; flex:1; }
.modal-body { padding:10px 20px 4px; }
.modal-foot { display:flex; gap:10px; justify-content:flex-end; padding:16px 20px 20px; flex-wrap:wrap; }
.toasts { position:fixed; top:16px; left:50%; transform:translateX(-50%); display:flex; flex-direction:column; gap:8px; z-index:60; width:max-content; max-width:calc(100vw - 32px); }
.toast { background:var(--text); color:#fff; padding:12px 18px; border-radius:12px; box-shadow:var(--shadow-lg); font-weight:600; font-size:.92rem; animation:pop .2s; }
.toast.err { background:var(--red); }
.toast.ok { background:var(--green); }
@keyframes fade { from { opacity:0; } }
@keyframes pop { from { opacity:0; transform:scale(.96) translateY(6px); } }
.spinner { display:inline-block; width:20px; height:20px; border:3px solid var(--border); border-top-color:var(--navy); border-radius:50%; animation:spin .7s linear infinite; }
@keyframes spin { to { transform:rotate(360deg); } }

/* ── Stepper (− 12 +) ── */
.stepper { display:inline-flex; align-items:center; border:1.5px solid var(--border); border-radius:10px; overflow:hidden; background:#fff; }
.stepper button { width:36px; height:38px; border:none; background:#f6f8fb; cursor:pointer; font-size:1.15rem; font-weight:700; color:var(--navy); }
.stepper button:hover { background:var(--navy-soft); }
.stepper input { width:56px; border:none; border-radius:0; text-align:center; padding:8px 4px; font-weight:700; box-shadow:none !important; -moz-appearance:textfield; }
.stepper input::-webkit-outer-spin-button, .stepper input::-webkit-inner-spin-button { -webkit-appearance:none; margin:0; }
.stepper.active { border-color:var(--green); }
.stepper.active input { color:var(--green); }

/* ══ ADMIN ══ */
.admin { display:flex; min-height:100vh; }
.sidebar { width:240px; flex-shrink:0; background:var(--navy); color:#fff; padding:18px 12px; display:flex; flex-direction:column; gap:2px; position:sticky; top:0; height:100vh; overflow-y:auto; }
.sidebar .brand { display:flex; align-items:center; gap:10px; padding:4px 8px 18px; }
.sidebar .brand b { display:block; font-size:1rem; letter-spacing:.02em; }
.sidebar .brand small { color:rgba(255,255,255,.6); font-size:.78rem; }
.nav-group { font-size:.7rem; text-transform:uppercase; letter-spacing:.08em; color:rgba(255,255,255,.45); padding:14px 12px 6px; font-weight:700; }
.nav-btn { display:flex; align-items:center; gap:10px; padding:10px 12px; border-radius:9px; border:none; background:transparent; color:rgba(255,255,255,.78); cursor:pointer; text-align:left; font-size:.93rem; font-weight:600; width:100%; }
.nav-btn .ic { width:22px; text-align:center; }
.nav-btn .cnt { margin-left:auto; background:var(--gold); color:var(--navy); border-radius:10px; font-size:.72rem; padding:1px 7px; font-weight:800; }
.nav-btn:hover { background:rgba(255,255,255,.08); color:#fff; }
.nav-btn.active { background:#fff; color:var(--navy); }
.sidebar .logout { margin-top:12px; color:rgba(255,255,255,.7); border-color:rgba(255,255,255,.2); background:transparent; }
.sidebar .logout:hover { color:#fff; border-color:#fff; }
.main-panel { flex:1; min-width:0; padding:28px 32px 60px; }
.page-head { display:flex; align-items:flex-end; gap:12px; flex-wrap:wrap; margin-bottom:20px; }
.page-head h1 { font-size:1.55rem; font-weight:800; letter-spacing:-.02em; }
.page-head p { color:var(--muted); font-size:.92rem; margin-top:2px; }
.page-head .actions { margin-left:auto; display:flex; gap:8px; flex-wrap:wrap; }
.toolbar { display:flex; gap:10px; flex-wrap:wrap; align-items:center; margin-bottom:14px; }
.toolbar .search { flex:1; min-width:200px; max-width:340px; }
.mobile-top { display:none; }
@media (max-width:900px) {
  .admin { flex-direction:column; }
  .sidebar { display:none; }
  .mobile-top { display:flex; position:sticky; top:0; z-index:20; background:var(--navy); color:#fff; padding:10px 12px; align-items:center; gap:10px; }
  .mobile-top b { flex:1; }
  .mobile-nav { display:flex; gap:6px; overflow-x:auto; padding:10px 12px; background:#fff; border-bottom:1px solid var(--border); position:sticky; top:56px; z-index:19; scrollbar-width:none; }
  .mobile-nav::-webkit-scrollbar { display:none; }
  .mobile-nav .chip { white-space:nowrap; }
  .main-panel { padding:18px 16px 60px; }
  .page-head h1 { font-size:1.3rem; }
}
@media (min-width:901px) { .mobile-nav { display:none; } }

/* Naskladnění */
.restock-list { display:flex; flex-direction:column; }
.restock-cat { font-size:.75rem; text-transform:uppercase; letter-spacing:.06em; color:var(--muted); font-weight:700; padding:14px 4px 6px; }
.restock-row { display:flex; align-items:center; gap:12px; padding:10px 12px; background:#fff; border:1px solid var(--border); border-radius:12px; margin-bottom:6px; flex-wrap:wrap; }
.restock-row.on { border-color:var(--green); background:#f6fcf9; }
.restock-row .quick { display:flex; gap:4px; }
.restock-row .cost { width:100px; }
@media (max-width:600px) {
  .restock-row { gap:8px; }
  .restock-row > .grow:first-child { flex-basis:100%; }
  .restock-row .quick .q12 { display:none; }
  .restock-row .cost { width:78px; }
  .stepper button { width:32px; }
  .stepper input { width:44px; }
  .sticky-foot { padding:10px 12px; gap:8px; }
  .sticky-foot > input { order:5; flex-basis:100%; }
  .hide-m { display:none !important; }
}
.restock-row .cost input { padding:8px 10px; }
.sticky-foot { position:sticky; bottom:0; z-index:10; background:rgba(255,255,255,.96); backdrop-filter:blur(6px); border:1px solid var(--border); border-radius:14px; box-shadow:var(--shadow-lg); padding:14px 16px; margin-top:14px; display:flex; gap:12px; align-items:center; flex-wrap:wrap; }
.drop-zone { border:2px dashed #c9d2e0; border-radius:16px; padding:40px 20px; text-align:center; cursor:pointer; transition:.2s; background:#fafbfd; }
.drop-zone:hover,.drop-zone.drag { border-color:var(--navy); background:var(--navy-soft); }
.receipt-preview { max-width:220px; max-height:320px; border-radius:10px; display:block; box-shadow:var(--shadow); }
.info { background:var(--navy-soft); color:var(--navy); border-radius:12px; padding:12px 14px; font-size:.9rem; margin-bottom:14px; display:flex; gap:10px; align-items:flex-start; }
.info.gold { background:var(--gold-soft); color:#7a5d12; }
.diff-pos { color:var(--green); font-weight:700; }
.diff-neg { color:var(--red); font-weight:700; }

/* Žebříček */
.rank { display:flex; align-items:center; gap:12px; padding:9px 0; border-bottom:1px solid var(--line); }
.rank:last-child { border-bottom:none; }
.rank .bar { height:6px; border-radius:4px; background:var(--gold); }
.two-col { display:grid; grid-template-columns:repeat(auto-fit,minmax(320px,1fr)); gap:18px; }
.two-col > .card { margin-bottom:0; }

/* ══ TABLET (KIOSK) ══ */
.kiosk { max-width:1100px; margin:0 auto; padding:0 20px 120px; }
.kiosk-head { display:flex; align-items:center; gap:14px; padding:18px 0; margin-bottom:6px; }
.kiosk-head h1 { font-size:1.6rem; font-weight:850; color:var(--navy); letter-spacing:-.02em; line-height:1.1; }
.kiosk-head small { color:var(--muted); font-size:.92rem; display:block; }
.kiosk-head .clock { margin-left:auto; text-align:right; color:var(--navy); font-weight:800; font-size:1.4rem; font-variant-numeric:tabular-nums; }
.kiosk-head .clock small { font-weight:500; font-size:.8rem; }
.cat-tabs { display:flex; gap:8px; overflow-x:auto; margin-bottom:18px; padding-bottom:2px; scrollbar-width:none; }
.cat-btn { padding:11px 22px; border-radius:30px; border:1.5px solid var(--border); background:#fff; color:var(--muted); cursor:pointer; font-size:1rem; font-weight:650; white-space:nowrap; }
.cat-btn.active { border-color:var(--navy); background:var(--navy); color:#fff; }
.section-label { font-size:.78rem; font-weight:800; color:var(--gold-2); text-transform:uppercase; letter-spacing:.08em; margin:4px 0 10px; }
.specials-row { display:flex; gap:12px; overflow-x:auto; padding-bottom:6px; margin-bottom:18px; }
.product-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(160px,1fr)); gap:12px; }
.prod-card { position:relative; background:#fff; border-radius:18px; padding:20px 12px 16px; text-align:center; cursor:pointer; border:2px solid transparent; box-shadow:var(--shadow); user-select:none; transition:transform .1s,border-color .15s; -webkit-tap-highlight-color:transparent; }
.prod-card:active { transform:scale(.97); }
.prod-card.special { border-color:var(--gold); background:linear-gradient(160deg,var(--gold-soft),#fff 60%); min-width:170px; flex-shrink:0; }
.prod-card.in-cart { border-color:var(--navy); }
.prod-card.out { opacity:.45; cursor:not-allowed; }
.prod-card .qty-pill { position:absolute; top:8px; right:8px; background:var(--navy); color:#fff; border-radius:20px; font-size:.85rem; font-weight:800; min-width:28px; height:28px; display:flex; align-items:center; justify-content:center; padding:0 8px; }
.prod-emoji { font-size:2.8rem; margin-bottom:8px; line-height:1; }
.prod-name { font-size:1rem; font-weight:700; margin-bottom:4px; line-height:1.25; }
.prod-price { color:var(--navy); font-weight:850; font-size:1.2rem; }
.prod-stock { font-size:.76rem; color:var(--muted); margin-top:2px; }
.prod-stock.low { color:var(--amber); font-weight:700; }
.cart-bar { position:fixed; left:0; right:0; bottom:0; z-index:30; background:#fff; border-top:1px solid var(--border); box-shadow:0 -8px 30px rgba(20,33,61,.12); }
.cart-inner { max-width:1100px; margin:0 auto; padding:14px 20px; }
.cart-main { display:flex; align-items:center; gap:14px; }
.cart-count { background:var(--navy); color:#fff; border-radius:50%; width:36px; height:36px; display:flex; align-items:center; justify-content:center; font-weight:800; flex-shrink:0; }
.cart-lines { display:flex; flex-direction:column; gap:6px; padding:4px 0 12px; max-height:40vh; overflow-y:auto; }
.cart-line { display:flex; align-items:center; gap:10px; font-size:1rem; }
.login-screen { max-width:640px; margin:0 auto; padding:24px 20px 40px; }
.member-list { display:grid; grid-template-columns:repeat(auto-fill,minmax(140px,1fr)); gap:10px; margin:18px 0; }
.member-btn { background:#fff; border:2px solid transparent; border-radius:14px; padding:14px 10px; cursor:pointer; text-align:center; box-shadow:var(--shadow); }
.member-btn.sel { border-color:var(--navy); background:var(--navy-soft); }
.avatar { width:44px; height:44px; border-radius:50%; background:var(--navy); color:#fff; font-weight:800; font-size:.95rem; display:flex; align-items:center; justify-content:center; margin:0 auto 8px; flex-shrink:0; }
.avatar.sm { width:34px; height:34px; font-size:.8rem; margin:0; }
.pin-input { display:flex; gap:14px; justify-content:center; margin:16px 0; }
.pin-dot { width:16px; height:16px; border-radius:50%; background:var(--border); transition:.2s; }
.pin-dot.filled { background:var(--navy); transform:scale(1.1); }
.numpad { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; max-width:290px; margin:0 auto; }
.num-btn { background:#fff; border:none; border-radius:14px; padding:18px; font-size:1.5rem; font-weight:700; cursor:pointer; color:var(--text); box-shadow:var(--shadow); -webkit-tap-highlight-color:transparent; }
.num-btn:active { background:var(--navy-soft); }
.pin-sheet { background:#fff; border-radius:18px; padding:20px; box-shadow:var(--shadow); text-align:center; }
.checkout { max-width:540px; margin:0 auto; padding:28px 20px; }
.balance-card { border-radius:16px; padding:18px; margin:16px 0; }
.balance-pos { background:var(--green-soft); border:1.5px solid var(--green); }
.balance-warn { background:var(--amber-soft); border:1.5px solid var(--amber); }
.balance-neg { background:var(--red-soft); border:1.5px solid var(--red); }
.cart-item { display:flex; justify-content:space-between; padding:11px 0; border-bottom:1px solid var(--line); font-size:1rem; }
.qr-box { background:var(--gold-soft); border-radius:16px; padding:22px; text-align:center; margin:16px 0; border:1.5px solid var(--gold); }
`;
