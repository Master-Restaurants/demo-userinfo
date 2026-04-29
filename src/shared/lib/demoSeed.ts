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
  // Mische Bestellungen aus mehreren Marktplätzen, mit Xentral-spezifischen Feldern
  const allOrders: Array<Record<string, unknown>> = [];
  for (const mp of DEMO_MARKETPLACES) {
    const orders = generateOrders(mp, 8);
    for (const order of orders) {
      allOrders.push({
        ...order,
        xentralId: `XEN-${Math.floor(seededRandom(`xen-${order.id}`) * 1000000)}`,
        xentralStatus: order.status,
        xentralBelegNr: `B-${Math.floor(seededRandom(`b-${order.id}`) * 100000)}`,
      });
    }
  }
  // Sortieren nach Datum absteigend
  allOrders.sort((a, b) => String(b.orderDate).localeCompare(String(a.orderDate)));
  return {
    items: allOrders,
    orders: allOrders,
    metadata: { totalOrders: allOrders.length, cacheState: "fresh", demo: true },
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

/** Weekly-Report */
export function demoWeeklyReportPayload() {
  const weeks = [];
  for (let i = 0; i < 8; i++) {
    const weekStart = new Date(Date.now() - (i * 7 + 7) * 24 * 60 * 60 * 1000);
    const key = `wr-${i}`;
    weeks.push({
      weekNumber: 52 - i,
      weekStart: weekStart.toISOString().slice(0, 10),
      weekEnd: new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      totalOrders: Math.floor(seededRandom(key + "o") * 2000) + 500,
      totalRevenue: +(seededRandom(key + "r") * 80000 + 15000).toFixed(2),
      totalProfit: +(seededRandom(key + "p") * 16000 + 3000).toFixed(2),
      perMarketplace: Object.fromEntries(
        DEMO_MARKETPLACES.map((mp) => [
          mp,
          {
            orders: Math.floor(seededRandom(key + mp + "o") * 300) + 30,
            revenue: +(seededRandom(key + mp + "r") * 12000 + 1000).toFixed(2),
            profit: +(seededRandom(key + mp + "p") * 2000 + 200).toFixed(2),
          },
        ])
      ),
    });
  }
  return { weeks, items: weeks, metadata: { demo: true } };
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
export function demoPayoutsOverviewPayload() {
  const periods = [];
  for (let i = 0; i < 12; i++) {
    const periodStart = new Date(Date.now() - (i + 1) * 14 * 24 * 60 * 60 * 1000);
    periods.push({
      id: `payout-${i}`,
      periodStart: periodStart.toISOString().slice(0, 10),
      periodEnd: new Date(periodStart.getTime() + 13 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      perMarketplace: Object.fromEntries(
        DEMO_MARKETPLACES.map((mp) => [
          mp,
          {
            grossSales: +(seededRandom(`po-${i}-${mp}-g`) * 30000 + 5000).toFixed(2),
            fees: +(seededRandom(`po-${i}-${mp}-f`) * 4000 + 500).toFixed(2),
            refunds: +(seededRandom(`po-${i}-${mp}-r`) * 800).toFixed(2),
            netPayout: +(seededRandom(`po-${i}-${mp}-n`) * 25000 + 4000).toFixed(2),
          },
        ])
      ),
      totalGross: 0, // computed by UI typically
      totalNet: 0,
      status: i === 0 ? "pending" : "paid",
    });
  }
  return { items: periods, periods, metadata: { demo: true } };
}

/** Payouts-Periods (Liste) */
export function demoPayoutsPeriodsPayload() {
  return demoPayoutsOverviewPayload();
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
export function demoUpdatesListPayload() {
  const updates = [
    { id: "upd-1", title: "Neue Bedarfsprognose-Engine", description: "Die Forecast-Engine berücksichtigt jetzt auch Container-Ankunftszeiten.", category: "feature", createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), unread: true },
    { id: "upd-2", title: "Fressnapf-Integration: Verbesserte Performance", description: "Ladezeit der Fressnapf-Bestellseite um 60% reduziert.", category: "improvement", createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), unread: true },
    { id: "upd-3", title: "Neuer Marktplatz: TikTok Shop", description: "TikTok-Shop ist jetzt als Beta verfügbar.", category: "feature", createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(), unread: false },
    { id: "upd-4", title: "Bug-Fix: Xentral-Sync", description: "Doppelte Bestellungen bei parallelem Sync wurden behoben.", category: "fix", createdAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(), unread: false },
    { id: "upd-5", title: "Cross-Marketplace Preisvergleich", description: "Sehe auf einen Blick wer aktuell günstiger anbietet.", category: "feature", createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), unread: false },
  ];
  return { updates, items: updates, metadata: { demo: true } };
}

/** Feedback-Liste */
export function demoFeedbackListPayload() {
  const items = [
    { id: "fb-1", title: "Dark-Mode für Charts", description: "Bei dunklem Hintergrund sind die Linien-Charts schwer lesbar.", type: "improvement", status: "in_progress", priority: "medium", upvotes: 12, createdBy: "anna.weber@example.com", createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() },
    { id: "fb-2", title: "Excel-Export für Bestellungen", description: "Wäre praktisch wenn man eine Liste direkt als XLSX exportieren könnte.", type: "feature", status: "open", priority: "high", upvotes: 23, createdBy: "max.schmidt@example.com", createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() },
    { id: "fb-3", title: "Push-Benachrichtigungen", description: "Bei Out-of-Stock-Warnungen wäre eine Push-Nachricht hilfreich.", type: "feature", status: "open", priority: "low", upvotes: 8, createdBy: "lisa.fischer@example.com", createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString() },
    { id: "fb-4", title: "Tippfehler im Footer", description: "‚Imressum' statt ‚Impressum'.", type: "bug", status: "done", priority: "low", upvotes: 1, createdBy: "tobias.becker@example.com", createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() },
  ];
  return { items, feedback: items, metadata: { demo: true } };
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
