// Přehled: tržby, co dochází, kdo je v minusu, co se nejvíc prodává.
import { useMemo } from "react";
import { productStats, txTime, kc, fmtDays, STATUS } from "../lib/stock.js";
import { PageHead } from "../ui.jsx";

const DAY = 86400000;

export function AdminDashboard({ state, go }) {
  const d = useMemo(() => {
    const now = Date.now();
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const sum = (from) => state.transactions.filter((t) => txTime(t) >= from).reduce((s, t) => s + t.total, 0);
    const stats = productStats(state, 30).filter((p) => !p.hidden);
    const top = [...stats].filter((p) => p.sold > 0).sort((a, b) => b.sold - a.sold).slice(0, 6);
    return {
      today: sum(start.getTime()), week: sum(now - 7 * DAY), month: sum(now - 30 * DAY),
      todayCount: state.transactions.filter((t) => txTime(t) >= start.getTime()).length,
      attention: stats.filter((p) => p.status !== "ok" || p.daysLeft < 7).sort((a, b) => a.daysLeft - b.daysLeft || a.stock - b.stock),
      top, topMax: top[0]?.sold || 1,
      neg: [...state.members].filter((m) => m.balance < 0).sort((a, b) => a.balance - b.balance),
      totalBal: state.members.reduce((s, m) => s + m.balance, 0),
    };
  }, [state]);
  const memberName = (id) => state.members.find((m) => m.id === id)?.name || "Neznámý";

  return (
    <>
      <PageHead title="Přehled" sub={new Date().toLocaleDateString("cs-CZ", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}>
        <button className="btn btn-primary" onClick={() => go("restock")}>📥 Naskladnit</button>
      </PageHead>

      <div className="stat-grid">
        <div className="stat"><div className="stat-label">☀️ Dnes</div><div className="stat-val">{kc(d.today)}</div><div className="stat-sub">{d.todayCount} nákupů</div></div>
        <div className="stat"><div className="stat-label">📅 Posledních 7 dní</div><div className="stat-val">{kc(d.week)}</div></div>
        <div className="stat"><div className="stat-label">🗓 Posledních 30 dní</div><div className="stat-val">{kc(d.month)}</div></div>
        <button className="stat" onClick={() => go("members")}><div className="stat-label">👥 Saldo všech členů</div><div className="stat-val" style={{ color: d.totalBal >= 0 ? "var(--green)" : "var(--red)" }}>{kc(d.totalBal)}</div><div className="stat-sub">{d.neg.length} v minusu</div></button>
        <button className="stat" onClick={() => go("stock")}><div className="stat-label">📦 K doplnění</div><div className="stat-val" style={{ color: d.attention.length ? "var(--amber)" : "var(--green)" }}>{d.attention.length}</div><div className="stat-sub">dochází nebo dojde do týdne</div></button>
      </div>

      <div className="two-col">
        <div className="card">
          <div className="row"><div className="card-title grow">⚠️ Sklad k doplnění</div>{d.attention.length > 0 && <button className="btn btn-ghost btn-sm" onClick={() => go("restock", { items: Object.fromEntries(d.attention.filter((p) => p.suggest > 0).map((p) => [p.id, { qty: p.suggest }])) })}>Doplnit vše</button>}</div>
          <div className="card-sub">Pod minimem, nebo při současném prodeji dojde do týdne.</div>
          {!d.attention.length && <div className="empty" style={{ padding: 20 }}>Všeho je dost 👍</div>}
          {d.attention.slice(0, 8).map((p) => (
            <div key={p.id} className="rank">
              <span style={{ fontSize: "1.3rem" }}>{p.emoji}</span>
              <div className="grow"><b>{p.name}</b><div className="muted" style={{ fontSize: ".78rem" }}>{p.stock <= 0 ? "vyprodáno" : Number.isFinite(p.daysLeft) ? `vystačí ${fmtDays(p.daysLeft)}` : `min. ${p.min} ks`}{p.suggest > 0 && ` · doporučeno +${p.suggest}`}</div></div>
              <span className={`badge ${STATUS[p.status].cls}`}>{p.stock} ks</span>
            </div>
          ))}
          {d.attention.length > 8 && <button className="btn btn-text btn-sm" onClick={() => go("stock")}>a další {d.attention.length - 8}…</button>}
        </div>

        <div className="card">
          <div className="card-title">🏆 Nejprodávanější (30 dní)</div>
          <div className="card-sub">Kusy prodané přes tablet.</div>
          {!d.top.length && <div className="empty" style={{ padding: 20 }}>Zatím žádné prodeje.</div>}
          {d.top.map((p, i) => (
            <div key={p.id} className="rank">
              <b className="muted num" style={{ width: 18 }}>{i + 1}.</b>
              <span style={{ fontSize: "1.2rem" }}>{p.emoji}</span>
              <div className="grow">
                <div className="row" style={{ justifyContent: "space-between" }}><b>{p.name}</b><b className="num">{p.sold}×</b></div>
                <div className="bar" style={{ width: `${(p.sold / d.topMax) * 100}%`, marginTop: 4 }} />
              </div>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="row"><div className="card-title grow">💸 V minusu</div><button className="btn btn-text btn-sm" onClick={() => go("members")}>Členové →</button></div>
          <div className="card-sub">Kdo má záporné saldo.</div>
          {!d.neg.length && <div className="empty" style={{ padding: 20 }}>Nikdo není v minusu 🎉</div>}
          {d.neg.slice(0, 8).map((m) => (
            <div key={m.id} className="rank">
              <div className="avatar sm">{m.avatar}</div>
              <b className="grow">{m.name}</b>
              <b className="num" style={{ color: "var(--red)" }}>{m.balance} Kč</b>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="row"><div className="card-title grow">🧾 Poslední útraty</div><button className="btn btn-text btn-sm" onClick={() => go("transactions")}>Vše →</button></div>
          <div className="card-sub">Naposledy zapsané nákupy.</div>
          {!state.transactions.length && <div className="empty" style={{ padding: 20 }}>Zatím nic.</div>}
          {state.transactions.slice(0, 6).map((t) => (
            <div key={t.id} className="rank">
              <div className="grow"><b>{memberName(t.memberId)}</b><div className="muted" style={{ fontSize: ".78rem" }}>{t.date} · {t.items.map((i) => `${i.name} ×${i.qty}`).join(", ")}</div></div>
              <b className="num" style={{ color: "var(--navy)" }}>{t.total} Kč</b>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
