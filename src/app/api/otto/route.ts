import { demoSeedFor } from "@/shared/lib/demoSeed";
import { isDemoMode } from "@/shared/lib/demoMode";
import { NextResponse } from "next/server";

export async function GET() {
  if (isDemoMode()) return NextResponse.json(demoSeedFor('otto'));
  return NextResponse.json({ source: "otto", status: "ok" });
}
