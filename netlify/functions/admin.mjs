// POST /api/admin – vše pro správce. Vyžaduje heslo v hlavičce x-admin-password.
// Bez "action" jen vrátí data; s "action" provede změnu a vrátí nová data.
import { json, readState, updateState, apply, adminState, checkAdmin } from "../lib/store.mjs";

const ALLOWED = new Set([
  "ADD_STOCK", "APPLY_RECEIPT", "ADD_MEMBER", "TOPUP", "MARK_SENT", "SET_BANK",
  "SET_THRESHOLD", "ADD_PRODUCT", "DELETE_MEMBER", "DELETE_PRODUCT", "SET_MEMBER_PIN",
]);

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Použij POST" }, 405);
  const denied = await checkAdmin(req);
  if (denied) return denied;

  let body = {};
  try { body = await req.json(); } catch {}
  const action = body.action;
  if (!action) return json(adminState(await readState()));
  if (!ALLOWED.has(action.type)) return json({ error: "Neznámá akce" }, 400);
  if ((action.type === "ADD_MEMBER" || action.type === "SET_MEMBER_PIN") && !/^\d{4}$/.test(String(action.pin)))
    return json({ error: "PIN musí mít 4 číslice" }, 400);

  try { return json(adminState(await updateState(apply(action)))); }
  catch (e) { return json({ error: e.message }, e.status || 500); }
};

export const config = { path: "/api/admin" };
