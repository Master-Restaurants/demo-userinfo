import { demoSeedFor } from "@/shared/lib/demoSeed";
import { isDemoMode } from "@/shared/lib/demoMode";
import { NextResponse } from "next/server";

export async function GET() {
  if (isDemoMode()) return NextResponse.json(demoSeedFor('xentral'));
  return NextResponse.json({ source: "xentral", status: "ok" });
}
