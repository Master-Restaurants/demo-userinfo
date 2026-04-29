/**
 * Demo-Mode — zentraler Schalter für die öffentliche Demo-Variante des Dashboards.
 *
 * Aktivierung: `NEXT_PUBLIC_DEMO_MODE=1` in `.env.local` (lokal) oder als Vercel-Env-Variable (Prod).
 *
 * Wirkung:
 *  - Login-Seite zeigt einen "Demo betreten"-Button (kein Passwort nötig)
 *  - Auth läuft komplett über einen Cookie-basierten Demo-User (kein Supabase nötig)
 *  - Alle Marktplatz-API-Routen liefern statische Seed-Daten statt echter API-Calls
 *  - Mutierende Aktionen geben "ok" zurück, schreiben aber nicht
 *
 * Reversibel: Setze `NEXT_PUBLIC_DEMO_MODE=0` (oder lasse weg) und der Code verhält sich wieder normal.
 */

export const DEMO_AUTH_COOKIE = "md_demo_user";

export const DEMO_USER = {
  id: "demo-user-00000000-0000-0000-0000-000000000001",
  email: "demo@master-dashboard.dev",
  fullName: "Demo Admin",
  /** "owner" damit der Demo-User maximalen Zugriff hat (Role-Testing, alle Seiten sichtbar). */
  roleKey: "owner",
  profileRoleRaw: "owner",
} as const;

function readBoolEnv(raw: string | undefined): boolean {
  const v = (raw ?? "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

/**
 * `true` wenn DEMO_MODE aktiv ist. Funktioniert auf Server und Client.
 *
 * Default für dieses Repo: **immer an**. Dieses Repo ist die öffentliche
 * Demo-Variante des Master-Dashboards — alle API-Routen liefern Mock-Daten,
 * keine echte Datenbank wird kontaktiert.
 *
 * Wer den Demo-Modus explizit ausschalten will (für lokale Entwicklung gegen
 * echtes Supabase), setzt `NEXT_PUBLIC_DEMO_MODE=0`.
 */
export function isDemoMode(): boolean {
  const raw = (process.env.NEXT_PUBLIC_DEMO_MODE ?? "").trim().toLowerCase();
  // Explizit ausgeschaltet:
  if (raw === "0" || raw === "false" || raw === "no" || raw === "off") return false;
  // Default und alle anderen Werte (inkl. "1"/"true"/leer): Demo an.
  return true;
}

/**
 * Gibt den Demo-Auth-Cookie-Wert aus einem Request-Cookie-Header zurück.
 * Funktioniert mit dem Cookie-Header-String oder mit einem Cookie-Map-Objekt.
 */
export function readDemoAuthCookie(cookieHeader: string | null | undefined): boolean {
  if (!cookieHeader) return false;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${DEMO_AUTH_COOKIE}=([^;]+)`));
  return Boolean(match && match[1]);
}
