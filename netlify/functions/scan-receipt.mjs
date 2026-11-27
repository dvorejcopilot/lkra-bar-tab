// Serverová funkce: přijme fotku účtenky z appky a pošle ji Claudovi.
// API klíč je uložený bezpečně v Netlify (proměnná ANTHROPIC_API_KEY),
// takže ho nikdo nevidí ve zdrojovém kódu stránky. Smí ji použít jen správce.
import { json, checkAdmin } from "../lib/store.mjs";

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Použij POST" }, 405);
  const denied = await checkAdmin(req);
  if (denied) return denied;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return json({ error: "Čtení účtenek není zapnuté (chybí ANTHROPIC_API_KEY)." }, 503);

  let body;
  try { body = await req.json(); } catch { return json({ error: "Neplatná data" }, 400); }
  if (!Array.isArray(body.messages)) return json({ error: "Chybí zpráva" }, 400);

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5",
      max_tokens: Math.min(Number(body.max_tokens) || 1000, 2000),
      messages: body.messages,
    }),
  });
  const data = await resp.json();
  if (!resp.ok) return json({ error: data?.error?.message || "Chyba při volání Clauda" }, 502);
  return json(data);
};

export const config = { path: "/api/scan-receipt" };
