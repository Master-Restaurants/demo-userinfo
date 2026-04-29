import { isDemoMode } from "@/shared/lib/demoMode";

/**
 * Kein Throw beim Modul-Load: `next build` lädt Route-Module ohne `.env` (z. B. CI) —
 * Fehler erst bei echtem createClient()-Aufruf.
 *
 * Im Demo-Mode (`NEXT_PUBLIC_DEMO_MODE=1`) sind echte Supabase-Credentials nicht nötig.
 * Wir liefern dann harmlose Dummy-Werte, damit der Code nicht crasht — die DB wird
 * sowieso nie kontaktiert (alle API-Routen liefern Seed-Daten).
 */
const DEMO_DUMMY_URL = "https://demo.master-dashboard.invalid";
const DEMO_DUMMY_ANON_KEY =
  "demo-anon-key-placeholder.eyJhbGciOiJIUzI1NiJ9.demo.signature";

const RAW_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
const RAW_ANON_KEY = (
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  ""
).trim();

export const SUPABASE_URL = RAW_URL || (isDemoMode() ? DEMO_DUMMY_URL : "");
export const SUPABASE_ANON_KEY =
  RAW_ANON_KEY || (isDemoMode() ? DEMO_DUMMY_ANON_KEY : "");

export function assertSupabasePublicEnv(): void {
  if (isDemoMode()) {
    // Dummy-Werte sind okay — kein Throw.
    return;
  }
  if (!SUPABASE_URL) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  }
  if (!SUPABASE_ANON_KEY) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)"
    );
  }
}
