import { type NextRequest, NextResponse } from "next/server";
import { refreshSession } from "@/utils/supabase/proxy";
import { legacyDemoDestination } from "@/lib/demoRoutes";

function isUnder(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/** Pages that need a signed-in person. /admin/onboarding stays open, as today. */
function needsSignIn(pathname: string) {
  if (isUnder(pathname, "/admin/onboarding")) return false;
  return isUnder(pathname, "/app") || isUnder(pathname, "/join") || isUnder(pathname, "/admin");
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Resolve old links before rendering, including the former modal routes.
  const destination = legacyDemoDestination(pathname);
  if (destination) return NextResponse.redirect(new URL(destination, request.url));

  // The browser-only demo stays exactly as it was.
  if (isUnder(pathname, "/preview")) return NextResponse.next();

  const { response, signedIn } = await refreshSession(request);

  // Only sends signed-out people to /login; who belongs where once signed in
  // is decided by each page from the person's own members row.
  if (!signedIn && needsSignIn(pathname)) {
    const login = new URL("/login", request.url);
    login.search = "";
    login.searchParams.set("next", `${pathname}${search}`);
    const redirect = NextResponse.redirect(login);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     * - image files
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
