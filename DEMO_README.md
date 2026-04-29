# Master Dashboard — Demo-Variante

Dies ist eine eigenständige Demo-Variante des Master-Dashboards für Bewerbungs­zwecke. Alle echten Marktplatz-APIs (Amazon, eBay, Otto, Kaufland, Fressnapf, MediaMarkt-Saturn, Zooplus, Shopify, TikTok, Xentral) sind durch synthetische Demo-Daten ersetzt. Es wird **kein Supabase, keine Vercel-Secrets und kein API-Key** für den Betrieb der Demo benötigt.

---

## Wie es funktioniert

Aktiviert wird der Demo-Modus über eine einzige Umgebungsvariable: `NEXT_PUBLIC_DEMO_MODE=1`.

Wenn der Modus aktiv ist:
- **Login-Seite** zeigt einen großen "Demo betreten"-Button. Ein Klick → Recruiter ist als Admin eingeloggt.
- **Auth-System** läuft komplett über einen eigenen Cookie (`md_demo_user`); Supabase wird nicht kontaktiert.
- **Alle Marktplatz-API-Routen** liefern statische Seed-Daten statt echter HTTP-Calls.
- **Schreib-Aktionen** (Speichern / Sync) werden visuell als Erfolg angezeigt, schreiben aber nichts.
- **Banner** über dem Dashboard weist Recruiter darauf hin, dass alles fiktiv ist.

Ist `NEXT_PUBLIC_DEMO_MODE` nicht gesetzt (oder = `0`), verhält sich der Code wieder wie das Original — d.h. das Side-Project lässt sich jederzeit "wiederbeleben" mit echten Credentials.

---

## Lokal starten

```bash
npm install
npm run dev
# → http://localhost:3000
```

Die `.env.local` enthält bereits `NEXT_PUBLIC_DEMO_MODE=1` plus harmlose Dummy-Werte für Supabase. Das reicht.

---

## Telegram-Bot für Visit-Notifications (optional)

Wenn jemand die Demo öffnet ("Demo betreten" klickt), kannst du per Telegram benachrichtigt werden — mit IP, Browser, Sprache und Zeitstempel. Praktisch wenn ein Recruiter draufschaut.

### Bot anlegen (5 Minuten)

1. **Telegram öffnen** und `@BotFather` suchen → Chat starten.
2. `/newbot` senden, einen Namen eingeben (z.B. "Master-Dashboard Visits"), dann einen Username (muss auf `bot` enden, z.B. `master_dashboard_visits_bot`).
3. BotFather schickt dir einen Token im Format `123456789:ABCdef-...` — **diesen Token notieren**.
4. Schreib deinem neuen Bot einmal `/start` (sonst kann er dir keine Nachrichten senden).
5. **Chat-ID herausfinden:** Suche `@userinfobot` in Telegram, schick `/start` — er antwortet mit deiner ID (z.B. `123456789`).

### Bei Vercel als Env-Variablen setzen

Vercel-Project → Settings → Environment Variables → "Add New":

| Name | Value |
|------|-------|
| `DEMO_TELEGRAM_BOT_TOKEN` | dein Token von BotFather |
| `DEMO_TELEGRAM_CHAT_ID` | deine Chat-ID von @userinfobot |

Nach dem Setzen einmal **Redeploy** (Vercel macht das nicht automatisch bei Env-Änderungen).

### Lokal testen

In `.env.local`:
```
DEMO_TELEGRAM_BOT_TOKEN=123456789:ABCdef-...
DEMO_TELEGRAM_CHAT_ID=123456789
```

Dann `npm run dev` neu starten. Beim Klick auf "Demo betreten" landet eine Telegram-Nachricht in deinem Chat:

> 🚀 **Neuer Demo-Visit**
>
> 🕒 **Zeit:** 28.04.2026, 21:44:13
> 🌍 **IP:** `91.123.45.67`
> 🧭 **Browser:** Mozilla/5.0 ...
> 🔗 **Referer:** https://www.linkedin.com/...
> 🗣 **Sprache:** de-DE

Sind die Variablen nicht gesetzt, läuft alles normal — der Visit wird stattdessen nur in die Server-Konsole bzw. Vercel-Function-Logs geloggt (siehst du im Vercel-Dashboard unter "Logs").

### Datenschutz-Hinweis

Du loggst hier IP-Adressen von Besuchern — laut DSGVO ist das prinzipiell personenbezogen. Für eine private Bewerbungs-Demo zur Eigenkontrolle ist das vertretbar (berechtigtes Interesse, Art. 6 Abs. 1 lit. f), aber:
- **Keine** öffentliche Verbreitung der Logs.
- **Lösche** Telegram-Nachrichten nach Bewerbungs-Abschluss.
- Im Impressum/Datenschutz solltest du das erwähnen falls die Demo dauerhaft online bleibt.

---

## Auf Vercel veröffentlichen

### Schritt 1 — GitHub-Repo anlegen

1. Erstelle einen kostenlosen GitHub-Account (falls noch nicht vorhanden): https://github.com/signup
2. Erstelle ein neues, **privates** Repo (Name z.B. `master-dashboard-demo`).
3. Im Terminal (im Ordner `Master-Dashboard-Demo`):

   ```bash
   git init
   git add .
   git commit -m "Initial demo version"
   git branch -M main
   git remote add origin https://github.com/DEIN_NUTZERNAME/master-dashboard-demo.git
   git push -u origin main
   ```

### Schritt 2 — Vercel verbinden

1. Gehe auf https://vercel.com und melde dich mit deinem GitHub-Account an (kostenlos).
2. Klicke auf "Add New…" → "Project".
3. Wähle dein neu erstelltes Repo `master-dashboard-demo` aus.
4. Bei "Configure Project":
   - **Framework Preset:** Next.js (wird automatisch erkannt)
   - **Root Directory:** lasse leer (Standard ist Repo-Root)
   - **Build Command:** lasse leer (Default `npm run build`)
   - **Environment Variables:** klappe auf und füge folgende hinzu:

     | Name | Value |
     |------|-------|
     | `NEXT_PUBLIC_DEMO_MODE` | `1` |
     | `NEXT_PUBLIC_SUPABASE_URL` | `https://demo.master-dashboard.invalid` |
     | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `demo-anon-key-placeholder.eyJhbGciOiJIUzI1NiJ9.demo.signature` |
     | `SKIP_ENV_VALIDATION` | `1` |

5. Klicke auf "Deploy". Nach ca. 2–3 Minuten ist die Demo unter einer URL wie `master-dashboard-demo.vercel.app` erreichbar.

### Schritt 3 — Eigene Domain (optional)

Wenn du eine Custom-Domain möchtest (z.B. `dashboard.deinedomain.de`):
- Vercel-Project → Settings → Domains → Add Domain.
- Folge den DNS-Anweisungen.

---

## Was ist in der Demo enthalten?

### Voll funktional mit Demo-Daten
- **Login** mit "Demo betreten"-Button
- **Home / Übersicht** mit Quick-Links
- **Analytics → Marktplätze** (Cross-Marketplace Charts, Umsatz/Profit pro Kanal über 90 Tage)
- **Bedarfsprognose** (`/analytics/article-forecast`)
- **Bestellungen** pro Marktplatz (Amazon, eBay, Otto, Kaufland, Fressnapf, MMS, Zooplus, Shopify, TikTok)
- **Produkte** pro Marktplatz
- **Xentral-Bestellungen + Artikel**
- **Settings → Users / Profile / Tutorials**
- **Updates-Feed**
- **Dark-Mode-Toggle**
- **Sprach-Umschalter** (DE/EN/ZH)
- **Tutorials** (Cosmo-Mascot)

### Gracefully leer (kein Crash, aber keine Daten)
- Procurement-Import
- Cross-Listing
- Werbe-Modul
- Payouts

---

## Architektur des Demo-Modes

### Geänderte / neue Dateien

| Datei | Zweck |
|-------|-------|
| `src/shared/lib/demoMode.ts` | **NEU** — `isDemoMode()`, `DEMO_USER`-Konstante, Cookie-Name |
| `src/shared/lib/demoSeed.ts` | **NEU** — Generiert deterministische Mock-Daten (Bestellungen, Produkte, Sales) für alle Marktplätze |
| `src/shared/lib/supabase/demoMockClient.ts` | **NEU** — Mock-Supabase-Client (verhindert dass Routen ohne explizite Demo-Guards crashen) |
| `src/proxy.ts` | Erweitert — Demo-Cookie statt Supabase-Auth im Demo-Modus |
| `src/shared/lib/supabase/{server,client,admin}.ts` | Erweitert — Liefern Mock-Client im Demo-Modus |
| `src/shared/lib/supabase/env.ts` | Erweitert — Dummy-Werte im Demo-Modus erlaubt |
| `src/shared/hooks/useUser.ts` | Erweitert — Demo-User aus `/api/demo/me` |
| `src/shared/components/auth/DemoLoginCard.tsx` | **NEU** — Login-Karte mit "Demo betreten" |
| `src/shared/components/auth/LogoutMenuItem.tsx` | Erweitert — Demo-Logout-Endpoint |
| `src/shared/components/layout/DemoModeBanner.tsx` | **NEU** — Banner über dem Dashboard |
| `src/app/(auth)/login/page.tsx` | Erweitert — Im Demo-Mode: Demo-Karte rendern |
| `src/app/(dashboard)/layout.tsx` | Erweitert — Banner einbauen |
| `src/app/api/demo/login/route.ts` | **NEU** — Setzt Demo-Cookie |
| `src/app/api/demo/logout/route.ts` | **NEU** — Löscht Demo-Cookie |
| `src/app/api/demo/me/route.ts` | **NEU** — Liefert Demo-User-Profil |
| `src/app/api/{marketplace}/{orders,products,sales}/route.ts` | Erweitert — Demo-Guard am Anfang von 27 Routen |
| `src/app/api/analytics/marketplace-overview/route.ts` | Erweitert — Demo-Guard |
| `src/app/api/xentral/{orders,articles}/route.ts` | Erweitert — Demo-Guard |
| `src/app/api/article-forecast/rules/route.ts` | Erweitert — Demo-Guard |

### Wie reaktiviert man die echten Daten?

Setze `NEXT_PUBLIC_DEMO_MODE=0` (oder lösche die Variable) und gib stattdessen die echten Supabase- und Marktplatz-Credentials in `.env.local` ein. Die `.env.example` aus dem Original-Projekt zeigt welche.

---

## Bekannte Einschränkungen der Demo

- **Daten sind statisch:** Selbst wenn man "neuen Eintrag erstellen" klickt, persistiert nichts — Reload zeigt wieder die ursprünglichen Mock-Daten.
- **Login akzeptiert keine echten User:** Der "Demo betreten"-Knopf ist die einzige Login-Methode im Demo-Mode. Email/Passwort-Form ist im Demo-Mode nicht sichtbar.
- **Stempel-/Zeitwerte** wirken konsistent, aber sind deterministisch aus dem aktuellen Datum errechnet — bei wiederholtem Reload können einzelne Cached-Werte minimal abweichen, das ist normal.

---

## Original-Projekt wiederbeleben

Das Original-Projekt liegt unter `Master-Dashboard 2/Master-Dashboard/master-dashboard/` (separater Ordner, eigenständig). Die Demo hier ist ein Fork ohne Verbindung zum Original — Änderungen hier wirken sich nicht auf das Original aus.

Um das Original wiederzubeleben:
- Echte `.env.local` mit Supabase- und Marktplatz-Credentials einsetzen (siehe `.env.example`).
- `npm install && npm run dev`.
