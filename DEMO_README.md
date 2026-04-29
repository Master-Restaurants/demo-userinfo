# Master Dashboard — Demo-Variante

Reduzierte Variante des Master-Dashboards, gedacht als interaktives Vorstellungsprojekt für Bewerbungen. **Keine Supabase, keine externen API-Keys** — alle Daten kommen aus deterministischen Mock-Generatoren.

## Was die Demo zeigt

Eine voll klickbare Multi-Marktplatz-E-Commerce-Steuerung:

- **9 Marktplätze** (Amazon, eBay, Otto, Kaufland, Fressnapf, MediaMarkt-Saturn, Zooplus, Shopify, TikTok) mit Bestellungen, Produkten und Sales-Charts
- **Cross-Marketplace-Analytics** — Umsatz / Profit / Retouren pro Kanal über 90 Tage mit Vorperioden-Vergleich
- **Bedarfsprognose** — SKU-Lagerprojektion mit Container-Ankunftszeiten
- **Xentral-ERP-Integration** — Aufträge & Artikelstamm
- **Settings** — Rollensystem, User-Verwaltung, Tutorials
- **Cross-Listing-Drafts** (KI-vorbereitete Listings für andere Marktplätze)
- **Promotion-Deals**, **Price-Parity**, **Payouts**, **Procurement**, **Advertising**
- Dark-Mode · 3 Sprachen (DE/EN/ZH) · responsive Design

## Lokal starten

```bash
npm install
npm run dev
# → http://localhost:3000 → "Demo betreten"
```

Keine `.env`-Datei nötig — Demo-Mode ist Default an.

## Auf Vercel deployen

1. **[vercel.com](https://vercel.com)** öffnen, mit GitHub einloggen.
2. **„Add New… → Project"** → `Master-Restaurants/demo-userinfo` importieren.
3. Defaults für Framework / Build / Output beibehalten.
4. **Environment Variables** sind komplett optional. Nur falls du Telegram-Notifications willst (siehe unten).
5. **„Deploy"** klicken — fertig in 2-3 Min.

## Telegram-Notifications (optional)

Bei jedem „Demo betreten"-Klick kannst du per Telegram benachrichtigt werden — mit IP, Browser, Sprache, Zeitstempel. Praktisch wenn du sehen willst, ob ein Recruiter draufschaut.

### Bot anlegen (5 Min)

1. **Telegram öffnen** → `@BotFather` suchen → `/newbot`.
2. Namen + Username vergeben (Username muss auf `bot` enden).
3. BotFather schickt dir einen **Token** — notieren.
4. Schreib deinem neuen Bot einmal `/start` (sonst kann er dir keine Nachrichten senden).
5. **Chat-ID rausfinden:** Suche `@userinfobot` → `/start` → er antwortet mit deiner ID.

### Bei Vercel als Env-Variablen setzen

Vercel-Project → **Settings → Environment Variables** → "Add New":

| Name | Value |
|------|-------|
| `DEMO_TELEGRAM_BOT_TOKEN` | dein Token von BotFather |
| `DEMO_TELEGRAM_CHAT_ID` | deine Chat-ID von @userinfobot |

Nach dem Setzen einmal **Redeploy** triggern (Vercel macht das nicht automatisch bei Env-Änderungen).

### Lokal testen

In einer neuen `.env.local`:
```
DEMO_TELEGRAM_BOT_TOKEN=123456789:ABCdef-...
DEMO_TELEGRAM_CHAT_ID=123456789
```

`npm run dev` neu starten — beim Klick auf „Demo betreten" landet eine Telegram-Nachricht:

> 🚀 **Neuer Demo-Visit**
>
> 🕒 **Zeit:** 28.04.2026, 21:44:13
> 🌍 **IP:** `91.123.45.67`
> 🧭 **Browser:** Mozilla/5.0 ...
> 🔗 **Referer:** https://www.linkedin.com/...
> 🗣 **Sprache:** de-DE

Ohne Bot-Setup wird der Visit nur in die Server-Konsole bzw. Vercel-Function-Logs geloggt (`[demo-visit] {...}`).

### Datenschutz-Hinweis

Du loggst hier IP-Adressen — laut DSGVO personenbezogen. Für eine private Bewerbungs-Demo zur Eigenkontrolle vertretbar (berechtigtes Interesse, Art. 6 Abs. 1 lit. f), aber:
- **Keine** öffentliche Verbreitung der Logs.
- **Lösche** Telegram-Nachrichten nach Bewerbungs-Abschluss.
- Falls die Demo dauerhaft online bleibt: Erwähnung im Impressum/Datenschutz.

## Architektur (kurz)

| Datei / Ordner | Zweck |
|----------------|-------|
| `src/shared/lib/demoMode.ts` | Demo-Mode-Toggle + Demo-User-Konstante (Default: an) |
| `src/shared/lib/demoSeed.ts` | Deterministische Mock-Daten-Generatoren (Bestellungen, Produkte, Sales, Payouts, ...) |
| `src/shared/lib/demoTelemetry.ts` | Visit-Logging + optionale Telegram-Notification |
| `src/shared/lib/supabase/demoMockClient.ts` | Mock-Supabase-Client als Sicherheitsnetz für nicht-explizit-gepatchte Routen |
| `src/proxy.ts` | Cookie-basierte Demo-Auth statt Supabase-Auth |
| `src/shared/components/auth/DemoLoginCard.tsx` | "Demo betreten"-Login-Karte |
| `src/shared/components/layout/DemoModeBanner.tsx` | "Demo-Modus"-Hinweisbanner über jeder Dashboard-Seite |
| `src/app/api/demo/{login,logout,me}` | Demo-Auth-Endpoints |
| `src/app/api/{...}/route.ts` | 90+ API-Routen mit `if (isDemoMode()) return demoResponse(...)` Guards |

## Stack

Next.js 16 · React 19 · TypeScript · Tailwind 4 · shadcn/ui · TanStack Query/Table · Zustand · Recharts · Zod
