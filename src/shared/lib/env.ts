/**
 * Env-Validierung — vereinfacht für die Demo-Variante.
 *
 * Im Demo-Mode (Default für dieses Repo) sind ALLE externen Credentials optional.
 * Mock-Clients und Seed-Daten übernehmen, sodass die App ohne jegliche `.env`-Datei läuft.
 *
 * Echte Validierung (für den Fall, dass jemand das Repo gegen echtes Supabase
 * fahren wollte) ist absichtlich entfernt — siehe Original-Projekt für die volle Variante.
 */

import { z } from "zod";

const optional = z.string().optional().or(z.literal(""));

const baseSchema = z.object({
  // ---- Public (Browser-sichtbar) ----
  NEXT_PUBLIC_DEMO_MODE: optional,
  NEXT_PUBLIC_SUPABASE_URL: optional,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: optional,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: optional,
  NEXT_PUBLIC_APP_URL: optional,
  NEXT_PUBLIC_LOCAL_TEST_MODE: optional,
  NEXT_PUBLIC_LOCAL_OWNER_EMAILS: optional,
  NEXT_PUBLIC_KAUFLAND_ORDER_URL_TEMPLATE: optional,
  NEXT_PUBLIC_TIKTOK_ORDER_URL_TEMPLATE: optional,
  NEXT_PUBLIC_SHOPIFY_ORDER_URL_TEMPLATE: optional,
  NEXT_PUBLIC_OTTO_ORDER_URL_TEMPLATE: optional,
  NEXT_PUBLIC_FRESSNAPF_ORDER_URL_TEMPLATE: optional,
  NEXT_PUBLIC_XENTRAL_ADDRESS_DEMO_ORDERS: optional,

  // ---- Demo-spezifisch (Telegram-Notifications) ----
  DEMO_TELEGRAM_BOT_TOKEN: optional,
  DEMO_TELEGRAM_CHAT_ID: optional,

  // ---- Server-only (alle optional, Mock übernimmt) ----
  SUPABASE_SERVICE_ROLE_KEY: optional,
  APP_BASE_URL: optional,
  OWNER_EMAILS: optional,
  CRON_SECRET: optional,
  INTEGRATION_CACHE_WARM_SECRET: optional,
  IMAGE_PROXY_ALLOWED_HOSTS: optional,

  // ---- Runtime ----
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

const parsed = baseSchema.safeParse(process.env);

// Im Demo-Modus laufen wir auch mit komplett leerer Env durch — wir lassen
// das Schema-Result einfach als unknown durch, falls Felder fehlen.
export const env = (parsed.success ? parsed.data : (process.env as unknown)) as z.infer<typeof baseSchema>;

export type Env = typeof env;
