import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient as createServerSupabase } from "@/shared/lib/supabase/server";
import { parseSearchParams } from "@/shared/lib/apiValidation";
import { apiOk, apiUnauthenticated } from "@/shared/lib/apiResponse";
import { isDemoMode } from "@/shared/lib/demoMode";
import { demoMarketplaceOverviewPayload } from "@/shared/lib/demoSeed";

/**
 * Aggregator-Route für Analytics → Marktplätze.
 *
 * **Zweck:** Statt dass der Browser 9 parallele Sales-Calls abfeuert (und den Supabase-Pool von 10
 * Connections überlastet — siehe Incident 2026-04-15), ruft der Client **einen** Endpoint auf und
 * bekommt ein konsolidiertes Aggregat zurück. Serverseitig gilt Concurrency = 3.
 *
 * **Strategie:** Wir proxen auf die bestehenden Marktplatz-Sales-Routen. Das vermeidet Duplikation
 * der per-Marktplatz-Logik (SigV4, OAuth-Refresh, Mirakl-Paginierung) und nutzt deren eigenen
 * Cache-Layer (integration_data_cache). Die eigentliche Konsolidierung passiert hier mit
 * `Promise.allSettled` + Concurrency-Pool.
 */

export const maxDuration = 120;

const MARKETPLACES = [
  "amazon",
  "ebay",
  "otto",
  "kaufland",
  "fressnapf",
  "fressnapf-at",
  "mediamarkt-saturn",
  "zooplus",
  "tiktok",
  "shopify",
] as const;

type Marketplace = (typeof MARKETPLACES)[number];

/**
 * Pseudo-Slugs, die auf eine andere Sales-Route mit zusätzlichen Query-Params
 * gemappt werden. Fressnapf-AT teilt sich z. B. den DE-Mirakl-Operator
 * (channels: fn_de + fn_at), aber im Wochenbericht wollen wir DE/AT getrennt.
 * `fressnapf` (Bestand) bleibt **DE-only** durch implicit `country=de`.
 */
const SLUG_OVERRIDES: Partial<Record<Marketplace, { route: string; extraParams: Record<string, string> }>> = {
  fressnapf: { route: "fressnapf", extraParams: { country: "de" } },
  "fressnapf-at": { route: "fressnapf", extraParams: { country: "at" } },
};

const querySchema = z.object({
  fromYmd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format YYYY-MM-DD"),
  toYmd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format YYYY-MM-DD"),
  compare: z.enum(["true", "false", "1", "0", "yes", "no"]).optional(),
  compareMode: z.enum(["yoy", "previous"]).optional(),
});

type MarketplaceResult = {
  status: "ok" | "error";
  data?: unknown;
  error?: string;
  durationMs: number;
};

type OverviewResponse = {
  period: { from: string; to: string };
  marketplaces: Record<Marketplace, MarketplaceResult>;
};

async function runPool<T, R>(
  items: readonly T[],
  limit: number,
  worker: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  async function next(): Promise<void> {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      results[i] = await worker(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => next()));
  return results;
}

async function fetchMarketplaceSales(args: {
  request: Request;
  slug: Marketplace;
  fromYmd: string;
  toYmd: string;
  compare: boolean;
  compareMode: "yoy" | "previous";
}): Promise<MarketplaceResult> {
  const start = Date.now();
  const url = new URL(args.request.url);
  const override = SLUG_OVERRIDES[args.slug];
  const routeSlug = override?.route ?? args.slug;
  const salesUrl = new URL(`/api/${routeSlug}/sales`, url.origin);
  // Per-Marktplatz-Endpoints parsen `?from=`/`?to=` (NICHT `fromYmd`/`toYmd`).
  // Vorher wurden die Werte durchgereicht, aber unter dem falschen Namen — was
  // dazu führte, dass jeder Endpoint auf den Default-Zeitraum fiel statt den
  // angeforderten zu nehmen. Das ist der historische Grund warum keiner diesen
  // Aggregator genutzt hat.
  salesUrl.searchParams.set("from", args.fromYmd);
  salesUrl.searchParams.set("to", args.toYmd);
  if (args.compare) {
    salesUrl.searchParams.set("compare", "true");
    salesUrl.searchParams.set("compareMode", args.compareMode);
  }
  if (override) {
    for (const [k, v] of Object.entries(override.extraParams)) {
      salesUrl.searchParams.set(k, v);
    }
  }

  const cookie = args.request.headers.get("cookie") ?? "";
  try {
    const res = await fetch(salesUrl.toString(), {
      headers: cookie ? { cookie } : {},
      cache: "no-store",
    });
    if (!res.ok) {
      return {
        status: "error",
        error: `HTTP ${res.status}`,
        durationMs: Date.now() - start,
      };
    }
    const data = (await res.json()) as unknown;
    return { status: "ok", data, durationMs: Date.now() - start };
  } catch (e) {
    return {
      status: "error",
      error: e instanceof Error ? e.message : String(e),
      durationMs: Date.now() - start,
    };
  }
}

export async function GET(request: Request) {
  if (isDemoMode()) {
    return NextResponse.json(demoMarketplaceOverviewPayload());
  }
  const supabase = await createServerSupabase();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return apiUnauthenticated();

  const query = parseSearchParams(new URL(request.url), querySchema);
  if (!query.ok) return query.response;

  const { fromYmd, toYmd, compare: compareRaw, compareMode: compareModeRaw } = query.data;
  if (fromYmd > toYmd) {
    return NextResponse.json(
      { error: "fromYmd darf nicht nach toYmd liegen." },
      { status: 400 }
    );
  }
  const compare = compareRaw === "true" || compareRaw === "1" || compareRaw === "yes";
  const compareMode: "yoy" | "previous" = compareModeRaw ?? "yoy";

  const results = await runPool(MARKETPLACES, 3, (slug) =>
    fetchMarketplaceSales({ request, slug, fromYmd, toYmd, compare, compareMode })
  );

  const marketplaces = {} as Record<Marketplace, MarketplaceResult>;
  MARKETPLACES.forEach((slug, idx) => {
    marketplaces[slug] = results[idx];
  });

  const payload: OverviewResponse = {
    period: { from: fromYmd, to: toYmd },
    marketplaces,
  };
  return apiOk(payload);
}
