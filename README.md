# LKRA Bar – samoobslužný bar Aeroklubu Raná

Webová appka na zapisování útraty v klubovém baru.

- **Hlavní adresa** (např. `bar.tvojedomena.cz`) je pro tablet v baru: zákazník si vybere, co si bere, a zaplatí svým PINem.
- **Adresa `/admin`** (např. `bar.tvojedomena.cz/admin`) je správa. Přihlásíš se heslem odkudkoli, z mobilu i z počítače, a víc správců může pracovat najednou.

## Jak to funguje

```
 Tablet v baru ─┐                       ┌─ Netlify funkce (server)
 Správce 1 ─────┼──── internet ─────────┤   ověří PIN / heslo
 Správce 2 ─────┘                       └─ Netlify Blobs (data)
```

Všechna data (členové, sklad, útraty) leží na serveru v **Netlify Blobs**. Je to jednoduchá online „databáze“, která je součástí Netlify zdarma, takže nepotřebuješ žádný další účet. Každé zařízení vidí stejná data a obnovují se samy každých 15 sekund.

## Co je v projektu

| Soubor / složka | K čemu slouží |
|---|---|
| `src/App.jsx` | Vzhled a chování appky (to, co vytvořil Claude) |
| `src/shared/data.js` | Počáteční data a pravidla změn (nákup, dobití, naskladnění…) |
| `netlify/functions/` | Server: `state` (data pro tablet), `checkout` (placení), `admin` (správa), `scan-receipt` (čtení účtenek) |
| `netlify/lib/store.mjs` | Ukládání dat a ochrana proti hádání PINů |
| `netlify.toml` | Návod pro Netlify, jak appku sestavit |

## Bezpečnost (jednoduše)

- PINy a heslo správce se ověřují **na serveru**, ne v prohlížeči. Tablet nikdy nevidí PINy, e-maily ani zůstatky ostatních.
- Ceny při placení bere server ze své databáze, takže je nikdo nemůže „podvrhnout“.
- Po 5 špatných pokusech se daný člen (nebo admin) na 15 minut zamkne.
- Heslo správce si nastavíš v Netlify (viz níže). Zvol dlouhé heslo, třeba 3–4 slova.

## Nastavení v Netlify (Site configuration → Environment variables)

| Proměnná | Povinná? | Co to je |
|---|---|---|
| `ADMIN_PASSWORD` | ano | Heslo do správy na `/admin` |
| `ANTHROPIC_API_KEY` | ne | Klíč z console.anthropic.com, zapne čtení účtenek |

Po změně proměnných dej v Netlify **Deploys → Trigger deploy**, ať se nové nastavení načte.

## Před ostrým provozem

1. Přihlas se na `/admin`.
2. V **Členové** smaž ukázkové členy (🗑) a přidej skutečné.
3. V **Nastavení** zadej skutečné číslo účtu (pro QR platby).
4. V **Sklad** uprav nabídku.
5. Na tabletu otevři hlavní adresu a přidej si ji na plochu (v prohlížeči „Přidat na plochu“).
