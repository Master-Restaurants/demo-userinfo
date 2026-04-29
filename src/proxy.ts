import { DEMO_AUTH_COOKIE, isDemoMode } from "@/shared/lib/demoMode";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/forgot-password",
  "/auth/callback",
  "/auth/reset",
  "/api/demo/login",
  "/api/demo/me",
  "/api/demo/logout",
];

function isAuthPagePath(pathname: string): boolean {
  return pathname.startsWith("/login") || pathname.startsWith("/forgot-password");
}

/**
 * Demo-Variante: keine Supabase-Auth, nur Cookie-Check.
 * - Mit Demo-Cookie → durchgelassen, Login-Page redirected zu /
 * - Ohne Demo-Cookie → nur Public-Pfade, sonst Redirect zu /login
 *
 * `NEXT_PUBLIC_DEMO_MODE=0` setzt den ganzen Proxy auf "pass-through" (für lokale
 * Entwicklung gegen echtes Backend — dann braucht es den vollen Original-Proxy).
 */
export default function proxy(request: NextRequest) {
  if (!isDemoMode()) {
    // Demo aus → Pass-through. (Original-Auth-Logik ist im Demo-Repo nicht enthalten.)
    return NextResponse.next();
  }

  const pathname = request.nextUrl.pathname;
  const isPublicPath = PUBLIC_PATHS.some((path) => pathname.startsWith(path));
  const shouldRedirectIfLoggedIn = isAuthPagePath(pathname);
  const hasDemoCookie = Boolean(request.cookies.get(DEMO_AUTH_COOKIE)?.value);

  if (hasDemoCookie) {
    if (isPublicPath && shouldRedirectIfLoggedIn) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  if (isPublicPath) {
    return NextResponse.next();
  }
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: [
    /*
     * Match alle Pfade außer:
     * - _next/static, _next/image
     * - favicon.ico, robots.txt, sitemap.xml
     * - Asset-Pfade (brand/...)
     */
    "/((?!_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml|brand).*)",
  ],
};
