"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { DataTable } from "@/shared/components/DataTable";
import { MarketplaceCacheRefreshButton } from "@/shared/components/MarketplaceCacheRefreshButton";
import { MarketplaceOrderIdLink } from "@/shared/components/MarketplaceOrderIdLink";
import {
  DASHBOARD_COMPACT_CARD,
  DASHBOARD_PAGE_SHELL,
  DASHBOARD_PAGE_TITLE,
} from "@/shared/lib/dashboardUi";
import {
  DASHBOARD_CLIENT_BACKGROUND_SYNC_MS,
  readLocalJsonCache,
  shouldRunBackgroundSync,
  writeLocalJsonCache,
} from "@/shared/lib/dashboardClientCache";
import { useTranslation } from "@/i18n/I18nProvider";
import { intlLocaleTag } from "@/i18n/locale-formatting";
import {
  filterMarketplaceOrdersByYmdRange,
  mergeMarketplaceOrderLists,
} from "@/shared/lib/marketplaceOrdersClientMerge";
import { toDateInputValue } from "@/shared/lib/orderDateParams";
import { useStableTableRowsDuringFetch } from "@/shared/lib/useStableTableRowsDuringFetch";
import type { MarketplaceIntegrationRefreshResource } from "@/shared/lib/marketplaceIntegrationCacheRefreshClient";

/**
 * Generischer Orders-View für die 8 Operator-Orders-Pages (otto/fressnapf/kaufland/
 * zooplus/mediamarkt-saturn/shopify/ebay/tiktok). Ersetzt ~3000 LOC Copy-Paste
 * durch eine Komponente + 8 dünne Page-Shells mit Config-Object.
 *
 * Pattern: Variation-Points sind exakt:
 *   - Branding (Logo + Label + i18n-Namespace)
 *   - LS-Cache-Key + API-Pfad
 *   - Status-Keyword-Mapping (welche Substrings → "completed"/"pending"/"cancelled")
 * Alles andere (Cache-First-Load, Background-Sync, Date-Range-Filter, Summary-
 * Pills, Tabelle, Error-States) ist 1:1 identisch über alle 8 Pages gewesen.
 */

export type MarketplaceOrderRow = {
  orderId: string;
  orderUrl?: string;
  purchaseDate: string;
  amount: number;
  currency: string;
  units: number;
  statusRaw: string;
};

type OrdersResponse = {
  items?: MarketplaceOrderRow[];
  error?: string;
  missingKeys?: string[];
};

type CachedOrdersPayload = {
  savedAt: number;
  items: MarketplaceOrderRow[];
};

export type MarketplaceOrdersConfig = {
  /** Wert für `MarketplaceCacheRefreshButton.marketplace` + Logging-Tag. */
  slug: string;
  /** localStorage-Key für akkumulierte Bestellungen. */
  lsKey: string;
  /** API-Endpoint, z. B. `/api/otto/orders`. */
  apiPath: string;
  /**
   * Zusätzliche statische Query-Params, die jedem Fetch beiliegen
   * (z. B. `{ country: "at" }` für Fressnapf-AT, das den DE-API-Endpoint
   * mit channel-Filter weiterverwendet).
   */
  apiQueryParams?: Record<string, string>;
  /** i18n-Namespace ohne Punkt, z. B. `"ottoOrders"`. */
  i18nNs: string;
  /** Anzeige-Name für `MarketplaceOrderIdLink`, z. B. `"Otto"`. */
  marketplaceLabel: string;
  /** i18n-Key für Page-Titel, z. B. `"nav.ottoOrders"`. */
  pageTitleKey: string;
  /** i18n-Key für Loading-Text-Marketplace-Variable, z. B. `"nav.otto"`. */
  loadingMarketplaceKey: string;
  /** i18n-Key für DataTable-Filter-Placeholder, z. B. `"filters.ottoOrders"`. */
  filterKey: string;
  /** Console-Warn-Tag, z. B. `"Otto Bestellungen"`. */
  warnTag: string;
  /** Resource-Slug für Cache-Refresh-Button (i. d. R. `"orders"`). */
  resource?: MarketplaceIntegrationRefreshResource;
  /**
   * Status-Keyword-Mapping. Match-Logik: lowercase-substring-includes.
   * Reihenfolge: cancelled hat Vorrang vor completed vor pending; sonst raw.
   */
  statusKeywords: {
    cancelled: string[];
    completed: string[];
    pending: string[];
  };
  logo: {
    /** SVG-Pfad (lokal `/brand/...`) oder externe URL (z. B. Wikimedia). */
    src: string;
    /** i18n-Key für `alt`, z. B. `"nav.otto"`. */
    altKey: string;
    /** Frame-Class auf dem `<span>`-Wrapper. */
    frameClass: string;
    /** Class auf dem inneren Image/Img. */
    imageClass: string;
    /** `true` → Next/Image (lokal), `false` → plain `<img>` (externe URL ohne Optimierung). */
    useNextImage: boolean;
    /** Optional: Next/Image `sizes`-Attribut. */
    sizes?: string;
  };
};

function statusVariantFromRaw(
  raw: string,
  keywords: MarketplaceOrdersConfig["statusKeywords"]
): "default" | "secondary" | "outline" | "destructive" {
  const n = raw.trim().toLowerCase();
  if (keywords.cancelled.some((kw) => n.includes(kw))) return "destructive";
  if (keywords.completed.some((kw) => n.includes(kw))) return "default";
  if (keywords.pending.some((kw) => n.includes(kw))) return "secondary";
  return "outline";
}

export function MarketplaceOrdersView({ config }: { config: MarketplaceOrdersConfig }) {
  const { t, locale } = useTranslation();
  const intlTag = intlLocaleTag(locale);
  const { i18nNs, lsKey, apiPath, statusKeywords, marketplaceLabel } = config;

  const labelForStatus = useCallback(
    (raw: string) => {
      const n = raw.trim().toLowerCase();
      if (!n) return t(`${i18nNs}.statusUnknown`);
      if (statusKeywords.cancelled.some((kw) => n.includes(kw))) {
        return t(`${i18nNs}.statusCancelled`);
      }
      if (statusKeywords.completed.some((kw) => n.includes(kw))) {
        return t(`${i18nNs}.statusCompleted`);
      }
      if (statusKeywords.pending.some((kw) => n.includes(kw))) {
        return t(`${i18nNs}.statusPending`);
      }
      return raw;
    },
    [t, i18nNs, statusKeywords]
  );

  const formatDateTime = useCallback(
    (value: string) => {
      if (!value) return "—";
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return "—";
      return new Intl.DateTimeFormat(intlTag, { dateStyle: "short", timeStyle: "short" }).format(date);
    },
    [intlTag]
  );

  const formatAmount = useCallback(
    (amount: number, currency: string) =>
      new Intl.NumberFormat(intlTag, {
        style: "currency",
        currency: currency || "EUR",
      }).format(amount || 0),
    [intlTag]
  );

  const now = new Date();
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);

  const [from, setFrom] = useState<string>(toDateInputValue(yesterday));
  const [to, setTo] = useState<string>(toDateInputValue(now));
  const [allRows, setAllRows] = useState<MarketplaceOrderRow[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isBackgroundSyncing, setIsBackgroundSyncing] = useState(false);
  const [error, setError] = useState<{ message: string; missingKeys?: string[] } | null>(null);
  const [hasMounted, setHasMounted] = useState(false);
  const fromRef = useRef(from);
  const toRef = useRef(to);
  const allRowsRef = useRef<MarketplaceOrderRow[]>([]);

  useEffect(() => {
    fromRef.current = from;
    toRef.current = to;
  }, [from, to]);

  useEffect(() => {
    allRowsRef.current = allRows;
  }, [allRows]);

  const displayedRows = useMemo(
    () => filterMarketplaceOrdersByYmdRange(allRows, from, to),
    [allRows, from, to]
  );

  const tableRows = useStableTableRowsDuringFetch({
    rows: displayedRows,
    isFetchActive: isLoading || isBackgroundSyncing,
  });

  const summary = useMemo(() => {
    const orders = tableRows.length;
    const units = tableRows.reduce((sum, row) => sum + (row.units ?? 0), 0);
    const amount = tableRows.reduce((sum, row) => sum + (row.amount ?? 0), 0);
    const currency = tableRows[0]?.currency || "EUR";
    return { orders, units, amount, currency };
  }, [tableRows]);

  const columns = useMemo<Array<ColumnDef<MarketplaceOrderRow>>>(
    () => [
      {
        accessorKey: "orderId",
        header: t(`${i18nNs}.orderId`),
        cell: ({ row }) => (
          <MarketplaceOrderIdLink
            marketplace={marketplaceLabel}
            internetNumber={row.original.orderId}
            href={row.original.orderUrl}
          />
        ),
      },
      {
        accessorKey: "purchaseDate",
        header: t(`${i18nNs}.purchaseDate`),
        cell: ({ row }) => (
          <span className="text-muted-foreground">{formatDateTime(row.original.purchaseDate)}</span>
        ),
      },
      {
        accessorKey: "units",
        meta: { align: "center" },
        header: () => <div className="block w-full text-center">{t(`${i18nNs}.units`)}</div>,
        cell: ({ row }) => (
          <div className="block w-full text-center tabular-nums text-foreground">
            {row.original.units}
          </div>
        ),
      },
      {
        accessorKey: "statusRaw",
        header: t(`${i18nNs}.status`),
        cell: ({ row }) => (
          <Badge variant={statusVariantFromRaw(row.original.statusRaw, statusKeywords)}>
            {labelForStatus(row.original.statusRaw)}
          </Badge>
        ),
      },
      {
        accessorKey: "amount",
        meta: { align: "right" },
        header: () => <div className="block w-full text-right">{t(`${i18nNs}.total`)}</div>,
        cell: ({ row }) => (
          <div className="block w-full text-right tabular-nums">
            {formatAmount(row.original.amount, row.original.currency)}
          </div>
        ),
      },
    ],
    [t, i18nNs, marketplaceLabel, statusKeywords, formatDateTime, formatAmount, labelForStatus]
  );

  const loadOrders = useCallback(
    async (nextFrom?: string, nextTo?: string, forceRefresh = false, silent = false) => {
      const f = nextFrom ?? fromRef.current;
      const rangeTo = nextTo ?? toRef.current;
      let hadCache = false;

      if (!forceRefresh && !silent) {
        const parsed = readLocalJsonCache<CachedOrdersPayload>(lsKey);
        if (parsed && Array.isArray(parsed.items) && parsed.items.length > 0) {
          setAllRows(parsed.items);
          hadCache = true;
          setIsLoading(false);
        }
      }

      const hasAnyRows = hadCache || allRowsRef.current.length > 0;
      if (forceRefresh && !silent && !hasAnyRows) {
        setIsLoading(true);
      } else if (!hasAnyRows && !silent) {
        setIsLoading(true);
      } else if (!silent) {
        setIsLoading(false);
      }

      const showBackgroundIndicator = silent || hasAnyRows;
      if (showBackgroundIndicator) setIsBackgroundSyncing(true);
      if (!silent) setError(null);

      try {
        const search = new URLSearchParams();
        if (f) search.set("from", f);
        if (rangeTo) search.set("to", rangeTo);
        if (forceRefresh) search.set("refresh", "1");
        if (config.apiQueryParams) {
          for (const [k, v] of Object.entries(config.apiQueryParams)) {
            search.set(k, v);
          }
        }
        const res = await fetch(`${apiPath}?${search.toString()}`, { cache: "no-store" });
        const payload = (await res.json()) as OrdersResponse;
        if (!res.ok) {
          const message = payload.error ?? t(`${i18nNs}.loadFailed`);
          setError({ message, missingKeys: payload.missingKeys });
          return;
        }
        const fresh = payload.items ?? [];
        setAllRows((prev) => {
          const merged = mergeMarketplaceOrderLists(prev, fresh);
          writeLocalJsonCache(lsKey, {
            savedAt: Date.now(),
            items: merged,
          } satisfies CachedOrdersPayload);
          return merged;
        });
      } catch (e) {
        if (silent) {
          console.warn(`[${config.warnTag}] Hintergrund-Abgleich fehlgeschlagen:`, e);
        } else {
          setError({ message: e instanceof Error ? e.message : t("commonUi.unknownError") });
        }
      } finally {
        if (!silent) setIsLoading(false);
        if (showBackgroundIndicator) setIsBackgroundSyncing(false);
      }
    },
    [lsKey, apiPath, i18nNs, t, config.warnTag, config.apiQueryParams]
  );

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (!from || !to || from > to) return;
    void loadOrders(from, to, false, false);
  }, [from, to, loadOrders]);

  useEffect(() => {
    if (!hasMounted) return;
    const id = window.setInterval(() => {
      if (!shouldRunBackgroundSync()) return;
      void loadOrders(undefined, undefined, false, true);
    }, DASHBOARD_CLIENT_BACKGROUND_SYNC_MS);
    return () => window.clearInterval(id);
  }, [hasMounted, loadOrders]);

  const logoEl = config.logo.useNextImage ? (
    <Image
      src={config.logo.src}
      alt={t(config.logo.altKey)}
      fill
      className={config.logo.imageClass}
      sizes={config.logo.sizes ?? "120px"}
      priority
    />
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={config.logo.src}
      alt={t(config.logo.altKey)}
      className={config.logo.imageClass}
    />
  );

  return (
    <div className={DASHBOARD_PAGE_SHELL}>
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <span className={config.logo.frameClass}>{logoEl}</span>
          <span className={cn(DASHBOARD_PAGE_TITLE, "text-muted-foreground")}>
            {t(config.pageTitleKey)}
          </span>
        </div>
      </div>

      <div className={cn(DASHBOARD_COMPACT_CARD, "flex-row flex-wrap items-center justify-between gap-3")}>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="rounded-md border border-border/60 bg-background/80 px-2.5 py-1">
            {t(`${i18nNs}.totalUnits`, { count: summary.units })}
          </span>
          <span className="rounded-md border border-border/60 bg-background/80 px-2.5 py-1">
            {t(`${i18nNs}.sumLabel`, { amount: formatAmount(summary.amount, summary.currency) })}
          </span>
          <span className="rounded-md border border-border/60 bg-background/80 px-2.5 py-1">
            {t(`${i18nNs}.ordersCount`, { count: summary.orders })}
          </span>
          {isBackgroundSyncing ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              {t(`${i18nNs}.syncing`)}
            </span>
          ) : null}
        </div>

        <div className="ml-auto flex flex-wrap items-end justify-end gap-2">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">{t("dates.from")}</p>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">{t("dates.to")}</p>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="flex items-end pb-0.5">
            <MarketplaceCacheRefreshButton
              marketplace={config.slug}
              resource={config.resource ?? "orders"}
              fromYmd={from}
              toYmd={to}
              disabled={!from || !to || from > to}
              onAfterSuccess={() => loadOrders(fromRef.current, toRef.current, false, false)}
            />
          </div>
        </div>
      </div>

      {error ? (
        <div className="space-y-2 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-700">
          <p className="font-medium">{error.message}</p>
          {error.missingKeys && error.missingKeys.length > 0 ? (
            <p className="font-mono text-xs text-red-800/90">
              {t(`${i18nNs}.missingEnvVars`, { keys: error.missingKeys.join(", ") })}
            </p>
          ) : null}
        </div>
      ) : null}

      {isLoading && tableRows.length === 0 && allRows.length === 0 ? (
        <div className="rounded-xl border border-border/50 bg-card/80 p-4 text-sm text-muted-foreground">
          {t("ordersShared.loading", { marketplace: t(config.loadingMarketplaceKey) })}
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={tableRows}
          getRowId={(row) => row.orderId}
          filterColumn={t(config.filterKey)}
          paginate={false}
          compact
          className="flex-1 min-h-0"
          tableWrapClassName="min-h-0"
        />
      )}
    </div>
  );
}
