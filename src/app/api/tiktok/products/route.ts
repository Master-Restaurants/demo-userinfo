import { demoProductsPayload } from "@/shared/lib/demoSeed";
import { isDemoMode } from "@/shared/lib/demoMode";
import { NextResponse } from "next/server";
import type { MarketplaceProductsListResponse } from "@/shared/lib/marketplaceProductList";

export async function GET() {
  if (isDemoMode()) return NextResponse.json(demoProductsPayload("tiktok"));
  return NextResponse.json(
    {
      items: [],
      error:
        "TikTok-Produktlisten sind in dieser Ansicht noch nicht angebunden (separater Product-API-Endpunkt erforderlich).",
    } satisfies MarketplaceProductsListResponse,
    { status: 501 }
  );
}
