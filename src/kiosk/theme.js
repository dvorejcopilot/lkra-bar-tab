// Barvy a fonty hlavní obrazovky jsou jako CSS proměnné v kiosk.css (.k-screen).

// Dlaždice s ikonou produktu: [pozadí, barva ikony]
const TILE = {
  beer:   ["#FDF1DE", "#B8741A"],
  soft:   ["#E6EFFA", "#2F6DB5"],
  radler: ["#F4F3D8", "#8A8A12"],
  coffee: ["#F2E8DF", "#7A4E2D"],
  tea:    ["#E4F1E7", "#3F7F4F"],
  snack:  ["#F6EBDD", "#9A5B2A"],
};

// Ikony kategorií (Material Symbols Rounded)
const CAT_ICON = { "Vše": "apps", "Pivo": "sports_bar", "Nealko": "local_drink", "Káva/Čaj": "coffee", "Snacky": "cookie" };
export const catIcon = (c) => CAT_ICON[c] || "restaurant";
export const catLabel = (c) => (c === "Káva/Čaj" ? "Káva a čaj" : c);

// Ikona a barvy dlaždice produktu odvozené z kategorie a názvu.
// Produkt může mít vlastní ikonu v poli `icon` (název Material Symbolu).
export function productLook(p) {
  const n = (p.name || "").toLowerCase();
  const c = p.category;
  let kind, icon;
  if (/radler/.test(n)) { kind = "radler"; icon = "sports_bar"; }
  else if (c === "Pivo" || /pivo|ležák|lezak/.test(n)) { kind = "beer"; icon = "sports_bar"; }
  else if (/čaj|caj|tea/.test(n)) { kind = "tea"; icon = "emoji_food_beverage"; }
  else if (c === "Káva/Čaj" || /káv|espresso|cappuccino|latte/.test(n)) { kind = "coffee"; icon = "coffee"; }
  else if (c === "Nealko") { kind = "soft"; icon = /mattoni|voda|water|rajec|magnesia|ondrášov/.test(n) ? "water_drop" : "local_drink"; }
  else if (c === "Snacky") { kind = "snack"; icon = /tyčink|tycink|preclík|preclik|rohlík|croissant/.test(n) ? "bakery_dining" : "cookie"; }
  else { kind = "snack"; icon = "restaurant"; }
  const [bg, fg] = TILE[kind];
  return { icon: p.icon || icon, bg, fg };
}

// Čeština: 1 položka, 2–4 položky, 5+ položek
export const plural = (n, one, few, many) => (n === 1 ? one : n >= 2 && n <= 4 ? few : many);

export const LOW_STOCK = 5;
