import { NextResponse } from "next/server";
import {
  extractOrdersArray,
  fressnapfGet,
  getFressnapfIntegrationConfig,
  type FressnapfIntegrationConfig,
} from "@/shared/lib/fressnapfApiClient";
import { withAuth } from "@/shared/lib/apiAuth";

/**
 * Probe: zieht Stichproben roher Orders aus drei Filter-Varianten
 * (kein Filter / channel_codes=fn_de / channel_codes=fn_at) und extrahiert
 * Felder, die DE/AT unterscheiden könnten. Der DE-Operator hat laut
 * Seller-Portal-UI einen `fn_at`-Channel — Probe bestätigt empirisch,
 * ob OR11 den Channel-Filter unterstützt und welches Order-Feld den Code trägt.
 * **Owner/Admin only.** Nutzung: /api/fressnapf/orders-inspect?limit=20
 */
type Discriminator = {
  orderId: string | null;
  shipping_zone_code: string | null;
  shop_id: string | null;
  channel: string | null;
  channel_code: string | null;
  currency_iso_code: string | null;
  shipping_country_iso_code: string | null;
  billing_country_iso_code: string | null;
  customer_country_iso_code: string | null;
};

const pickStr = (v: unknown): string | null => {
  if (typeof v === "string" && v.trim()) return v.trim();
  if (typeof v === "number") return String(v);
  return null;
};
const getProp = (obj: unknown, key: string): unknown => {
  if (!obj || typeof obj !== "object") return undefined;
  return (obj as Record<string, unknown>)[key];
};

function buildDiscriminator(raw: unknown): Discriminator {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const customer = getProp(o, "customer");
  const shipping = getProp(customer, "shipping_address") ?? getProp(o, "shipping_address");
  const billing = getProp(customer, "billing_address") ?? getProp(o, "billing_address");
  return {
    orderId:
      pickStr(o.order_id) ?? pickStr(o.id) ?? pickStr(o.commercial_id) ?? pickStr(o.number),
    shipping_zone_code: pickStr(o.shipping_zone_code) ?? pickStr(o.shipping_zone),
    shop_id: pickStr(o.shop_id) ?? pickStr(o.shop) ?? pickStr(getProp(o, "shop")),
    channel: pickStr(o.channel),
    channel_code: pickStr(o.channel_code),
    currency_iso_code: pickStr(o.currency_iso_code) ?? pickStr(o.currency),
    shipping_country_iso_code:
      pickStr(getProp(shipping, "country_iso_code")) ?? pickStr(getProp(shipping, "country")),
    billing_country_iso_code:
      pickStr(getProp(billing, "country_iso_code")) ?? pickStr(getProp(billing, "country")),
    customer_country_iso_code:
      pickStr(getProp(customer, "country_iso_code")) ?? pickStr(getProp(customer, "country")),
  };
}

function tally(samples: Discriminator[], key: keyof Discriminator): Record<string, number> {
  const out: Record<string, number> = {};
  for (const s of samples) {
    const v = s[key];
    const k = v == null ? "<null>" : v;
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

function distributionsOf(samples: Discriminator[]) {
  return {
    shipping_zone_code: tally(samples, "shipping_zone_code"),
    shop_id: tally(samples, "shop_id"),
    channel: tally(samples, "channel"),
    channel_code: tally(samples, "channel_code"),
    currency_iso_code: tally(samples, "currency_iso_code"),
    shipping_country_iso_code: tally(samples, "shipping_country_iso_code"),
    billing_country_iso_code: tally(samples, "billing_country_iso_code"),
    customer_country_iso_code: tally(samples, "customer_country_iso_code"),
  };
}

async function probe(cfg: FressnapfIntegrationConfig, limit: number, channelCodes: string | null) {
  const sizeName = cfg.pageSizeParam === "max" ? "max" : "limit";
  const params = new URLSearchParams();
  params.set(sizeName, String(limit));
  params.set("offset", "0");
  if (channelCodes) params.set("channel_codes", channelCodes);
  const path = `${cfg.ordersPath}?${params.toString()}`;
  const res = await fressnapfGet(cfg, path);
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  if (!res.ok || json == null) {
    return {
      filter: channelCodes ?? "<none>",
      ok: false,
      status: res.status,
      hint: text.replace(/\s+/g, " ").trim().slice(0, 300),
    } as const;
  }
  const orders = extractOrdersArray(json);
  const samples = orders.slice(0, limit).map(buildDiscriminator);
  const firstRawKeys =
    orders.length > 0 && orders[0] && typeof orders[0] === "object"
      ? Object.keys(orders[0] as Record<string, unknown>).sort()
      : [];
  return {
    filter: channelCodes ?? "<none>",
    ok: true,
    status: res.status,
    totalReturned: orders.length,
    sampled: samples.length,
    distributions: distributionsOf(samples),
    firstRawKeys,
    sampleOrderIds: samples.map((s) => s.orderId).slice(0, 10),
    samples,
  } as const;
}

export const GET = withAuth(
  async ({ req: request }) => {
    const cfg = await getFressnapfIntegrationConfig();
    if (!cfg.apiKey || !cfg.baseUrl) {
      return NextResponse.json({ error: "Fressnapf API nicht konfiguriert." }, { status: 500 });
    }
    const { searchParams } = new URL(request.url);
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") ?? "10") || 10));

    const [noFilter, deFilter, atFilter] = await Promise.all([
      probe(cfg, limit, null),
      probe(cfg, limit, "fn_de"),
      probe(cfg, limit, "fn_at"),
    ]);

    return NextResponse.json({
      meta: {
        baseUrl: cfg.baseUrl,
        ordersPath: cfg.ordersPath,
        limit,
      },
      probes: {
        noFilter,
        channel_fn_de: deFilter,
        channel_fn_at: atFilter,
      },
    });
  },
  { requiredRole: ["owner", "admin"] }
);
