#!/usr/bin/env node
/**
 * Patches marketplace API routes to short-circuit in DEMO_MODE.
 * Idempotent — safe to run multiple times.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, basename } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// Each entry: file path (relative to project root) + demo seed call.
const PATCHES = [
  // Amazon
  { f: "src/app/api/amazon/products/route.ts", call: 'demoProductsPayload("amazon")' },
  { f: "src/app/api/amazon/sales/route.ts", call: 'demoSalesPayload("amazon")' },
  // eBay
  { f: "src/app/api/ebay/orders/route.ts", call: 'demoOrdersPayload("ebay")' },
  { f: "src/app/api/ebay/products/route.ts", call: 'demoProductsPayload("ebay")' },
  { f: "src/app/api/ebay/sales/route.ts", call: 'demoSalesPayload("ebay")' },
  // Otto
  { f: "src/app/api/otto/orders/route.ts", call: 'demoOrdersPayload("otto")' },
  { f: "src/app/api/otto/products/route.ts", call: 'demoProductsPayload("otto")' },
  { f: "src/app/api/otto/sales/route.ts", call: 'demoSalesPayload("otto")' },
  // Kaufland
  { f: "src/app/api/kaufland/orders/route.ts", call: 'demoOrdersPayload("kaufland")' },
  { f: "src/app/api/kaufland/products/route.ts", call: 'demoProductsPayload("kaufland")' },
  { f: "src/app/api/kaufland/sales/route.ts", call: 'demoSalesPayload("kaufland")' },
  // Fressnapf
  { f: "src/app/api/fressnapf/orders/route.ts", call: 'demoOrdersPayload("fressnapf")' },
  { f: "src/app/api/fressnapf/products/route.ts", call: 'demoProductsPayload("fressnapf")' },
  { f: "src/app/api/fressnapf/sales/route.ts", call: 'demoSalesPayload("fressnapf")' },
  // MediaMarkt-Saturn
  { f: "src/app/api/mediamarkt-saturn/orders/route.ts", call: 'demoOrdersPayload("mediamarkt-saturn")' },
  { f: "src/app/api/mediamarkt-saturn/products/route.ts", call: 'demoProductsPayload("mediamarkt-saturn")' },
  { f: "src/app/api/mediamarkt-saturn/sales/route.ts", call: 'demoSalesPayload("mediamarkt-saturn")' },
  // Zooplus
  { f: "src/app/api/zooplus/orders/route.ts", call: 'demoOrdersPayload("zooplus")' },
  { f: "src/app/api/zooplus/products/route.ts", call: 'demoProductsPayload("zooplus")' },
  { f: "src/app/api/zooplus/sales/route.ts", call: 'demoSalesPayload("zooplus")' },
  // Shopify
  { f: "src/app/api/shopify/orders/route.ts", call: 'demoOrdersPayload("shopify")' },
  { f: "src/app/api/shopify/products/route.ts", call: 'demoProductsPayload("shopify")' },
  { f: "src/app/api/shopify/sales/route.ts", call: 'demoSalesPayload("shopify")' },
  // TikTok
  { f: "src/app/api/tiktok/orders/route.ts", call: 'demoOrdersPayload("tiktok")' },
  { f: "src/app/api/tiktok/products/route.ts", call: 'demoProductsPayload("tiktok")' },
  { f: "src/app/api/tiktok/sales/route.ts", call: 'demoSalesPayload("tiktok")' },
  // Xentral
  { f: "src/app/api/xentral/orders/route.ts", call: 'demoXentralOrdersPayload()' },
  { f: "src/app/api/xentral/articles/route.ts", call: 'demoXentralProductsPayload()' },
  // Article-Forecast
  { f: "src/app/api/article-forecast/rules/route.ts", call: 'demoArticleForecastPayload()' },
];

const DEMO_GUARD_MARKER = "if (isDemoMode())";

const IMPORTS_BLOCK = (call) => {
  const seedFnName = call.split("(")[0];
  return `import { isDemoMode } from "@/shared/lib/demoMode";
import { ${seedFnName} } from "@/shared/lib/demoSeed";
import { NextResponse as __DemoNextResponse } from "next/server";
`;
};

let patched = 0;
let alreadyPatched = 0;
let failed = 0;

for (const { f, call } of PATCHES) {
  const filePath = join(ROOT, f);
  let src;
  try {
    src = readFileSync(filePath, "utf8");
  } catch (err) {
    console.warn(`[skip] ${f}: ${err.message}`);
    failed++;
    continue;
  }

  if (src.includes(DEMO_GUARD_MARKER)) {
    alreadyPatched++;
    continue;
  }

  // Find first `export async function GET(` line.
  const getMatch = src.match(/^export async function GET\([^)]*\)\s*\{/m);
  if (!getMatch) {
    console.warn(`[skip] ${f}: no GET handler matched`);
    failed++;
    continue;
  }

  const seedFnName = call.split("(")[0];

  // Insert imports at top (after any leading shebang/comments).
  let newSrc = src;
  // Idempotent imports
  if (!src.includes(`from "@/shared/lib/demoMode"`)) {
    newSrc = `import { isDemoMode } from "@/shared/lib/demoMode";\n` + newSrc;
  }
  if (!src.includes(`{ ${seedFnName}`) && !src.includes(`, ${seedFnName}`)) {
    newSrc = `import { ${seedFnName} } from "@/shared/lib/demoSeed";\n` + newSrc;
  }
  if (!newSrc.match(/from "next\/server"/)) {
    newSrc = `import { NextResponse } from "next/server";\n` + newSrc;
  }

  // Inject guard right after the GET handler opening brace.
  const guardLine = `\n  if (isDemoMode()) return NextResponse.json(${call});`;
  newSrc = newSrc.replace(
    /^(export async function GET\([^)]*\)\s*\{)/m,
    `$1${guardLine}`
  );

  writeFileSync(filePath, newSrc, "utf8");
  patched++;
  console.log(`[ok] ${f}`);
}

console.log(`\nDone. patched=${patched}, alreadyPatched=${alreadyPatched}, failed=${failed}`);
process.exit(failed ? 1 : 0);
