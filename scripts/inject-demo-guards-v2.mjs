#!/usr/bin/env node
/**
 * Injects DEMO_MODE guards into all API routes that need them.
 * Idempotent — running twice does nothing extra.
 *
 * Three categories:
 *   - GET routes returning seed data (static)
 *   - GET routes with dynamic params (need a custom call)
 *   - Mutation routes (POST/PUT/DELETE) returning `{ ok: true }`
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// GET routes with static seed responses
const GET_STATIC = [
  // Analytics
  { f: "src/app/api/analytics/marketplace-article-sales/route.ts", call: "demoMarketplaceArticleSalesPayload()" },
  { f: "src/app/api/analytics/weekly-report/route.ts", call: "demoWeeklyReportPayload()" },
  { f: "src/app/api/analytics/weekly-report/notes/route.ts", call: "demoWeeklyReportNotesPayload()" },
  // Marketplaces (cross-marketplace)
  { f: "src/app/api/marketplaces/price-parity/route.ts", call: "demoPriceParityPayload()" },
  { f: "src/app/api/marketplaces/price-stock-overrides/route.ts", call: "demoPriceStockOverridesPayload()" },
  { f: "src/app/api/marketplaces/promotion-deals/route.ts", call: "demoPromotionDealsPayload()" },
  { f: "src/app/api/marketplaces/sales-config-status/route.ts", call: "demoSalesConfigStatusPayload()" },
  // Payouts
  { f: "src/app/api/payouts/overview/route.ts", call: "demoPayoutsOverviewPayload()" },
  { f: "src/app/api/payouts/periods/route.ts", call: "demoPayoutsPeriodsPayload()" },
  // Settings & community
  { f: "src/app/api/users/route.ts", call: "demoUsersListPayload()" },
  { f: "src/app/api/updates/route.ts", call: "demoUpdatesListPayload()" },
  { f: "src/app/api/feedback/route.ts", call: "demoFeedbackListPayload()" },
  // Procurement
  { f: "src/app/api/procurement/lines/route.ts", call: "demoProcurementLinesPayload()" },
  // Cross-Listing
  { f: "src/app/api/cross-listing/drafts/route.ts", call: "demoCrossListingDraftsPayload()" },
  { f: "src/app/api/cross-listing/source-data/route.ts", call: "demoCrossListingSourceDataPayload()" },
  // Xentral Tags
  { f: "src/app/api/xentral/product-tags/route.ts", call: "demoXentralProductTagsPayload()" },
  { f: "src/app/api/xentral/product-tags/definitions/route.ts", call: "demoXentralProductTagDefinitionsPayload()" },
  // Advertising
  { f: "src/app/api/advertising/route.ts", call: "demoAdvertisingPayload()" },
  // Amazon
  { f: "src/app/api/amazon/products/drafts/route.ts", call: "demoAmazonDraftsPayload()" },
  { f: "src/app/api/amazon/rulebook/route.ts", call: "demoAmazonRulebookPayload()" },
  // Tutorials (state)
  { f: "src/app/api/tutorials/progress/route.ts", call: "demoTutorialsProgressPayload()" },
  { f: "src/app/api/tutorials/runtime/route.ts", call: "demoTutorialsRuntimePayload()" },
  // Misc
  { f: "src/app/api/address-suggest/route.ts", call: "demoAddressSuggestPayload()" },
  { f: "src/app/api/dashboard-access-config/route.ts", call: "demoSeedFor('dashboard-access-config')" },
  // Marketplace root config endpoints (return empty config)
  { f: "src/app/api/amazon/route.ts", call: "demoSeedFor('amazon')" },
  { f: "src/app/api/amazon/marketplace-config/route.ts", call: "demoSeedFor('amazon')" },
  { f: "src/app/api/ebay/route.ts", call: "demoSeedFor('ebay')" },
  { f: "src/app/api/otto/route.ts", call: "demoSeedFor('otto')" },
  { f: "src/app/api/kaufland/route.ts", call: "demoSeedFor('kaufland')" },
  { f: "src/app/api/fressnapf/route.ts", call: "demoSeedFor('fressnapf')" },
  { f: "src/app/api/mediamarkt-saturn/route.ts", call: "demoSeedFor('mediamarkt-saturn')" },
  { f: "src/app/api/zooplus/route.ts", call: "demoSeedFor('zooplus')" },
  { f: "src/app/api/shopify/route.ts", call: "demoSeedFor('shopify')" },
  { f: "src/app/api/tiktok/route.ts", call: "demoSeedFor('tiktok')" },
  { f: "src/app/api/xentral/route.ts", call: "demoSeedFor('xentral')" },
];

// GET routes with dynamic [slug] / [sku] params — need custom guard placement
const GET_DYNAMIC = [
  // Marketplace-Detail
  {
    f: "src/app/api/marketplace-detail/[slug]/overview/route.ts",
    seedFn: "demoMarketplaceDetailOverview",
    extractParam: "const _slug = (await ctx.params).slug;",
    callExpression: "demoMarketplaceDetailOverview(_slug)",
  },
  {
    f: "src/app/api/marketplace-detail/[slug]/products/route.ts",
    seedFn: "demoMarketplaceDetailProducts",
    extractParam: "const _slug = (await ctx.params).slug;",
    callExpression: "demoMarketplaceDetailProducts(_slug)",
  },
  // Amazon product detail
  {
    f: "src/app/api/amazon/products/[sku]/route.ts",
    seedFn: "demoAmazonProductDetailPayload",
    extractParam: "const _sku = (await ctx.params).sku;",
    callExpression: "demoAmazonProductDetailPayload(_sku)",
  },
  // Amazon-by-locale (DE/US/UK/etc.)
  {
    f: "src/app/api/amazon/[amazonSlug]/orders/route.ts",
    seedFn: "demoOrdersPayload",
    extractParam: "",
    callExpression: 'demoOrdersPayload("amazon")',
  },
  {
    f: "src/app/api/amazon/[amazonSlug]/products/route.ts",
    seedFn: "demoProductsPayload",
    extractParam: "",
    callExpression: 'demoProductsPayload("amazon")',
  },
  {
    f: "src/app/api/amazon/[amazonSlug]/sales/route.ts",
    seedFn: "demoSalesPayload",
    extractParam: "",
    callExpression: 'demoSalesPayload("amazon")',
  },
  {
    f: "src/app/api/amazon/[amazonSlug]/products/[sku]/route.ts",
    seedFn: "demoAmazonProductDetailPayload",
    extractParam: "const _sku = (await ctx.params).sku;",
    callExpression: "demoAmazonProductDetailPayload(_sku)",
  },
];

// Mutation routes (POST/PUT/PATCH/DELETE) — return demoMutationOk()
const MUTATION_ROUTES = [
  // Stock / Sync / Submit / etc — write operations that should not actually run
  "src/app/api/payouts/amazon/sync/route.ts",
  "src/app/api/payouts/mirakl/sync/route.ts",
  "src/app/api/payouts/shopify/sync/route.ts",
  "src/app/api/procurement/import/route.ts",
  "src/app/api/shopify/products/stock-sync/route.ts",
  "src/app/api/xentral/delivery-sales-cache/sync/route.ts",
  "src/app/api/cross-listing/optimize/route.ts",
  "src/app/api/cross-listing/submit/route.ts",
  "src/app/api/marketplaces/integration-cache/refresh/route.ts",
  "src/app/api/marketplaces/price-parity/verify/route.ts",
  "src/app/api/marketplaces/stock-sync/route.ts",
  "src/app/api/amazon/translate/route.ts",
  "src/app/api/amazon/content-audit/route.ts",
  "src/app/api/amazon/orders/solicitation/route.ts",
  "src/app/api/amazon/marketplace-config/activate/route.ts",
  "src/app/api/amazon/marketplace-config/deactivate/route.ts",
  "src/app/api/amazon/products/[sku]/submit/route.ts",
  "src/app/api/amazon/[amazonSlug]/products/[sku]/submit/route.ts",
  "src/app/api/feedback/download/route.ts",
  "src/app/api/analytics/weekly-report/export/route.ts",
  "src/app/api/xentral/articles/export/route.ts",
  "src/app/api/xentral/product-debug/route.ts",
  "src/app/api/xentral/product-tags/sku/route.ts",
  "src/app/api/xentral/sales-order-shipping/route.ts",
  "src/app/api/marketplace-detail/[slug]/export/route.ts",
  "src/app/api/otto/task-status/route.ts",
];

const DEMO_GUARD_MARKER = "if (isDemoMode()";

function injectStatic({ f, call }) {
  const filePath = join(ROOT, f);
  let src;
  try {
    src = readFileSync(filePath, "utf8");
  } catch (err) {
    return { result: "skip", reason: err.message };
  }
  if (src.includes(DEMO_GUARD_MARKER)) return { result: "already" };

  const seedFnName = call.match(/^([a-zA-Z0-9_]+)/)?.[1] ?? "demoSeedFor";

  // Find first GET handler — handle multiline signatures
  const getRegex = /^export async function GET\([^)]*\)\s*\{|^export async function GET\(\s*\n[^)]*\n\s*\)\s*\{|^export function GET\([^)]*\)\s*\{/m;
  const getMatch = src.match(getRegex);
  if (!getMatch) return { result: "skip", reason: "no GET handler" };

  let newSrc = src;
  if (!src.includes(`from "@/shared/lib/demoMode"`)) {
    newSrc = `import { isDemoMode } from "@/shared/lib/demoMode";\n` + newSrc;
  }
  if (!src.includes(seedFnName)) {
    newSrc = `import { ${seedFnName} } from "@/shared/lib/demoSeed";\n` + newSrc;
  }
  if (!newSrc.match(/from "next\/server"/)) {
    newSrc = `import { NextResponse } from "next/server";\n` + newSrc;
  }

  const guardLine = `\n  if (isDemoMode()) return NextResponse.json(${call});`;
  newSrc = newSrc.replace(getRegex, (match) => `${match}${guardLine}`);

  writeFileSync(filePath, newSrc, "utf8");
  return { result: "ok" };
}

function injectDynamic({ f, seedFn, extractParam, callExpression }) {
  const filePath = join(ROOT, f);
  let src;
  try {
    src = readFileSync(filePath, "utf8");
  } catch (err) {
    return { result: "skip", reason: err.message };
  }
  if (src.includes(DEMO_GUARD_MARKER)) return { result: "already" };

  // Match GET handler with ctx parameter
  const getRegex = /^export async function GET\([^)]*ctx[^)]*\)\s*\{/m;
  const getMatch = src.match(getRegex);
  if (!getMatch) {
    // Fallback: try to find any GET handler, use simplest call form (no params)
    const fallbackRegex = /^export async function GET\([^)]*\)\s*\{/m;
    const fallbackMatch = src.match(fallbackRegex);
    if (!fallbackMatch) return { result: "skip", reason: "no GET handler" };

    let newSrc = src;
    if (!src.includes(`from "@/shared/lib/demoMode"`)) {
      newSrc = `import { isDemoMode } from "@/shared/lib/demoMode";\n` + newSrc;
    }
    if (!src.includes(seedFn)) {
      newSrc = `import { ${seedFn} } from "@/shared/lib/demoSeed";\n` + newSrc;
    }
    if (!newSrc.match(/from "next\/server"/)) {
      newSrc = `import { NextResponse } from "next/server";\n` + newSrc;
    }
    const guardLine = `\n  if (isDemoMode()) return NextResponse.json(${callExpression});`;
    newSrc = newSrc.replace(fallbackRegex, (m) => `${m}${guardLine}`);
    writeFileSync(filePath, newSrc, "utf8");
    return { result: "ok-fallback" };
  }

  let newSrc = src;
  if (!src.includes(`from "@/shared/lib/demoMode"`)) {
    newSrc = `import { isDemoMode } from "@/shared/lib/demoMode";\n` + newSrc;
  }
  if (!src.includes(seedFn)) {
    newSrc = `import { ${seedFn} } from "@/shared/lib/demoSeed";\n` + newSrc;
  }
  if (!newSrc.match(/from "next\/server"/)) {
    newSrc = `import { NextResponse } from "next/server";\n` + newSrc;
  }

  const guardLine = `\n  if (isDemoMode()) {\n    ${extractParam}\n    return NextResponse.json(${callExpression});\n  }`;
  newSrc = newSrc.replace(getRegex, (m) => `${m}${guardLine}`);
  writeFileSync(filePath, newSrc, "utf8");
  return { result: "ok" };
}

function injectMutation(f) {
  const filePath = join(ROOT, f);
  let src;
  try {
    src = readFileSync(filePath, "utf8");
  } catch (err) {
    return { result: "skip", reason: err.message };
  }
  if (src.includes(DEMO_GUARD_MARKER)) return { result: "already" };

  // Find ALL HTTP method handlers (POST/PUT/PATCH/DELETE) and inject demo guards.
  const methodRegex = /^export async function (POST|PUT|PATCH|DELETE)\([^)]*\)\s*\{/gm;
  let newSrc = src;
  let injected = 0;
  newSrc = newSrc.replace(methodRegex, (match) => {
    injected++;
    return `${match}\n  if (isDemoMode()) return NextResponse.json({ ok: true, demo: true });`;
  });

  // Also inject into GET if present (for routes like `weekly-report/export`).
  const getRegex = /^export async function GET\([^)]*\)\s*\{/m;
  if (getRegex.test(newSrc) && !newSrc.includes(DEMO_GUARD_MARKER)) {
    newSrc = newSrc.replace(getRegex, (match) => {
      injected++;
      return `${match}\n  if (isDemoMode()) return NextResponse.json({ ok: true, demo: true });`;
    });
  }

  if (injected === 0) return { result: "skip", reason: "no HTTP method handler" };

  // Add imports
  if (!src.includes(`from "@/shared/lib/demoMode"`)) {
    newSrc = `import { isDemoMode } from "@/shared/lib/demoMode";\n` + newSrc;
  }
  if (!newSrc.match(/from "next\/server"/)) {
    newSrc = `import { NextResponse } from "next/server";\n` + newSrc;
  }

  writeFileSync(filePath, newSrc, "utf8");
  return { result: "ok", injected };
}

const results = { ok: 0, already: 0, skip: 0, fail: 0 };
const log = (label, file, r) => {
  if (r.result === "ok" || r.result === "ok-fallback") {
    results.ok++;
    console.log(`[${label} ok] ${file}${r.injected ? ` (${r.injected} handler)` : ""}`);
  } else if (r.result === "already") {
    results.already++;
  } else if (r.result === "skip") {
    results.skip++;
    console.warn(`[${label} skip] ${file}: ${r.reason}`);
  } else {
    results.fail++;
    console.error(`[${label} fail] ${file}: ${r.reason}`);
  }
};

console.log("\n— Static GET routes —");
for (const item of GET_STATIC) log("static", item.f, injectStatic(item));

console.log("\n— Dynamic-param GET routes —");
for (const item of GET_DYNAMIC) log("dynamic", item.f, injectDynamic(item));

console.log("\n— Mutation routes —");
for (const f of MUTATION_ROUTES) log("mutation", f, injectMutation(f));

console.log(
  `\nDone. ok=${results.ok}, already=${results.already}, skip=${results.skip}, fail=${results.fail}`
);
process.exit(results.fail ? 1 : 0);
