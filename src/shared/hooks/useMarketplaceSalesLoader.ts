"use client";

import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react";
import type { SalesCompareResponse } from "@/shared/lib/marketplace-sales-types";
import {
  AMAZON_FETCH_TIMEOUT_MS,
  defaultPeriod,
  fetchSalesCompareWithTimeout,
} from "@/shared/lib/marketplace-analytics-utils";
import {
  DASHBOARD_CLIENT_BACKGROUND_SYNC_MS,
  readAnalyticsSalesCompareInitial,
  readLocalJsonCache,
  shouldRunBackgroundSync,
  writeLocalJsonCache,
} from "@/shared/lib/dashboardClientCache";

export type MarketplaceSlugKey =
  | "amazon"
  | "ebay"
  | "otto"
  | "kaufland"
  | "fressnapf"
  | "fressnapf-at"
  | "mms"
  | "zooplus"
  | "tiktok"
  | "shopify";

type LoaderState = {
  data: SalesCompareResponse | null;
  loading: boolean;
  error: string | null;
  backgroundSyncing: boolean;
};

type LoaderConfig = {
  slug: MarketplaceSlugKey;
  storagePrefix: string;
  endpoint: string;
  errorKey: string;
  warnTag: string;
  timeoutMs?: number;
  enabled?: boolean;
  disabledMessage?: string;
  useInFlightRef?: boolean;
};

const CONFIGS: LoaderConfig[] = [
  {
    slug: "amazon",
    storagePrefix: "analytics_amazon_sales_compare_v1",
    endpoint: "/api/amazon/sales",
    errorKey: "analyticsMp.amazonMetricsError",
    warnTag: "Amazon",
    timeoutMs: AMAZON_FETCH_TIMEOUT_MS,
    useInFlightRef: true,
  },
  {
    slug: "ebay",
    storagePrefix: "analytics_ebay_sales_compare_v1",
    endpoint: "/api/ebay/sales",
    errorKey: "analyticsMp.ebayMetricsError",
    warnTag: "eBay",
    disabledMessage: "eBay ist aktuell deaktiviert oder nicht konfiguriert.",
  },
  {
    slug: "otto",
    storagePrefix: "analytics_otto_sales_compare_v1",
    endpoint: "/api/otto/sales",
    errorKey: "analyticsMp.ottoMetricsError",
    warnTag: "Otto",
  },
  {
    slug: "kaufland",
    storagePrefix: "analytics_kaufland_sales_compare_v1",
    endpoint: "/api/kaufland/sales",
    errorKey: "analyticsMp.kauflandMetricsError",
    warnTag: "Kaufland",
  },
  {
    slug: "fressnapf",
    storagePrefix: "analytics_fressnapf_sales_compare_v1",
    endpoint: "/api/fressnapf/sales?country=de",
    errorKey: "analyticsMp.fressnapfMetricsError",
    warnTag: "Fressnapf DE",
  },
  {
    slug: "fressnapf-at",
    storagePrefix: "analytics_fressnapf_at_sales_compare_v1",
    endpoint: "/api/fressnapf/sales?country=at",
    errorKey: "analyticsMp.fressnapfAtMetricsError",
    warnTag: "Fressnapf AT",
  },
  {
    slug: "mms",
    storagePrefix: "analytics_mms_sales_compare_v1",
    endpoint: "/api/mediamarkt-saturn/sales",
    errorKey: "analyticsMp.mmsMetricsError",
    warnTag: "MediaMarkt Saturn",
  },
  {
    slug: "zooplus",
    storagePrefix: "analytics_zooplus_sales_compare_v1",
    endpoint: "/api/zooplus/sales",
    errorKey: "analyticsMp.zooplusMetricsError",
    warnTag: "Zooplus",
  },
  {
    slug: "tiktok",
    storagePrefix: "analytics_tiktok_sales_compare_v1",
    endpoint: "/api/tiktok/sales",
    errorKey: "analyticsMp.tiktokMetricsError",
    warnTag: "TikTok",
    disabledMessage: "TikTok ist aktuell deaktiviert oder nicht konfiguriert.",
  },
  {
    slug: "shopify",
    storagePrefix: "analytics_shopify_sales_compare_v1",
    endpoint: "/api/shopify/sales",
    errorKey: "analyticsMp.shopifyMetricsError",
    warnTag: "Shopify",
  },
];

const salesCompareInitMemo = new Map<string, { data: unknown; loading: boolean }>();

function getInit(storagePrefix: string): { data: SalesCompareResponse | null; loading: boolean } {
  const { from, to } = defaultPeriod();
  const fullKey = `${storagePrefix}:${from}:${to}`;
  const hit = salesCompareInitMemo.get(fullKey);
  if (hit) return hit as { data: SalesCompareResponse | null; loading: boolean };
  const v = readAnalyticsSalesCompareInitial<SalesCompareResponse>(fullKey);
  salesCompareInitMemo.set(fullKey, v);
  return v;
}

function buildInitialStates(): Record<MarketplaceSlugKey, LoaderState> {
  const out = {} as Record<MarketplaceSlugKey, LoaderState>;
  for (const cfg of CONFIGS) {
    const init = getInit(cfg.storagePrefix);
    out[cfg.slug] = {
      data: init.data,
      loading: init.loading,
      error: null,
      backgroundSyncing: false,
    };
  }
  return out;
}

/**
 * Orchestriert alle 9 Marktplatz-Sales-Loader:
 * - Concurrency-Pool (3er) bei Mount + Period-Change
 * - Background-Sync via setInterval (sichtbarkeits-gated)
 * - localStorage-Cache, in-flight-Schutz für Amazon, eBay/TikTok Disable-Short-Circuit
 */
export default function useMarketplaceSalesLoader(params: {
  periodFrom: string;
  periodTo: string;
  periodRef: MutableRefObject<{ from: string; to: string }>;
  t: (key: string, params?: Record<string, string | number>) => string;
}): {
  states: Record<MarketplaceSlugKey, LoaderState>;
  reloaders: Record<MarketplaceSlugKey, (forceRefresh?: boolean, silent?: boolean) => Promise<void>>;
} {
  const { periodFrom, periodTo, periodRef, t } = params;

  const [states, setStates] = useState<Record<MarketplaceSlugKey, LoaderState>>(() =>
    buildInitialStates()
  );
  const [ebayEnabled, setEbayEnabled] = useState(true);
  const [tiktokEnabled, setTiktokEnabled] = useState(true);
  const amazonInFlightRef = useRef(false);
  const [analyticsHasMounted, setAnalyticsHasMounted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const CACHE_KEY = "analytics_marketplaces_sales_config_status_v1";
    const CACHE_TTL_MS = 5 * 60 * 1000;

    const applyPayload = (payload: {
      ebay?: { configured?: boolean };
      tiktok?: { configured?: boolean };
    }) => {
      if (payload.ebay?.configured === false) setEbayEnabled(false);
      if (payload.tiktok?.configured === false) setTiktokEnabled(false);
    };

    try {
      const cachedRaw = window.sessionStorage.getItem(CACHE_KEY);
      if (cachedRaw) {
        const cached = JSON.parse(cachedRaw) as {
          at: number;
          payload: { ebay?: { configured?: boolean }; tiktok?: { configured?: boolean } };
        };
        if (cached && typeof cached.at === "number" && Date.now() - cached.at < CACHE_TTL_MS) {
          applyPayload(cached.payload);
          return () => {
            cancelled = true;
          };
        }
      }
    } catch {
      // ignore cache read errors
    }

    void fetch("/api/marketplaces/sales-config-status", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) return null;
        return (await res.json()) as {
          ebay?: { configured?: boolean };
          tiktok?: { configured?: boolean };
        };
      })
      .then((payload) => {
        if (cancelled || !payload) return;
        applyPayload(payload);
        try {
          window.sessionStorage.setItem(
            CACHE_KEY,
            JSON.stringify({ at: Date.now(), payload })
          );
        } catch {
          // ignore cache write errors (quota, privacy mode)
        }
      })
      .catch(() => {
        // Bei Fehlern Kanäle aktiv lassen.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const patch = useCallback((slug: MarketplaceSlugKey, partial: Partial<LoaderState>) => {
    setStates((prev) => ({ ...prev, [slug]: { ...prev[slug], ...partial } }));
  }, []);

  const runLoad = useCallback(
    async (cfg: LoaderConfig, forceRefresh: boolean, silent: boolean) => {
      if (cfg.useInFlightRef && amazonInFlightRef.current) return;
      if (cfg.useInFlightRef) amazonInFlightRef.current = true;

      const isDisabled =
        (cfg.slug === "ebay" && !ebayEnabled) || (cfg.slug === "tiktok" && !tiktokEnabled);
      if (isDisabled) {
        patch(cfg.slug, {
          loading: false,
          backgroundSyncing: false,
          ...(silent ? {} : { error: cfg.disabledMessage ?? null }),
        });
        if (cfg.useInFlightRef) amazonInFlightRef.current = false;
        return;
      }

      const { from, to } = periodRef.current;
      const cacheKey = `${cfg.storagePrefix}:${from}:${to}`;

      // Phase 1 (Sync, vor dem Fetch): alle init-Felder in EINEM patch().
      // Vorher: bis zu 4 separate patch()-Calls → 4 setState → 9 marketplaces × 4 =
      // 36 setStates pro Page-Load nur in dieser Phase. Mit React 19 concurrent
      // rendering führte das zu spürbarem Render-Storm in MarketplaceTile-Liste.
      const cached = !forceRefresh && !silent
        ? readLocalJsonCache<{ savedAt: number } & SalesCompareResponse>(cacheKey)
        : null;
      const hadCache = !!(cached?.summary && !cached.error);
      const showBackgroundIndicator = silent || (!forceRefresh && hadCache);
      const phase1Patch: Partial<LoaderState> = {};
      if (hadCache) phase1Patch.data = cached;
      if (!silent) {
        phase1Patch.loading = forceRefresh || !hadCache;
        phase1Patch.error = null;
      }
      if (showBackgroundIndicator) phase1Patch.backgroundSyncing = true;
      if (Object.keys(phase1Patch).length > 0) patch(cfg.slug, phase1Patch);

      try {
        // Endpoint kann bereits Query-Params tragen (z. B. `?country=at` für
        // Fressnapf-AT). Daher Existing-Query bewahren und mergen, nicht naiv
        // mit `?` konkatenieren.
        const [endpointPath, existingQs] = cfg.endpoint.split("?");
        const qs = new URLSearchParams(existingQs ?? "");
        qs.set("compare", "true");
        qs.set("compareMode", "yoy");
        qs.set("from", from);
        qs.set("to", to);
        const payload = await fetchSalesCompareWithTimeout<SalesCompareResponse>(
          `${endpointPath}?${qs.toString()}`,
          t(cfg.errorKey),
          cfg.timeoutMs
        );
        // Phase 2 (success): data + finish in EINEM patch().
        const successPatch: Partial<LoaderState> = { data: payload };
        if (!silent) successPatch.loading = false;
        if (showBackgroundIndicator) successPatch.backgroundSyncing = false;
        patch(cfg.slug, successPatch);
        writeLocalJsonCache(cacheKey, { savedAt: Date.now(), ...payload });
      } catch (e) {
        if (silent) {
          console.warn(`[Analytics ${cfg.warnTag}] Hintergrund-Abgleich fehlgeschlagen:`, e);
          // Im silent-Mode nur den Background-Indikator zurücknehmen.
          if (showBackgroundIndicator) patch(cfg.slug, { backgroundSyncing: false });
        } else {
          // Phase 2 (error): error + finish in EINEM patch().
          const errorPatch: Partial<LoaderState> = {
            error: e instanceof Error ? e.message : t("commonUi.unknownError"),
            loading: false,
          };
          if (showBackgroundIndicator) errorPatch.backgroundSyncing = false;
          patch(cfg.slug, errorPatch);
        }
      } finally {
        if (cfg.useInFlightRef) amazonInFlightRef.current = false;
      }
    },
    [ebayEnabled, tiktokEnabled, periodRef, patch, t]
  );

  const reloaders = {} as Record<
    MarketplaceSlugKey,
    (forceRefresh?: boolean, silent?: boolean) => Promise<void>
  >;
  for (const cfg of CONFIGS) {
    reloaders[cfg.slug] = (forceRefresh = false, silent = false) => runLoad(cfg, forceRefresh, silent);
  }

  // Aggregator-Pfad für initial-mount + background-sync. Statt 9 separate
  // Cookie-bearing Round-Trips macht der Browser 1× /api/analytics/marketplace-overview,
  // serverseitig wird mit Concurrency 3 fanned-out (siehe route.ts).
  // Per-Marktplatz `runLoad`/`reloaders` bleiben für explizite Refreshes erhalten,
  // damit z. B. ein User einzelne Tile manuell neu laden kann ohne 8 andere zu treffen.
  const runAggregator = useCallback(
    async (silent: boolean) => {
      const { from, to } = periodRef.current;

      // Phase 1: für jede Konfig den Cache-Hit prüfen + sync-init-patch wie vorher.
      // (Disabled-Marktplätze werden im selben Lauf abgeschnitten.)
      const phase1Cached: Record<MarketplaceSlugKey, SalesCompareResponse | null> = {} as Record<
        MarketplaceSlugKey,
        SalesCompareResponse | null
      >;
      const phase1Show: Record<MarketplaceSlugKey, boolean> = {} as Record<MarketplaceSlugKey, boolean>;
      for (const cfg of CONFIGS) {
        const isDisabled =
          (cfg.slug === "ebay" && !ebayEnabled) || (cfg.slug === "tiktok" && !tiktokEnabled);
        if (isDisabled) {
          phase1Cached[cfg.slug] = null;
          phase1Show[cfg.slug] = false;
          patch(cfg.slug, {
            loading: false,
            backgroundSyncing: false,
            ...(silent ? {} : { error: cfg.disabledMessage ?? null }),
          });
          continue;
        }
        const cacheKey = `${cfg.storagePrefix}:${from}:${to}`;
        const cached = !silent
          ? readLocalJsonCache<{ savedAt: number } & SalesCompareResponse>(cacheKey)
          : null;
        const hadCache = !!(cached?.summary && !cached.error);
        const showBg = silent || hadCache;
        phase1Cached[cfg.slug] = hadCache ? cached : null;
        phase1Show[cfg.slug] = showBg;
        const phase1Patch: Partial<LoaderState> = {};
        if (hadCache) phase1Patch.data = cached;
        if (!silent) {
          phase1Patch.loading = !hadCache;
          phase1Patch.error = null;
        }
        if (showBg) phase1Patch.backgroundSyncing = true;
        if (Object.keys(phase1Patch).length > 0) patch(cfg.slug, phase1Patch);
      }

      // Phase 2: ein einziger Aggregator-Call.
      try {
        const qs = new URLSearchParams({
          fromYmd: from,
          toYmd: to,
          compare: "true",
          compareMode: "yoy",
        });
        const res = await fetch(`/api/analytics/marketplace-overview?${qs}`, {
          cache: "no-store",
          credentials: "include",
        });
        if (!res.ok) throw new Error(`Aggregator HTTP ${res.status}`);
        const payload = (await res.json()) as {
          marketplaces: Record<
            string,
            { status: "ok" | "error"; data?: SalesCompareResponse; error?: string }
          >;
        };

        // Aggregator nutzt Slug `mediamarkt-saturn`, der Loader intern `mms` — mappen.
        const slugMap: Record<MarketplaceSlugKey, string> = {
          amazon: "amazon",
          ebay: "ebay",
          otto: "otto",
          kaufland: "kaufland",
          fressnapf: "fressnapf",
          "fressnapf-at": "fressnapf-at",
          mms: "mediamarkt-saturn",
          zooplus: "zooplus",
          tiktok: "tiktok",
          shopify: "shopify",
        };

        for (const cfg of CONFIGS) {
          const isDisabled =
            (cfg.slug === "ebay" && !ebayEnabled) || (cfg.slug === "tiktok" && !tiktokEnabled);
          if (isDisabled) continue;
          const aggSlug = slugMap[cfg.slug];
          const result = payload.marketplaces?.[aggSlug];
          const cacheKey = `${cfg.storagePrefix}:${from}:${to}`;

          if (result?.status === "ok" && result.data) {
            const successPatch: Partial<LoaderState> = { data: result.data };
            if (!silent) successPatch.loading = false;
            if (phase1Show[cfg.slug]) successPatch.backgroundSyncing = false;
            if (!silent) successPatch.error = null;
            patch(cfg.slug, successPatch);
            writeLocalJsonCache(cacheKey, { savedAt: Date.now(), ...result.data });
          } else {
            const errMsg = result?.error ?? `Aggregator-Eintrag fehlt: ${aggSlug}`;
            if (silent) {
              console.warn(`[Analytics ${cfg.warnTag}] Hintergrund-Abgleich fehlgeschlagen:`, errMsg);
              if (phase1Show[cfg.slug]) patch(cfg.slug, { backgroundSyncing: false });
            } else {
              const errorPatch: Partial<LoaderState> = {
                error: t(cfg.errorKey),
                loading: false,
              };
              if (phase1Show[cfg.slug]) errorPatch.backgroundSyncing = false;
              patch(cfg.slug, errorPatch);
            }
          }
        }
      } catch (e) {
        // Aggregator komplett tot: alle aktiven Marktplätze auf Fehler setzen.
        const message = e instanceof Error ? e.message : t("commonUi.unknownError");
        for (const cfg of CONFIGS) {
          const isDisabled =
            (cfg.slug === "ebay" && !ebayEnabled) || (cfg.slug === "tiktok" && !tiktokEnabled);
          if (isDisabled) continue;
          if (silent) {
            console.warn(`[Analytics ${cfg.warnTag}] Aggregator-Hintergrund-Abgleich fehlgeschlagen:`, message);
            if (phase1Show[cfg.slug]) patch(cfg.slug, { backgroundSyncing: false });
          } else {
            const errorPatch: Partial<LoaderState> = { error: message, loading: false };
            if (phase1Show[cfg.slug]) errorPatch.backgroundSyncing = false;
            patch(cfg.slug, errorPatch);
          }
        }
      }
    },
    [ebayEnabled, tiktokEnabled, periodRef, patch, t]
  );

  const runAggregatorRef = useRef(runAggregator);
  runAggregatorRef.current = runAggregator;

  useEffect(() => {
    let cancelled = false;
    void runAggregatorRef.current(false).catch(() => {
      // Fehler wurden in runAggregator pro Slug behandelt.
    });
    return () => {
      cancelled = true;
      void cancelled;
    };
  }, [periodFrom, periodTo]);

  useEffect(() => {
    setAnalyticsHasMounted(true);
  }, []);

  useEffect(() => {
    if (!analyticsHasMounted) return;
    const id = window.setInterval(() => {
      if (!shouldRunBackgroundSync()) return;
      void runAggregatorRef.current(true).catch(() => {
        // surfaced per slug
      });
    }, DASHBOARD_CLIENT_BACKGROUND_SYNC_MS);
    return () => window.clearInterval(id);
  }, [analyticsHasMounted]);

  return { states, reloaders };
}
