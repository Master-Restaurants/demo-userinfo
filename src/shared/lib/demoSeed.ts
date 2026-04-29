/**
 * Demo-Mode Seed-Daten und Helper.
 *
 * Verwendung in API-Routen:
 *   if (isDemoMode()) return demoResponse("amazon/orders");
 *
 * Reversibel: Sobald `NEXT_PUBLIC_DEMO_MODE` ausgeschaltet ist, läuft die Original-Logik wieder.
 */

import { NextResponse } from "next/server";

/** Marktplätze die wir mit synthetischen Daten füllen. */
export const DEMO_MARKETPLACES = [
  "amazon",
  "ebay",
  "otto",
  "kaufland",
  "fressnapf",
  "mediamarkt-saturn",
  "zooplus",
  "shopify",
  "tiktok",
] as const;

export type DemoMarketplaceSlug = (typeof DEMO_MARKETPLACES)[number];

function hashString(str: string): number {
  // FNV-1a 32-bit — gute Verteilung selbst bei minimalen String-Unterschieden.
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function seededRandom(key: string): number {
  // Deterministisch pro Key: Hash → uint32 → [0,1).
  // Idempotent (mehrfache Aufrufe mit gleichem Key liefern gleichen Wert),
  // aber jeder Key ist unabhängig.
  return hashString(key) / 0x100000000;
}

function chooseDeterministic<T>(key: string, list: readonly T[]): T {
  return list[Math.floor(seededRandom(key) * list.length) % list.length] as T;
}

const DEMO_PRODUCTS = [
  { sku: "PETR-CAT-DRY-2KG", name: "Petrhein Premium Trockenfutter Katze 2kg", priceEur: 19.95 },
  { sku: "PETR-DOG-WET-400G", name: "Petrhein Saftiges Nassfutter Hund 400g", priceEur: 3.49 },
  { sku: "ASTR-BIRD-SEED-1KG", name: "AstroPet Wildvogel-Sortiment 1kg", priceEur: 7.99 },
  { sku: "PETR-FISH-FLAKES-100G", name: "Petrhein Aquarienflocken 100g", priceEur: 5.49 },
  { sku: "ASTR-RABBIT-HAY-2KG", name: "AstroPet Bio-Wiesenheu 2kg", priceEur: 8.99 },
  { sku: "PETR-CAT-LITTER-10L", name: "Petrhein Klumpstreu 10L", priceEur: 14.99 },
  { sku: "PETR-DOG-CHEW-LARGE", name: "Petrhein Naturkauknochen XL", priceEur: 9.99 },
  { sku: "ASTR-HAMSTER-MIX-500G", name: "AstroPet Hamster-Spezialmischung 500g", priceEur: 4.49 },
  { sku: "PETR-CAT-TREE-120CM", name: "Petrhein Kratzbaum 120cm", priceEur: 89.99 },
  { sku: "ASTR-DOG-LEASH-2M", name: "AstroPet Premium-Leine 2m", priceEur: 24.99 },
  { sku: "PETR-FISH-FILTER-400L", name: "Petrhein Aquarienfilter 400L", priceEur: 49.99 },
  { sku: "PETR-CAT-WET-85G", name: "Petrhein Sterilized Adult 85g", priceEur: 1.29 },
] as const;

const DEMO_CUSTOMER_NAMES = [
  "Anna Müller", "Max Schmidt", "Lisa Weber", "Tobias Becker", "Sarah Fischer",
  "Daniel Klein", "Julia Wagner", "Florian Hoffmann", "Marlene Schulz", "Felix Bauer",
  "Sophia Richter", "Lukas Wolf", "Hannah König", "Niklas Neumann", "Mia Frank",
];

const DEMO_CITIES = [
  "Berlin", "München", "Hamburg", "Köln", "Frankfurt", "Stuttgart", "Düsseldorf",
  "Leipzig", "Dortmund", "Essen", "Bremen", "Dresden", "Hannover", "Nürnberg",
];

const ORDER_STATUSES = ["pending", "shipped", "delivered", "cancelled"] as const;

/** Generiert eine deterministische Liste von Bestellungen für einen Marktplatz. */
function generateOrders(marketplace: DemoMarketplaceSlug, count = 250) {
  const orders: Array<Record<string, unknown>> = [];
  const today = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  // Marktplatz-spezifische Status-Strings (Amazon nutzt "Shipped"/"Unshipped" etc.)
  const STATUSES_BY_MARKETPLACE: Record<string, readonly string[]> = {
    amazon: ["Shipped", "Unshipped", "Pending", "Canceled"],
    ebay: ["Shipped", "Pending", "Cancelled"],
    otto: ["shipped", "pending", "cancelled"],
    kaufland: ["SHIPPED", "PENDING", "CANCELLED"],
    fressnapf: ["SHIPPED", "PENDING", "CANCELLED"],
    "mediamarkt-saturn": ["SHIPPED", "PENDING", "CANCELLED"],
    zooplus: ["SHIPPED", "PENDING", "CANCELLED"],
    shopify: ["fulfilled", "unfulfilled", "cancelled"],
    tiktok: ["SHIPPING", "PROCESSING", "CANCELLED"],
  };
  const statuses = STATUSES_BY_MARKETPLACE[marketplace] ?? ORDER_STATUSES;

  for (let i = 0; i < count; i++) {
    const key = `${marketplace}-order-${i}`;
    const productIdx = Math.floor(seededRandom(key + "p") * DEMO_PRODUCTS.length);
    const product = DEMO_PRODUCTS[productIdx]!;
    const qty = 1 + Math.floor(seededRandom(key + "q") * 4);
    const customer = chooseDeterministic(key + "c", DEMO_CUSTOMER_NAMES);
    const city = chooseDeterministic(key + "ci", DEMO_CITIES);
    const status = chooseDeterministic(key + "s", statuses);
    // Verteile Bestellungen über 90 Tage, mit Schwerpunkt auf den letzten 14 Tagen.
    // Hour-Granularität sorgt für Variation innerhalb eines Tages.
    const recencyBoost = seededRandom(key + "rb");
    const daysAgo = recencyBoost < 0.5
      ? recencyBoost * 28 // 50% in den letzten 14 Tagen
      : 14 + (recencyBoost - 0.5) * 152; // andere 50% verteilt über die restlichen 76 Tage
    const hoursOffset = seededRandom(key + "h") * 24;
    const orderDate = new Date(today - daysAgo * dayMs - hoursOffset * 60 * 60 * 1000).toISOString();
    const total = +(product.priceEur * qty * (1 + seededRandom(key + "t") * 0.05)).toFixed(2);
    const fulfillment = seededRandom(key + "f") > 0.4 ? "FBA" : "FBM";
    const orderIdNum = 100000 + i;
    const orderId =
      marketplace === "amazon"
        ? `${String(303 - (i % 200))}-${String(1000000 + i).padStart(7, "0")}-${String(2000000 + i).padStart(7, "0")}`
        : `${marketplace.toUpperCase()}-${orderIdNum}`;

    orders.push({
      // Master fields
      id: `${marketplace}-${1000 + i}`,
      orderId,
      orderNumber: orderId,
      AmazonOrderId: orderId, // Amazon-spezifisch
      marketplace,
      // Datums-Felder in mehreren Schreibweisen (verschiedene Frontends)
      orderDate,
      purchaseDate: orderDate,
      PurchaseDate: orderDate,
      createdAt: orderDate,
      LastUpdateDate: orderDate,
      // Status (mehrfach für Kompatibilität)
      status,
      OrderStatus: status,
      statusRaw: status,
      // Customer / Shipping
      customerName: customer,
      shippingCity: city,
      shippingCountry: "DE",
      ShippingAddress: { City: city, CountryCode: "DE", Name: customer },
      BuyerInfo: { BuyerEmail: `${customer.split(" ")[0]?.toLowerCase()}@example.com`, BuyerName: customer },
      // Beträge (mehrfach)
      currency: "EUR",
      amount: total,
      totalAmount: total,
      total,
      OrderTotal: { Amount: String(total), CurrencyCode: "EUR" },
      // Fulfillment / Channel
      fulfillment,
      FulfillmentChannel: fulfillment === "FBA" ? "AFN" : "MFN",
      SalesChannel: marketplace === "amazon" ? "Amazon.de" : marketplace,
      // Items
      items: [
        {
          sku: product.sku,
          name: product.name,
          title: product.name,
          quantity: qty,
          unitPrice: product.priceEur,
          totalPrice: total,
        },
      ],
      lineItems: [
        {
          sku: product.sku,
          name: product.name,
          quantity: qty,
          price: product.priceEur,
        },
      ],
      itemCount: qty,
      NumberOfItemsShipped: status.toLowerCase().includes("ship") ? qty : 0,
      NumberOfItemsUnshipped: status.toLowerCase().includes("ship") ? 0 : qty,
      paymentStatus: status.toLowerCase().includes("cancel") ? "refunded" : "paid",
    });
  }

  // Nach Datum absteigend sortieren (neueste zuerst)
  orders.sort((a, b) => String(b.orderDate).localeCompare(String(a.orderDate)));
  return orders;
}

/** Generiert deterministische SalesPoint-Serien für einen Marktplatz (last N days). */
function generateSalesPerDay(marketplace: DemoMarketplaceSlug, days = 90, offsetDays = 0) {
  const points: Array<{ date: string; orders: number; amount: number; units: number }> = [];
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const dayMs = 24 * 60 * 60 * 1000;
  // Marktplatz-spezifischer Multiplikator (Amazon ist groß, TikTok klein)
  const multipliers: Record<string, number> = {
    amazon: 4.5, ebay: 1.2, otto: 1.8, kaufland: 1.3, fressnapf: 0.9,
    "mediamarkt-saturn": 0.7, zooplus: 1.6, shopify: 0.6, tiktok: 0.4,
  };
  const mult = multipliers[marketplace] ?? 1;

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today.getTime() - (i + offsetDays) * dayMs).toISOString().slice(0, 10);
    const key = `${marketplace}-sales-${date}`;
    const orders = Math.floor((20 + seededRandom(key + "o") * 40) * mult);
    const avgValue = 25 + seededRandom(key + "v") * 30;
    const amount = +(orders * avgValue).toFixed(2);
    const unitsPerOrder = 1 + seededRandom(key + "u") * 1.4;
    const units = Math.floor(orders * unitsPerOrder);
    points.push({ date, orders, amount, units });
  }

  return points;
}

function summarizePoints(points: Array<{ orders: number; amount: number; units: number }>) {
  return points.reduce(
    (acc, p) => ({
      orderCount: acc.orderCount + p.orders,
      salesAmount: +(acc.salesAmount + p.amount).toFixed(2),
      units: acc.units + p.units,
    }),
    { orderCount: 0, salesAmount: 0, units: 0 }
  );
}

function generateProducts(marketplace: DemoMarketplaceSlug) {
  return DEMO_PRODUCTS.map((p, i) => {
    const key = `${marketplace}-prod-${i}`;
    const stock = Math.floor(seededRandom(key + "st") * 200);
    const sales30d = Math.floor(seededRandom(key + "sl") * 80);
    const isActive = seededRandom(key + "a") > 0.15;
    const asin = `B0${String(i).padStart(8, "0").toUpperCase()}`;
    const ean = `40${String(10000000 + i).slice(0, 10)}`;
    const secondaryId = marketplace === "amazon" ? asin : ean;
    return {
      // Kernfelder für MarketplaceProductListRow
      sku: p.sku,
      secondaryId,
      title: p.name,
      statusLabel: isActive ? "Aktiv" : "Inaktiv",
      isActive,
      priceEur: p.priceEur,
      stockQty: stock,
      extras: {
        stockStatus: stock > 20 ? "in_stock" : stock > 0 ? "low_stock" : "out_of_stock",
        sales30d,
        url: `https://example.com/${marketplace}/${p.sku.toLowerCase()}`,
        lastSyncAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      },
      // Zusatzfelder (für andere consumer der Daten)
      id: `${marketplace}-${p.sku}`,
      asin: marketplace === "amazon" ? asin : null,
      ean,
      name: p.name,
      price: p.priceEur,
      currency: "EUR",
      stock,
      stockStatus: stock > 20 ? "in_stock" : stock > 0 ? "low_stock" : "out_of_stock",
      marketplace,
      url: `https://example.com/${marketplace}/${p.sku.toLowerCase()}`,
      sales30d,
      lastSyncAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    };
  });
}

/** Public API: Bestellungen pro Marktplatz */
export function demoOrdersPayload(marketplace: DemoMarketplaceSlug) {
  const items = generateOrders(marketplace);
  const fromYmd = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const toYmd = new Date().toISOString().slice(0, 10);
  return {
    // Felder in mehreren Schreibweisen für unterschiedliche Frontends
    items,
    orders: items,
    totalCount: items.length,
    meta: {
      from: fromYmd,
      to: toYmd,
      fromYmd,
      toYmd,
      marketplaces: ["A1PA6795UKMFR9"], // Amazon DE
      cacheState: "fresh",
      cacheUpdatedAt: new Date().toISOString(),
      demo: true,
    },
    metadata: {
      marketplace,
      from: fromYmd,
      to: toYmd,
      totalOrders: items.length,
      cacheState: "fresh",
      demo: true,
    },
  };
}

/** Public API: Produkte pro Marktplatz */
export function demoProductsPayload(marketplace: DemoMarketplaceSlug) {
  const items = generateProducts(marketplace);
  return {
    items,
    products: items, // einige Routen nutzen `products`-key
    totalCount: items.length,
    metadata: {
      marketplace,
      totalProducts: items.length,
      cacheState: "fresh",
      demo: true,
    },
  };
}

/** Public API: Sales pro Marktplatz — Schema = SalesCompareResponse */
export function demoSalesPayload(marketplace: DemoMarketplaceSlug, days = 90) {
  const points = generateSalesPerDay(marketplace, days, 0);
  const previousPoints = generateSalesPerDay(marketplace, days, days); // Vorperiode (year-on-year approximation)

  const summary = summarizePoints(points);
  const previousSummary = summarizePoints(previousPoints);
  const fbaShare = marketplace === "amazon" ? 0.6 : 0;
  const revenueDeltaPct =
    previousSummary.salesAmount > 0
      ? +(((summary.salesAmount - previousSummary.salesAmount) / previousSummary.salesAmount) * 100).toFixed(1)
      : null;

  // Marktplatz-spezifische Fee-%
  const feePctMap: Record<string, number> = {
    amazon: 15, ebay: 10, otto: 13, kaufland: 13, fressnapf: 10,
    "mediamarkt-saturn": 12, zooplus: 11, shopify: 2.5, tiktok: 8,
  };
  const feePct = feePctMap[marketplace] ?? 12;
  const buildBreakdown = (s: { salesAmount: number; orderCount: number }) => {
    const returnedAmount = +(s.salesAmount * 0.04).toFixed(2);
    const cancelledAmount = +(s.salesAmount * 0.02).toFixed(2);
    const returnsAmount = +(s.salesAmount * 0.06).toFixed(2);
    const feesAmount = +(s.salesAmount * (feePct / 100)).toFixed(2);
    const adSpendAmount = +(s.salesAmount * 0.05).toFixed(2);
    const netAmount = +(s.salesAmount - returnsAmount - cancelledAmount - feesAmount - adSpendAmount).toFixed(2);
    return {
      returnedAmount,
      cancelledAmount,
      returnsAmount,
      feesAmount,
      adSpendAmount,
      netAmount,
      feeSource: "configured_percentage" as const,
      returnsSource: "status_based" as const,
      costCoverage: "estimated" as const,
    };
  };

  return {
    summary: {
      orderCount: summary.orderCount,
      salesAmount: summary.salesAmount,
      units: summary.units,
      currency: "EUR",
      ...(fbaShare > 0 ? { fbaUnits: Math.floor(summary.units * fbaShare) } : {}),
    },
    previousSummary: {
      orderCount: previousSummary.orderCount,
      salesAmount: previousSummary.salesAmount,
      units: previousSummary.units,
      currency: "EUR",
      ...(fbaShare > 0 ? { fbaUnits: Math.floor(previousSummary.units * fbaShare) } : {}),
    },
    revenueDeltaPct,
    netBreakdown: buildBreakdown(summary),
    previousNetBreakdown: buildBreakdown(previousSummary),
    points,
    previousPoints,
  };
}

/** Public API: Marketplace-Overview (Aggregat über alle Marktplätze) */
export function demoMarketplaceOverviewPayload() {
  const result: Record<string, unknown> = {};
  for (const mp of DEMO_MARKETPLACES) {
    const sales = demoSalesPayload(mp);
    result[mp] = {
      status: "ok",
      data: sales,
      durationMs: 12 + Math.floor(seededRandom(`${mp}-dur`) * 50),
    };
  }
  return {
    marketplaces: result,
    metadata: { demo: true, generatedAt: new Date().toISOString() },
  };
}

/** Public API: Xentral-Bestellungen */
export function demoXentralOrdersPayload() {
  /**
   * Wichtig: das Konsumenten-Hook (`useXentralOrdersLoader`) und
   * `sortAddressDialogOrders` rufen `documentNumber.localeCompare` auf —
   * also MUSS jedes Item das vollständige `XentralOrderRow`-Shape liefern,
   * nicht nur Marketplace-Order-Felder.
   */
  type XentralRow = {
    id: string;
    documentNumber: string;
    orderDate: string | null;
    customer: string;
    marketplace: string;
    total: number | null;
    currency: string | null;
    addressValidation: "valid" | "missing" | "invalid";
    addressValidationIssues: string[];
    addressEdited: boolean;
    addressPrimaryFields: Record<string, string>;
    internetNumber: string;
  };

  const rows: XentralRow[] = [];
  let i = 0;
  for (const mp of DEMO_MARKETPLACES) {
    const orders = generateOrders(mp, 8);
    for (const order of orders) {
      const id = `xen-${mp}-${1000 + i}`;
      const docNum = `AB-${(20000 + i).toString().padStart(6, "0")}`;
      const internetNum = String(order.orderId ?? `${mp.toUpperCase()}-${100000 + i}`);
      const customer = String(order.customerName ?? "Demo Kunde");
      const city = String(order.shippingCity ?? "Berlin");
      const street = chooseDeterministic(`${mp}-st-${i}`, [
        "Hauptstraße", "Bahnhofstraße", "Schulstraße", "Gartenstraße", "Berliner Straße",
        "Lindenweg", "Kirchplatz", "Marktplatz", "Am Ring", "Friedrichstraße",
      ]);
      const houseNumber = String(1 + Math.floor(seededRandom(`hn-${i}`) * 99));
      const zip = String(10000 + Math.floor(seededRandom(`zip-${i}`) * 90000));
      const total = typeof order.total === "number" ? (order.total as number) : null;
      const validRoll = seededRandom(`val-${i}`);
      const addressValidation: XentralRow["addressValidation"] =
        validRoll > 0.92 ? "invalid" : validRoll > 0.85 ? "missing" : "valid";
      const issues: string[] =
        addressValidation === "invalid"
          ? ["Hausnummer fehlt"]
          : addressValidation === "missing"
            ? ["PLZ ungeklärt"]
            : [];

      rows.push({
        id,
        documentNumber: docNum,
        orderDate: typeof order.orderDate === "string" ? (order.orderDate as string) : null,
        customer,
        marketplace: mp,
        total,
        currency: "EUR",
        addressValidation,
        addressValidationIssues: issues,
        addressEdited: seededRandom(`edited-${i}`) > 0.9,
        addressPrimaryFields: {
          name: customer,
          street,
          houseNumber,
          zip,
          city,
          country: "DE",
          countryCode: "DE",
        },
        internetNumber: internetNum,
      });
      i += 1;
    }
  }

  // Sortieren nach orderDate absteigend (null zuletzt)
  rows.sort((a, b) => {
    const da = a.orderDate ?? "";
    const db = b.orderDate ?? "";
    return db.localeCompare(da);
  });

  return {
    items: rows,
    totalCount: rows.length,
    meta: {
      mode: "all" as const,
      sortField: "none",
      order: "desc",
      fetched: rows.length,
      cappedAt: 50_000,
      xentralOrderWebBase: null,
      xentralSalesOrderWebPath: "/sales-orders",
      demo: true,
    },
  };
}

/** Public API: Xentral-Produkte */
export function demoXentralProductsPayload() {
  const items = DEMO_PRODUCTS.map((p, i) => ({
    id: `xen-${i}`,
    xentralId: 1000 + i,
    sku: p.sku,
    name: p.name,
    title: p.name,
    ean: `40${String(10000000 + i).slice(0, 10)}`,
    price: p.priceEur,
    currency: "EUR",
    stock: Math.floor(seededRandom(`xen-stock-${i}`) * 500),
    weight: +(0.1 + seededRandom(`xen-w-${i}`) * 5).toFixed(2),
    weightUnit: "kg",
    tags: i % 3 === 0 ? ["bestseller"] : i % 3 === 1 ? ["winter"] : [],
    lastSyncAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  }));
  return {
    items,
    products: items,
    metadata: { totalProducts: items.length, cacheState: "fresh", demo: true },
  };
}

/** Public API: Article-Forecast (Bedarfsprognose) */
export function demoArticleForecastPayload() {
  const articles = DEMO_PRODUCTS.map((p, i) => {
    const stock = Math.floor(seededRandom(`fc-stock-${i}`) * 300);
    const dailySales = +(0.5 + seededRandom(`fc-ds-${i}`) * 6).toFixed(2);
    const daysUntilOOS = dailySales > 0 ? Math.floor(stock / dailySales) : 999;
    const incoming = i % 3 === 0 ? Math.floor(seededRandom(`fc-in-${i}`) * 200) : 0;
    return {
      sku: p.sku,
      name: p.name,
      currentStock: stock,
      dailyAverageSales: dailySales,
      daysUntilOutOfStock: daysUntilOOS,
      reorderRecommended: daysUntilOOS < 14,
      incomingQuantity: incoming,
      incomingArrivalDate: incoming > 0
        ? new Date(Date.now() + (5 + i) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
        : null,
      severity: daysUntilOOS < 7 ? "critical" : daysUntilOOS < 21 ? "warning" : "ok",
    };
  });
  return {
    articles,
    items: articles,
    metadata: { generatedAt: new Date().toISOString(), demo: true },
  };
}

/** Marketplace-Detail-Overview (für /api/marketplace-detail/[slug]/overview) */
export function demoMarketplaceDetailOverview(slug: string) {
  const sales = demoSalesPayload(slug as DemoMarketplaceSlug);
  const orders = generateOrders(slug as DemoMarketplaceSlug, 25);
  const products = generateProducts(slug as DemoMarketplaceSlug);
  return {
    slug,
    marketplace: slug,
    name: slug.charAt(0).toUpperCase() + slug.slice(1).replace("-", " "),
    summary: {
      ordersLast30Days: Math.floor(seededRandom(`${slug}-ord30`) * 1000) + 200,
      revenueLast30Days: +(seededRandom(`${slug}-rev30`) * 50000 + 10000).toFixed(2),
      avgOrderValue: +(20 + seededRandom(`${slug}-aov`) * 30).toFixed(2),
      activeProducts: products.length,
      lowStockProducts: products.filter((p) => p.stockStatus === "low_stock").length,
      outOfStockProducts: products.filter((p) => p.stockStatus === "out_of_stock").length,
    },
    salesSeries: sales.points,
    salesTotals: sales.summary,
    recentOrders: orders.slice(0, 10),
    topProducts: products.slice(0, 5).map((p) => ({
      sku: p.sku,
      name: p.name,
      sales30d: p.sales30d,
      revenue: +(p.sales30d * p.price).toFixed(2),
    })),
    metadata: { demo: true, generatedAt: new Date().toISOString() },
  };
}

/** Marketplace-Detail-Products (cross-marketplace Pricing) */
export function demoMarketplaceDetailProducts(slug: string) {
  const items = DEMO_PRODUCTS.map((p, i) => {
    const baseStock = Math.floor(seededRandom(`${slug}-md-${i}-st`) * 200);
    const competitorPrices = DEMO_MARKETPLACES.filter((m) => m !== slug).map((m) => ({
      marketplace: m,
      price: +(p.priceEur * (0.9 + seededRandom(`${slug}-${m}-${i}`) * 0.2)).toFixed(2),
      lastSeen: new Date(Date.now() - seededRandom(`${slug}-${m}-${i}-t`) * 7 * 24 * 60 * 60 * 1000).toISOString(),
    }));
    return {
      sku: p.sku,
      name: p.name,
      ownPrice: p.priceEur,
      ownStock: baseStock,
      ownStockStatus: baseStock > 20 ? "in_stock" : baseStock > 0 ? "low_stock" : "out_of_stock",
      competitorPrices,
      lowestCompetitorPrice: Math.min(...competitorPrices.map((c) => c.price)),
      pricePosition: seededRandom(`${slug}-pos-${i}`) > 0.5 ? "competitive" : "above_market",
    };
  });
  return { slug, items, products: items, metadata: { totalProducts: items.length, demo: true } };
}

/** Article-by-Marketplace Cross-Tab */
export function demoMarketplaceArticleSalesPayload() {
  const articles = DEMO_PRODUCTS.map((p, i) => {
    const perMarketplace: Record<string, { units: number; revenue: number }> = {};
    let totalUnits = 0;
    let totalRevenue = 0;
    for (const mp of DEMO_MARKETPLACES) {
      const units = Math.floor(seededRandom(`mas-${mp}-${i}-u`) * 100);
      const revenue = +(units * p.priceEur).toFixed(2);
      perMarketplace[mp] = { units, revenue };
      totalUnits += units;
      totalRevenue += revenue;
    }
    return {
      sku: p.sku,
      name: p.name,
      ean: `40${String(10000000 + i).slice(0, 10)}`,
      perMarketplace,
      totalUnits,
      totalRevenue: +totalRevenue.toFixed(2),
    };
  });
  return { articles, items: articles, metadata: { demo: true } };
}

/** Weekly-Report — voller WeeklyReportData-Shape (siehe weeklyReportService.ts) */
export function demoWeeklyReportPayload() {
  const dayMs = 24 * 60 * 60 * 1000;
  const now = Date.now();

  // Letzte abgeschlossene ISO-Woche (Mo–So)
  const today = new Date(now);
  const dayOfWeek = today.getUTCDay() === 0 ? 7 : today.getUTCDay(); // Mo=1..So=7
  const lastSunday = new Date(now - dayOfWeek * dayMs);
  const lastMonday = new Date(lastSunday.getTime() - 6 * dayMs);
  const prevSunday = new Date(lastMonday.getTime() - 1 * dayMs);
  const prevMonday = new Date(prevSunday.getTime() - 6 * dayMs);

  // ISO-Wochennummern grob aus Datum (für Demo ausreichend)
  const isoWeekNumber = (d: Date): number => {
    const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return Math.ceil(((date.getTime() - yearStart.getTime()) / dayMs + 1) / 7);
  };

  const buildIsoWeek = (start: Date, end: Date) => {
    const yr = end.getUTCFullYear();
    const wk = isoWeekNumber(end);
    return {
      year: yr,
      week: wk,
      start: start.toISOString(),
      end: end.toISOString(),
      label: `KW ${wk} / ${yr}`,
      key: `${yr}-${String(wk).padStart(2, "0")}`,
    };
  };

  const currentWeek = buildIsoWeek(lastMonday, lastSunday);
  const previousWeek = buildIsoWeek(prevMonday, prevSunday);

  const REPORT_MP = [
    { slug: "amazon", name: "Amazon DE", logo: "/brand/marketplaces/amazon.svg" },
    { slug: "otto", name: "Otto", logo: "/brand/marketplaces/otto.svg" },
    { slug: "ebay", name: "eBay", logo: "/brand/marketplaces/ebay.svg" },
    { slug: "kaufland", name: "Kaufland", logo: "/brand/marketplaces/kaufland.svg" },
    { slug: "fressnapf", name: "Fressnapf DE", logo: "/brand/marketplaces/fressnapf.svg" },
    { slug: "fressnapf-at", name: "Fressnapf AT", logo: "/brand/marketplaces/fressnapf.svg" },
    { slug: "mediamarkt-saturn", name: "MediaMarkt & Saturn", logo: "/brand/marketplaces/mediamarkt-saturn.svg" },
    { slug: "zooplus", name: "Zooplus", logo: "/brand/marketplaces/zooplus.svg" },
    { slug: "tiktok", name: "TikTok", logo: "/brand/marketplaces/tiktok.svg" },
  ];

  const round2 = (n: number) => Math.round(n * 100) / 100;
  const round1 = (n: number) => Math.round(n * 10) / 10;
  const deltaPct = (cur: number, prev: number) => {
    if (prev === 0) return cur > 0 ? 100 : 0;
    return round1(((cur - prev) / prev) * 100);
  };

  const marketplaces = REPORT_MP.map((mp) => {
    const k = `wr-cur-${mp.slug}`;
    const kp = `wr-prev-${mp.slug}`;
    const orders = 80 + Math.floor(seededRandom(k + "o") * 320);
    const ordersPrev = 80 + Math.floor(seededRandom(kp + "o") * 320);
    const avgPrice = 18 + seededRandom(k + "ap") * 35;
    const avgPricePrev = 18 + seededRandom(kp + "ap") * 35;
    const revenue = round2(orders * avgPrice);
    const revenuePrev = round2(ordersPrev * avgPricePrev);
    const returnCount = Math.floor(orders * (0.02 + seededRandom(k + "rc") * 0.06));
    const returnedAmount = round2(returnCount * avgPrice * 0.9);
    const returnCountPrev = Math.floor(ordersPrev * (0.02 + seededRandom(kp + "rc") * 0.06));
    const returnedAmountPrev = round2(returnCountPrev * avgPricePrev * 0.9);
    const returnRate = revenue > 0 ? round1((returnedAmount / revenue) * 100) : 0;
    const returnRatePrev = revenuePrev > 0 ? round1((returnedAmountPrev / revenuePrev) * 100) : 0;

    const dailyRevenue: number[] = [];
    const dailyOrders: number[] = [];
    let dailySum = 0;
    let ordSum = 0;
    for (let d = 0; d < 7; d++) {
      const dr = round2(seededRandom(`${k}-d${d}r`) * (revenue / 4) + revenue / 12);
      const doo = Math.floor(seededRandom(`${k}-d${d}o`) * (orders / 4) + orders / 12);
      dailyRevenue.push(dr);
      dailyOrders.push(doo);
      dailySum += dr;
      ordSum += doo;
    }
    // Skaliere damit Summe ungefähr passt
    const drScale = revenue > 0 && dailySum > 0 ? revenue / dailySum : 1;
    const doScale = orders > 0 && ordSum > 0 ? orders / ordSum : 1;
    const dailyRevenueFinal = dailyRevenue.map((d) => round2(d * drScale));
    const dailyOrdersFinal = dailyOrders.map((d) => Math.max(0, Math.round(d * doScale)));

    const topGainers = DEMO_PRODUCTS.slice(0, 5).map((p, idx) => {
      const cur = round2(seededRandom(`${k}-tg${idx}c`) * 1500 + 200);
      const prev = round2(cur * (0.5 + seededRandom(`${k}-tg${idx}p`) * 0.4));
      return {
        sku: p.sku,
        name: p.name,
        revenueCurrent: cur,
        revenuePrevious: prev,
        deltaPercent: deltaPct(cur, prev),
        ordersCurrent: 5 + Math.floor(seededRandom(`${k}-tg${idx}oc`) * 40),
        ordersPrevious: 5 + Math.floor(seededRandom(`${k}-tg${idx}op`) * 40),
      };
    });

    const topLosers = DEMO_PRODUCTS.slice(5, 10).map((p, idx) => {
      const cur = round2(seededRandom(`${k}-tl${idx}c`) * 800 + 100);
      const prev = round2(cur * (1.3 + seededRandom(`${k}-tl${idx}p`) * 0.6));
      return {
        sku: p.sku,
        name: p.name,
        revenueCurrent: cur,
        revenuePrevious: prev,
        deltaPercent: deltaPct(cur, prev),
        ordersCurrent: 3 + Math.floor(seededRandom(`${k}-tl${idx}oc`) * 25),
        ordersPrevious: 3 + Math.floor(seededRandom(`${k}-tl${idx}op`) * 25),
      };
    });

    return {
      slug: mp.slug,
      name: mp.name,
      logo: mp.logo,
      current: {
        revenue,
        orders,
        avgOrderValue: orders > 0 ? round2(revenue / orders) : 0,
        returnRate,
        returnCount,
      },
      previous: {
        revenue: revenuePrev,
        orders: ordersPrev,
        avgOrderValue: ordersPrev > 0 ? round2(revenuePrev / ordersPrev) : 0,
        returnRate: returnRatePrev,
        returnCount: returnCountPrev,
      },
      deltas: {
        revenuePercent: deltaPct(revenue, revenuePrev),
        ordersPercent: deltaPct(orders, ordersPrev),
        avgOrderValuePercent: deltaPct(
          orders > 0 ? revenue / orders : 0,
          ordersPrev > 0 ? revenuePrev / ordersPrev : 0
        ),
        returnRatePp: round1(returnRate - returnRatePrev),
      },
      dailyRevenue: dailyRevenueFinal,
      dailyOrders: dailyOrdersFinal,
      topGainers,
      topLosers,
      averagePriceTrend: {
        current: round2(avgPrice),
        previous: round2(avgPricePrev),
        deltaPercent: deltaPct(avgPrice, avgPricePrev),
      },
    };
  });

  // Aggregierte Totals
  const sumRevCur = marketplaces.reduce((s, m) => s + m.current.revenue, 0);
  const sumRevPrev = marketplaces.reduce((s, m) => s + m.previous.revenue, 0);
  const sumOrdCur = marketplaces.reduce((s, m) => s + m.current.orders, 0);
  const sumOrdPrev = marketplaces.reduce((s, m) => s + m.previous.orders, 0);
  const sumRetCur = marketplaces.reduce((s, m) => s + m.current.returnCount, 0);
  const sumRetPrev = marketplaces.reduce((s, m) => s + m.previous.returnCount, 0);

  const totals = {
    current: {
      revenue: round2(sumRevCur),
      orders: sumOrdCur,
      avgOrderValue: sumOrdCur > 0 ? round2(sumRevCur / sumOrdCur) : 0,
      returnRate: sumOrdCur > 0 ? round1((sumRetCur / sumOrdCur) * 100) : 0,
      returnCount: sumRetCur,
    },
    previous: {
      revenue: round2(sumRevPrev),
      orders: sumOrdPrev,
      avgOrderValue: sumOrdPrev > 0 ? round2(sumRevPrev / sumOrdPrev) : 0,
      returnRate: sumOrdPrev > 0 ? round1((sumRetPrev / sumOrdPrev) * 100) : 0,
      returnCount: sumRetPrev,
    },
    deltas: {
      revenuePercent: deltaPct(sumRevCur, sumRevPrev),
      ordersPercent: deltaPct(sumOrdCur, sumOrdPrev),
      avgOrderValuePercent: deltaPct(
        sumOrdCur > 0 ? sumRevCur / sumOrdCur : 0,
        sumOrdPrev > 0 ? sumRevPrev / sumOrdPrev : 0
      ),
      returnRatePp: round1(
        (sumOrdCur > 0 ? (sumRetCur / sumOrdCur) * 100 : 0) -
          (sumOrdPrev > 0 ? (sumRetPrev / sumOrdPrev) * 100 : 0)
      ),
    },
  };

  const trend: "up" | "down" | "flat" =
    totals.deltas.revenuePercent > 1 ? "up" : totals.deltas.revenuePercent < -1 ? "down" : "flat";
  const narrative = {
    text: `Diese Woche ${totals.deltas.revenuePercent >= 0 ? "+" : ""}${totals.deltas.revenuePercent}% Umsatz gegenüber Vorwoche, bei ${totals.current.orders} Bestellungen.`,
    segments: [
      { type: "text" as const, value: "Diese Woche " },
      {
        type: "metric" as const,
        value: `${totals.deltas.revenuePercent >= 0 ? "+" : ""}${totals.deltas.revenuePercent}%`,
        trend,
      },
      { type: "text" as const, value: ` Umsatz, ${totals.current.orders} Bestellungen.` },
    ],
  };

  return {
    weeks: { current: currentWeek, previous: previousWeek },
    totals,
    marketplaces,
    narrative,
  };
}

/** Weekly-Report Notes */
export function demoWeeklyReportNotesPayload() {
  return {
    notes: [
      {
        id: "note-1",
        weekNumber: 52,
        text: "Promo-Aktion auf Amazon hat 35% Umsatzsteigerung gebracht.",
        author: "Demo Admin",
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "note-2",
        weekNumber: 51,
        text: "Lieferengpass bei Petrhein-Trockenfutter bis Ende Monat.",
        author: "Demo Admin",
        createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
    items: [],
    metadata: { demo: true },
  };
}

/** Price-Parity */
export function demoPriceParityPayload() {
  const items = DEMO_PRODUCTS.map((p, i) => {
    const prices = DEMO_MARKETPLACES.map((mp) => ({
      marketplace: mp,
      price: +(p.priceEur * (0.92 + seededRandom(`pp-${mp}-${i}`) * 0.16)).toFixed(2),
      url: `https://example.com/${mp}/${p.sku.toLowerCase()}`,
      inStock: seededRandom(`pp-${mp}-${i}-st`) > 0.15,
    }));
    const minPrice = Math.min(...prices.map((p) => p.price));
    const maxPrice = Math.max(...prices.map((p) => p.price));
    return {
      sku: p.sku,
      name: p.name,
      ownPrice: p.priceEur,
      prices,
      minPrice,
      maxPrice,
      spread: +((maxPrice - minPrice) / minPrice * 100).toFixed(1),
      hasParityIssue: maxPrice / minPrice > 1.1,
    };
  });
  return { items, articles: items, metadata: { demo: true } };
}

/** Price/Stock-Overrides */
export function demoPriceStockOverridesPayload() {
  const overrides = DEMO_PRODUCTS.slice(0, 5).flatMap((p, i) => {
    const mps = DEMO_MARKETPLACES.slice(0, 3);
    return mps.map((mp, j) => ({
      id: `ov-${i}-${j}`,
      sku: p.sku,
      marketplace: mp,
      overrideType: j === 0 ? "price" : "stock",
      value: j === 0 ? p.priceEur * 1.1 : 50,
      reason: j === 0 ? "Premium-Pricing" : "Lager-Reservierung",
      activeUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
      createdBy: "Demo Admin",
    }));
  });
  return { items: overrides, overrides, metadata: { demo: true } };
}

/** Promotion-Deals — schema: PromotionDeal = { id, label, from, to, color, marketplaceSlug } */
export function demoPromotionDealsPayload() {
  const dayMs = 24 * 60 * 60 * 1000;
  const today = Date.now();
  const ymd = (offsetDays: number) =>
    new Date(today + offsetDays * dayMs).toISOString().slice(0, 10);

  const presets: Array<{
    label: string;
    fromOffset: number;
    toOffset: number;
    color: string;
    marketplaceSlug: string | null;
  }> = [
    { label: "Black Friday Week", fromOffset: -120, toOffset: -113, color: "#f97316", marketplaceSlug: null },
    { label: "Weihnachts-Aktion", fromOffset: -100, toOffset: -85, color: "#ec4899", marketplaceSlug: null },
    { label: "Amazon Lightning Deal", fromOffset: -45, toOffset: -42, color: "#a855f7", marketplaceSlug: "amazon" },
    { label: "Otto Frühjahrsdeal", fromOffset: -30, toOffset: -23, color: "#22c55e", marketplaceSlug: "otto" },
    { label: "Kaufland Wochendeal", fromOffset: -7, toOffset: -1, color: "#06b6d4", marketplaceSlug: "kaufland" },
    { label: "Aktuelle Cross-Marketplace-Aktion", fromOffset: -2, toOffset: 5, color: "#eab308", marketplaceSlug: null },
    { label: "Anstehende Promo Amazon", fromOffset: 7, toOffset: 14, color: "#3b82f6", marketplaceSlug: "amazon" },
    { label: "Geplante Fressnapf-Aktion", fromOffset: 14, toOffset: 21, color: "#22c55e", marketplaceSlug: "fressnapf" },
  ];

  const deals = presets.map((p, i) => ({
    id: `demo-deal-${i}`,
    label: p.label,
    from: ymd(p.fromOffset),
    to: ymd(p.toOffset),
    color: p.color,
    marketplaceSlug: p.marketplaceSlug,
  }));

  return { deals, items: deals, metadata: { demo: true } };
}

/** Sales-Config-Status */
export function demoSalesConfigStatusPayload() {
  const result: Record<string, unknown> = {};
  for (const mp of DEMO_MARKETPLACES) {
    result[mp] = {
      configured: true,
      hasCredentials: true,
      lastSync: new Date(Date.now() - seededRandom(`sc-${mp}`) * 60 * 60 * 1000).toISOString(),
      status: "ok",
    };
  }
  return { marketplaces: result, metadata: { demo: true } };
}

/** Payouts-Overview */
/** Payouts Overview — exakter PayoutOverview-Shape (siehe payoutTypes.ts) */
export function demoPayoutsOverviewPayload() {
  const dayMs = 24 * 60 * 60 * 1000;
  const today = new Date();
  const todayYmd = today.toISOString().slice(0, 10);
  const fromDate = new Date(today.getTime() - 30 * dayMs);
  const fromYmd = fromDate.toISOString().slice(0, 10);
  const prevToDate = new Date(fromDate.getTime() - 1 * dayMs);
  const prevFromDate = new Date(prevToDate.getTime() - 30 * dayMs);
  const prevFromYmd = prevFromDate.toISOString().slice(0, 10);
  const prevToYmd = prevToDate.toISOString().slice(0, 10);

  const round2 = (n: number) => Math.round(n * 100) / 100;

  const PAYOUT_MARKETPLACES = [
    "amazon-de", "amazon-fr", "ebay", "otto", "kaufland",
    "fressnapf", "mediamarkt-saturn", "zooplus", "tiktok", "shopify",
  ];

  type PayoutRow = {
    id: string;
    marketplaceSlug: string;
    periodFrom: string;
    periodTo: string;
    settlementId: string | null;
    grossSales: number;
    refundsAmount: number;
    refundsFeesReturned: number;
    marketplaceFees: number;
    fulfillmentFees: number;
    advertisingFees: number;
    shippingFees: number;
    promotionDiscounts: number;
    otherFees: number;
    otherFeesBreakdown: Record<string, number> | null;
    reserveAmount: number;
    netPayout: number;
    ordersCount: number;
    returnsCount: number;
    unitsSold: number;
    payoutRatio: number;
    returnRate: number;
    acos: number | null;
    tacos: number | null;
    productBreakdown: unknown;
    currency: string;
    fetchedAt: string;
  };

  const buildRow = (mp: string, idx: number, periodFrom: string, periodTo: string, prefix: string): PayoutRow => {
    const k = `${prefix}-${mp}-${idx}`;
    const grossSales = round2(seededRandom(k + "g") * 18000 + 3500);
    const refundsAmount = -round2(seededRandom(k + "r") * 600 + 50);
    const marketplaceFees = -round2(grossSales * (0.10 + seededRandom(k + "mf") * 0.05));
    const fulfillmentFees = -round2(grossSales * (0.06 + seededRandom(k + "ff") * 0.03));
    const advertisingFees = -round2(grossSales * (0.02 + seededRandom(k + "af") * 0.05));
    const shippingFees = -round2(seededRandom(k + "sf") * 220 + 20);
    const promotionDiscounts = -round2(seededRandom(k + "pd") * 480);
    const otherFees = -round2(seededRandom(k + "of") * 80);
    const reserveAmount = round2(seededRandom(k + "res") * 250);
    const netPayout = round2(
      grossSales + refundsAmount + marketplaceFees + fulfillmentFees + advertisingFees +
      shippingFees + promotionDiscounts + otherFees - reserveAmount
    );
    const ordersCount = 80 + Math.floor(seededRandom(k + "oc") * 220);
    const returnsCount = Math.floor(ordersCount * (0.02 + seededRandom(k + "rc") * 0.06));
    const unitsSold = ordersCount + Math.floor(seededRandom(k + "us") * 40);
    const payoutRatio = grossSales > 0 ? Math.round((netPayout / grossSales) * 10000) / 10000 : 0;
    const returnRate = ordersCount > 0 ? Math.round((returnsCount / ordersCount) * 10000) / 10000 : 0;
    const tacos = grossSales > 0 ? round2((Math.abs(advertisingFees) / grossSales) * 100) : 0;

    return {
      id: `${prefix}-${mp}-${idx}`,
      marketplaceSlug: mp,
      periodFrom,
      periodTo,
      settlementId: `SETTLE-${prefix}-${mp}-${10000 + idx}`,
      grossSales,
      refundsAmount,
      refundsFeesReturned: round2(Math.abs(refundsAmount) * 0.15),
      marketplaceFees,
      fulfillmentFees,
      advertisingFees,
      shippingFees,
      promotionDiscounts,
      otherFees,
      otherFeesBreakdown: null,
      reserveAmount,
      netPayout,
      ordersCount,
      returnsCount,
      unitsSold,
      payoutRatio,
      returnRate,
      acos: round2(seededRandom(k + "acos") * 25 + 5),
      tacos,
      productBreakdown: null,
      currency: "EUR",
      fetchedAt: new Date().toISOString(),
    };
  };

  // Pro Marktplatz 2 Settlement-Perioden in der aktuellen + 2 in der Vergleichsperiode
  const rows: PayoutRow[] = [];
  const previousRows: PayoutRow[] = [];

  for (const mp of PAYOUT_MARKETPLACES) {
    rows.push(buildRow(mp, 0, fromYmd, todayYmd, "cur"));
    rows.push(buildRow(mp, 1,
      new Date(fromDate.getTime() + 14 * dayMs).toISOString().slice(0, 10),
      todayYmd,
      "cur"
    ));
    previousRows.push(buildRow(mp, 0, prevFromYmd, prevToYmd, "prev"));
    previousRows.push(buildRow(mp, 1,
      new Date(prevFromDate.getTime() + 14 * dayMs).toISOString().slice(0, 10),
      prevToYmd,
      "prev"
    ));
  }

  const sumTotals = (list: PayoutRow[]) => {
    let grossSales = 0, refundsAmount = 0, marketplaceFees = 0, fulfillmentFees = 0;
    let advertisingFees = 0, shippingFees = 0, promotionDiscounts = 0, otherFees = 0;
    let netPayout = 0, ordersCount = 0, returnsCount = 0, unitsSold = 0;
    for (const r of list) {
      grossSales += r.grossSales;
      refundsAmount += r.refundsAmount;
      marketplaceFees += r.marketplaceFees;
      fulfillmentFees += r.fulfillmentFees;
      advertisingFees += r.advertisingFees;
      shippingFees += r.shippingFees;
      promotionDiscounts += r.promotionDiscounts;
      otherFees += r.otherFees;
      netPayout += r.netPayout;
      ordersCount += r.ordersCount;
      returnsCount += r.returnsCount;
      unitsSold += r.unitsSold;
    }
    const totalFees = round2(
      Math.abs(marketplaceFees) + Math.abs(fulfillmentFees) +
      Math.abs(shippingFees) + Math.abs(promotionDiscounts) + Math.abs(otherFees)
    );
    const payoutRatio = grossSales > 0 ? Math.round((netPayout / grossSales) * 10000) / 10000 : 0;
    const returnRate = ordersCount > 0 ? Math.round((returnsCount / ordersCount) * 10000) / 10000 : 0;
    const aov = ordersCount > 0 ? round2(grossSales / ordersCount) : 0;
    const tacos = grossSales > 0 ? round2((Math.abs(advertisingFees) / grossSales) * 100) : 0;
    return {
      grossSales: round2(grossSales),
      refundsAmount: round2(refundsAmount),
      marketplaceFees: round2(marketplaceFees),
      fulfillmentFees: round2(fulfillmentFees),
      advertisingFees: round2(advertisingFees),
      shippingFees: round2(shippingFees),
      promotionDiscounts: round2(promotionDiscounts),
      otherFees: round2(otherFees),
      netPayout: round2(netPayout),
      ordersCount,
      returnsCount,
      unitsSold,
      payoutRatio,
      returnRate,
      aov,
      tacos,
      totalFees,
    };
  };

  const totals = sumTotals(rows);
  const previousTotals = sumTotals(previousRows);

  const pctDelta = (c: number, p: number) =>
    p !== 0 ? Math.round(((c - p) / Math.abs(p)) * 1000) / 10 : null;

  const deltas = {
    grossSales: pctDelta(totals.grossSales, previousTotals.grossSales),
    netPayout: pctDelta(totals.netPayout, previousTotals.netPayout),
    payoutRatio: Math.round((totals.payoutRatio - previousTotals.payoutRatio) * 10000) / 10000,
    returnRate: Math.round((totals.returnRate - previousTotals.returnRate) * 10000) / 10000,
    ordersCount: pctDelta(totals.ordersCount, previousTotals.ordersCount),
    refundsAmount: pctDelta(Math.abs(totals.refundsAmount), Math.abs(previousTotals.refundsAmount)),
    advertisingFees: pctDelta(Math.abs(totals.advertisingFees), Math.abs(previousTotals.advertisingFees)),
    aov: pctDelta(totals.aov, previousTotals.aov),
    tacos: round2(totals.tacos - previousTotals.tacos),
  };

  return {
    period: { from: fromYmd, to: todayYmd },
    previousPeriod: { from: prevFromYmd, to: prevToYmd },
    marketplaces: PAYOUT_MARKETPLACES,
    totals,
    previousTotals,
    deltas,
    rows,
    previousRows,
  };
}

/** Payouts-Periods (Dropdown-Liste) */
export function demoPayoutsPeriodsPayload() {
  const dayMs = 24 * 60 * 60 * 1000;
  const today = new Date();
  const todayMs = today.getTime();
  const PAYOUT_MARKETPLACES = [
    "amazon-de", "amazon-fr", "ebay", "otto", "kaufland",
    "fressnapf", "mediamarkt-saturn", "zooplus", "tiktok", "shopify",
  ];
  const periods: Array<{
    periodFrom: string;
    periodTo: string;
    marketplace: string;
    isOpen: boolean;
  }> = [];

  // 6 Settlement-Perioden pro Marktplatz, alle 14 Tage
  for (const mp of PAYOUT_MARKETPLACES) {
    for (let i = 0; i < 6; i++) {
      const to = new Date(todayMs - i * 14 * dayMs);
      const from = new Date(to.getTime() - 13 * dayMs);
      periods.push({
        periodFrom: from.toISOString().slice(0, 10),
        periodTo: to.toISOString().slice(0, 10),
        marketplace: mp,
        isOpen: i === 0,
      });
    }
  }

  return { periods };
}

/** User-Liste */
export function demoUsersListPayload() {
  const users = [
    { id: "u-1", email: "demo@master-dashboard.dev", fullName: "Demo Admin", role: "owner", lastLogin: new Date().toISOString(), createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString() },
    { id: "u-2", email: "anna.weber@example.com", fullName: "Anna Weber", role: "admin", lastLogin: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), createdAt: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString() },
    { id: "u-3", email: "max.schmidt@example.com", fullName: "Max Schmidt", role: "manager", lastLogin: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), createdAt: new Date(Date.now() - 150 * 24 * 60 * 60 * 1000).toISOString() },
    { id: "u-4", email: "lisa.fischer@example.com", fullName: "Lisa Fischer", role: "viewer", lastLogin: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString() },
    { id: "u-5", email: "tobias.becker@example.com", fullName: "Tobias Becker", role: "developer", lastLogin: new Date(Date.now() - 30 * 60 * 1000).toISOString(), createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString() },
  ];
  return { users, items: users, metadata: { demo: true } };
}

/** Updates-Feed */
/** Updates-Liste — Shape muss `ManagedUpdateItem` aus updates/page.tsx entsprechen. */
export function demoUpdatesListPayload() {
  const dayMs = 24 * 60 * 60 * 1000;
  const ymd = (offset: number) =>
    new Date(Date.now() - offset * dayMs).toISOString().slice(0, 10);
  const iso = (offset: number) =>
    new Date(Date.now() - offset * dayMs).toISOString();

  const items = [
    {
      id: "upd-1",
      date: ymd(2),
      title: "Neue Bedarfsprognose-Engine",
      text: "Die Forecast-Engine berücksichtigt jetzt auch Container-Ankunftszeiten und SKU-Saisonalität.",
      release_key: "v1.8.0",
      created_at: iso(2),
    },
    {
      id: "upd-2",
      date: ymd(7),
      title: "Fressnapf-Integration: Verbesserte Performance",
      text: "Ladezeit der Fressnapf-Bestellseite um 60% reduziert. Pagination ist jetzt server-seitig.",
      release_key: "v1.7.4",
      created_at: iso(7),
    },
    {
      id: "upd-3",
      date: ymd(14),
      title: "Neuer Marktplatz: TikTok Shop",
      text: "TikTok-Shop ist jetzt als Beta verfügbar — Bestellungen, Produkte, Sales-Charts.",
      release_key: "v1.7.0",
      created_at: iso(14),
    },
    {
      id: "upd-4",
      date: ymd(21),
      title: "Bug-Fix: Xentral-Sync",
      text: "Doppelte Bestellungen bei parallelem Sync wurden behoben (Race-Condition im ETag-Cache).",
      release_key: "v1.6.2",
      created_at: iso(21),
    },
    {
      id: "upd-5",
      date: ymd(30),
      title: "Cross-Marketplace Preisvergleich",
      text: "Auf einen Blick sehen, wer aktuell günstiger anbietet — inklusive Marge-Indikator.",
      release_key: "v1.6.0",
      created_at: iso(30),
    },
  ];
  return { items };
}

/** Feedback-Liste — Shape muss `FeatureRequestRow` aus /api/feedback entsprechen. */
export function demoFeedbackListPayload() {
  const dayMs = 24 * 60 * 60 * 1000;
  const iso = (offset: number) =>
    new Date(Date.now() - offset * dayMs).toISOString();

  const items = [
    {
      id: "fb-1",
      created_at: iso(5),
      user_id: "demo-user-anna",
      user_email: "anna.weber@example.com",
      title: "Dark-Mode für Charts",
      message: "Bei dunklem Hintergrund sind die Linien-Charts schwer lesbar — bitte Farbpalette anpassen.",
      status: "in_progress" as const,
      owner_reply: "Ist in Arbeit — Release voraussichtlich nächste Woche.",
      page_path: "/analytics/marketplaces",
      attachments: [],
    },
    {
      id: "fb-2",
      created_at: iso(10),
      user_id: "demo-user-max",
      user_email: "max.schmidt@example.com",
      title: "Excel-Export für Bestellungen",
      message: "Wäre praktisch wenn man eine Bestelliste direkt als XLSX exportieren könnte (mit Bestellnummer, Datum, SKU, Menge, Preis).",
      status: "open" as const,
      owner_reply: null,
      page_path: "/amazon/orders",
      attachments: [],
    },
    {
      id: "fb-3",
      created_at: iso(20),
      user_id: "demo-user-lisa",
      user_email: "lisa.fischer@example.com",
      title: "Push-Benachrichtigungen bei Out-of-Stock",
      message: "Bei Out-of-Stock-Warnungen wäre eine Push-Nachricht aufs Handy hilfreich — gerade bei Bestsellern.",
      status: "open" as const,
      owner_reply: null,
      page_path: "/xentral/products",
      attachments: [],
    },
    {
      id: "fb-4",
      created_at: iso(30),
      user_id: "demo-user-tobias",
      user_email: "tobias.becker@example.com",
      title: "Tippfehler im Footer",
      message: "Im Footer steht 'Imressum' statt 'Impressum'.",
      status: "done" as const,
      owner_reply: "Behoben in v1.6.1, danke für den Hinweis!",
      page_path: null,
      attachments: [],
    },
  ];
  return { items };
}

/** Procurement-Lines */
export function demoProcurementLinesPayload() {
  const lines = DEMO_PRODUCTS.slice(0, 8).map((p, i) => ({
    id: `proc-${i}`,
    sku: p.sku,
    name: p.name,
    quantity: Math.floor(seededRandom(`pl-${i}-q`) * 1000) + 100,
    unitCost: +(p.priceEur * 0.45).toFixed(2),
    totalCost: 0, // computed
    containerNumber: `CONT-2026-${String(i + 1).padStart(3, "0")}`,
    supplierName: i % 2 === 0 ? "Supplier Asia Co." : "Europe Wholesale GmbH",
    arrivalDate: new Date(Date.now() + (10 + i * 5) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    status: ["confirmed", "in_transit", "arrived"][i % 3],
  }));
  for (const line of lines) {
    (line as { totalCost: number }).totalCost = +(
      (line.unitCost as number) * (line.quantity as number)
    ).toFixed(2);
  }
  return { items: lines, lines, metadata: { demo: true } };
}

/** Cross-Listing Drafts */
export function demoCrossListingDraftsPayload() {
  const drafts = DEMO_PRODUCTS.slice(0, 4).map((p, i) => ({
    id: `cl-draft-${i}`,
    sourceSku: p.sku,
    sourceName: p.name,
    targetMarketplace: DEMO_MARKETPLACES[(i + 2) % DEMO_MARKETPLACES.length],
    proposedTitle: `${p.name} — Premium-Qualität`,
    proposedDescription: `Hochwertiges Tierprodukt aus dem Hause Petrhein. ${p.name} überzeugt mit ausgewählten Zutaten und schonender Verarbeitung. Ideal für Tierhalter die das Beste für ihren Liebling möchten.`,
    proposedPrice: +(p.priceEur * 1.05).toFixed(2),
    proposedKeywords: ["tierfutter", "premium", "haustier", p.sku.toLowerCase()],
    aiModel: "claude-opus-4.7",
    status: i === 0 ? "ready" : i === 1 ? "needs_review" : "draft",
    createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
  }));
  return { items: drafts, drafts, metadata: { demo: true } };
}

/** Cross-Listing Source-Data (welche Artikel auf welchen Marktplätzen fehlen) */
export function demoCrossListingSourceDataPayload() {
  const items = DEMO_PRODUCTS.map((p, i) => {
    const presentOn = DEMO_MARKETPLACES.filter(
      (_, j) => seededRandom(`cl-src-${i}-${j}`) > 0.3
    );
    const missingOn = DEMO_MARKETPLACES.filter((m) => !presentOn.includes(m));
    return {
      sku: p.sku,
      name: p.name,
      presentOn,
      missingOn,
      crossListingPotential: missingOn.length > 3 ? "high" : missingOn.length > 1 ? "medium" : "low",
    };
  });
  return { items, articles: items, metadata: { demo: true } };
}

/** Xentral Product-Tags */
export function demoXentralProductTagsPayload() {
  const tags = DEMO_PRODUCTS.flatMap((p, i) => {
    const tagList = [];
    if (i % 3 === 0) tagList.push("bestseller");
    if (i % 4 === 0) tagList.push("neu");
    if (i % 5 === 0) tagList.push("aktion");
    if (i < 3) tagList.push("export-de-at");
    return tagList.map((tag) => ({
      sku: p.sku,
      tag,
      assignedAt: new Date(Date.now() - seededRandom(`tag-${i}-${tag}`) * 30 * 24 * 60 * 60 * 1000).toISOString(),
    }));
  });
  return { items: tags, tags, metadata: { demo: true } };
}

/** Xentral Product-Tag-Definitionen */
export function demoXentralProductTagDefinitionsPayload() {
  return {
    items: [
      { id: "td-1", name: "bestseller", color: "#10b981", description: "Top-Verkäufer der Saison" },
      { id: "td-2", name: "neu", color: "#3b82f6", description: "Neuzugang im Sortiment" },
      { id: "td-3", name: "aktion", color: "#ef4444", description: "Aktuell mit Promotion" },
      { id: "td-4", name: "export-de-at", color: "#f59e0b", description: "Verkaufsfähig in DE und AT" },
      { id: "td-5", name: "low-margin", color: "#6b7280", description: "Marge unter 15%" },
    ],
    metadata: { demo: true },
  };
}

/** Advertising-Stub */
export function demoAdvertisingPayload() {
  const campaigns = DEMO_PRODUCTS.slice(0, 5).map((p, i) => ({
    id: `camp-${i}`,
    name: `Kampagne ${p.name}`,
    sku: p.sku,
    marketplace: DEMO_MARKETPLACES[i % DEMO_MARKETPLACES.length],
    status: i === 0 ? "active" : i === 1 ? "paused" : "active",
    budget: 50 + i * 10,
    spend: +(seededRandom(`camp-${i}-s`) * 80).toFixed(2),
    impressions: Math.floor(seededRandom(`camp-${i}-i`) * 50000) + 1000,
    clicks: Math.floor(seededRandom(`camp-${i}-c`) * 1000) + 50,
    conversions: Math.floor(seededRandom(`camp-${i}-cv`) * 50) + 5,
    acos: +(seededRandom(`camp-${i}-a`) * 30 + 5).toFixed(1),
    startedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  }));
  return { items: campaigns, campaigns, metadata: { demo: true } };
}

/** Amazon Product Detail (für /api/amazon/products/[sku]) */
export function demoAmazonProductDetailPayload(sku: string) {
  const idx = DEMO_PRODUCTS.findIndex((p) => p.sku === sku);
  const p = idx >= 0 ? DEMO_PRODUCTS[idx]! : DEMO_PRODUCTS[0]!;
  const i = idx >= 0 ? idx : 0;
  return {
    sku: p.sku,
    asin: `B0${String(i).padStart(8, "0")}`,
    title: p.name,
    description: `${p.name} — ein Spitzenprodukt aus dem Hause Petrhein. Hergestellt in Deutschland, höchste Qualitätsstandards, ideal für anspruchsvolle Tierhalter.`,
    bulletPoints: [
      "Hochwertige, ausgewählte Zutaten",
      "Schonend in Deutschland verarbeitet",
      "Ohne künstliche Konservierungsstoffe",
      "Tiermedizinisch empfohlen",
      "Wiederverschließbare Verpackung",
    ],
    price: p.priceEur,
    stock: 100 + i * 10,
    imageUrls: [],
    keywords: ["tierfutter", "premium", "deutschland"],
    contentAuditScore: 85 + (i % 10),
    contentAuditIssues: i % 3 === 0 ? ["Titel zu lang"] : [],
    drafts: [],
    metadata: { demo: true },
  };
}

/** Amazon Drafts */
export function demoAmazonDraftsPayload() {
  const drafts = DEMO_PRODUCTS.slice(0, 3).map((p, i) => ({
    id: `draft-${i}`,
    sku: p.sku,
    title: `Draft: ${p.name}`,
    status: ["unsaved", "saved", "ready_to_push"][i % 3],
    lastEditedAt: new Date(Date.now() - i * 60 * 60 * 1000).toISOString(),
  }));
  return { items: drafts, drafts, metadata: { demo: true } };
}

/** Amazon Rulebook */
export function demoAmazonRulebookPayload() {
  return {
    rules: [
      { id: "r-1", category: "title", rule: "Titel muss Marke am Anfang enthalten", severity: "error" },
      { id: "r-2", category: "title", rule: "Maximal 200 Zeichen", severity: "error" },
      { id: "r-3", category: "bullets", rule: "Mindestens 3 Bullet-Points", severity: "warning" },
      { id: "r-4", category: "bullets", rule: "Bullets nicht in Großbuchstaben", severity: "warning" },
      { id: "r-5", category: "description", rule: "HTML-Tags entfernen", severity: "error" },
    ],
    metadata: { demo: true },
  };
}

/** Tutorials Progress */
export function demoTutorialsProgressPayload() {
  return {
    completed: ["welcome", "navigation", "first-order"],
    inProgress: ["analytics-overview"],
    items: [],
    metadata: { demo: true },
  };
}

/** Tutorials Runtime — matches /api/tutorials/runtime Schema */
export function demoTutorialsRuntimePayload() {
  return {
    role: "owner",
    onboarding: {
      tour: null,
      progress: null,
      mustComplete: false,
    },
    updates: [],
  };
}

/** Address-Suggest (Adress-Autocomplete) */
export function demoAddressSuggestPayload() {
  return { suggestions: [], items: [], metadata: { demo: true } };
}

/**
 * Zentraler Lookup für Demo-Antworten in API-Routen.
 * Nicht definierte Keys liefern `{}` (graceful empty).
 */
export function demoSeedFor(key: string): unknown {
  switch (key) {
    case "dashboard-access-config":
      return { config: null };
    case "marketplace-overview":
      return demoMarketplaceOverviewPayload();
    case "xentral/orders":
      return demoXentralOrdersPayload();
    case "xentral/products":
      return demoXentralProductsPayload();
    case "article-forecast":
      return demoArticleForecastPayload();
    case "updates":
      return { updates: [], items: [] };
    case "feedback":
      return { items: [] };
    case "users":
      return { users: [], items: [] };
    case "tutorials":
      return { tutorials: [] };
    case "procurement":
      return { items: [], lines: [] };
    case "advertising":
      return { campaigns: [], items: [] };
    case "payouts":
      return { items: [], payouts: [] };
    default:
      // Für Marktplatz-spezifische keys wie "amazon/orders":
      if (key.endsWith("/orders")) {
        const mp = key.split("/")[0] as DemoMarketplaceSlug;
        if (DEMO_MARKETPLACES.includes(mp)) return demoOrdersPayload(mp);
      }
      if (key.endsWith("/products")) {
        const mp = key.split("/")[0] as DemoMarketplaceSlug;
        if (DEMO_MARKETPLACES.includes(mp)) return demoProductsPayload(mp);
      }
      if (key.endsWith("/sales")) {
        const mp = key.split("/")[0] as DemoMarketplaceSlug;
        if (DEMO_MARKETPLACES.includes(mp)) return demoSalesPayload(mp);
      }
      // Fallback: leeres Items-Array — gefräßig genug für die meisten UI-Komponenten.
      return { items: [], data: null, demo: true };
  }
}

/** Helper für Routen: gibt eine NextResponse mit Seed-Daten zurück. */
export function demoResponse(key: string, init?: ResponseInit): Response {
  return NextResponse.json(demoSeedFor(key), init);
}

/** Erfolg-Response für mutierende Routen im Demo-Mode (keine echte Persistierung). */
export function demoMutationOk(extra?: Record<string, unknown>): Response {
  return NextResponse.json({ ok: true, demo: true, ...extra });
}
