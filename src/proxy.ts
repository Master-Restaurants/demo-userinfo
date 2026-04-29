import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/shared/lib/supabase/env";
import { resolveLocalDevEmailFromRequest } from "@/shared/lib/localDevAuth";
import { DEMO_AUTH_COOKIE, isDemoMode } from "@/shared/lib/demoMode";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/forgot-password",
  "/auth/callback",
  "/auth/reset",
  "/api/invitations/register-init",
  "/api/invitations/lookup",
  "/api/invitations/complete",
  "/api/dev/local-auth",
  "/api/integration-cache/warm",
  // Demo-Mode-Endpoints sind ebenfalls public (Login-Klick muss ohne Session funktionieren).
  "/api/demo/login",
  "/api/demo/me",
  "/api/demo/logout",
];

function isAuthPagePath(pathname: string): boolean {
  return pathname.startsWith("/login") || pathname.startsWith("/forgot-password");
}

export default async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isPublicPath = PUBLIC_PATHS.some((path) => pathname.startsWith(path));
  const shouldRedirectIfLoggedIn = isAuthPagePath(pathname);

  // Demo-Mode hat höchste Priorität: User mit Demo-Cookie ist eingeloggt.
  if (isDemoMode()) {
    const hasDemoCookie = Boolean(request.cookies.get(DEMO_AUTH_COOKIE)?.value);

    if (hasDemoCookie) {
      // Eingeloggt: Login-Seite skippen.
      if (isPublicPath && shouldRedirectIfLoggedIn) {
        return NextResponse.redirect(new URL("/", request.url));
      }
      return NextResponse.next({ request });
    }

    // Nicht eingeloggt: nur public Pfade erlauben.
    if (isPublicPath) {
      return NextResponse.next({ request });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Normaler (Nicht-Demo-)Fall: erst Local-Dev, dann Supabase.
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    if (process.env.NEXT_PHASE === "phase-production-build") {
      return NextResponse.next({ request });
    }
    return new NextResponse("Konfigurationsfehler: NEXT_PUBLIC_SUPABASE_URL / Anon-Key fehlen.", {
      status: 500,
    });
  }

  const localDevEmail = resolveLocalDevEmailFromRequest(request);
  let response = NextResponse.next({ request });

  if (localDevEmail) {
    if (isPublicPath && shouldRedirectIfLoggedIn) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return response;
  }

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (isPublicPath && user && shouldRedirectIfLoggedIn) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (!user) {
    if (isPublicPath) {
      return response;
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return response;
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
