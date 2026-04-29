import { NextResponse } from "next/server";
import { DEMO_AUTH_COOKIE, DEMO_USER, isDemoMode } from "@/shared/lib/demoMode";

/**
 * GET /api/demo/me — gibt den Demo-User zurück, wenn Demo-Mode aktiv ist
 * UND der User den Demo-Cookie gesetzt hat. Wird vom `useUser`-Hook
 * verwendet als Quelle der Wahrheit für Demo-Sessions.
 */
export async function GET(request: Request) {
  if (!isDemoMode()) {
    return NextResponse.json({ ok: false, user: null });
  }

  const cookieHeader = request.headers.get("cookie") ?? "";
  const hasDemoCookie = new RegExp(`(?:^|;\\s*)${DEMO_AUTH_COOKIE}=`).test(cookieHeader);

  if (!hasDemoCookie) {
    return NextResponse.json({ ok: true, user: null });
  }

  return NextResponse.json({ ok: true, user: DEMO_USER });
}
