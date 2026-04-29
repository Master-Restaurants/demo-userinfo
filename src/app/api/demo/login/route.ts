import { NextResponse } from "next/server";
import { DEMO_AUTH_COOKIE, DEMO_USER, isDemoMode } from "@/shared/lib/demoMode";
import { collectVisitInfo, notifyDemoVisit } from "@/shared/lib/demoTelemetry";

function demoDisabled() {
  return NextResponse.json({ ok: false, error: "demo_mode_disabled" }, { status: 403 });
}

/** POST /api/demo/login — setzt den Demo-Auth-Cookie. Antwort: `{ ok: true }`. */
export async function POST(request: Request) {
  if (!isDemoMode()) return demoDisabled();

  // Visit logging + optional Telegram-Notification (fire-and-forget).
  notifyDemoVisit(collectVisitInfo(request));

  const response = NextResponse.json({ ok: true, user: DEMO_USER });
  response.cookies.set(DEMO_AUTH_COOKIE, DEMO_USER.id, {
    httpOnly: true,
    sameSite: "lax",
    // Sichere Cookies in Produktion (HTTPS), nicht in lokaler Dev-Umgebung.
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24, // 24h
  });
  return response;
}

/** GET /api/demo/login — same as POST, für einfaches Anklicken eines Links. */
export async function GET(request: Request) {
  if (!isDemoMode()) return demoDisabled();

  notifyDemoVisit(collectVisitInfo(request));

  const url = new URL(request.url);
  const next = url.searchParams.get("next") ?? "/";
  // Nur erlauben wenn der next-Pfad relative ist (kein Open-Redirect).
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";

  const response = NextResponse.redirect(new URL(safeNext, request.url));
  response.cookies.set(DEMO_AUTH_COOKIE, DEMO_USER.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24,
  });
  return response;
}
