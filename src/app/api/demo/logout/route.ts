import { NextResponse } from "next/server";
import { DEMO_AUTH_COOKIE, isDemoMode } from "@/shared/lib/demoMode";

/** POST /api/demo/logout — löscht den Demo-Auth-Cookie. */
export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(DEMO_AUTH_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}

export async function GET(request: Request) {
  const response = NextResponse.redirect(new URL("/login", request.url));
  if (isDemoMode()) {
    response.cookies.set(DEMO_AUTH_COOKIE, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });
  }
  return response;
}
