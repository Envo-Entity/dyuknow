import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/utils/supabase/proxy";
import { legacyDemoDestination } from "@/lib/demoRoutes";

export function proxy(request: NextRequest) {
  // Resolve old links before rendering, including the former modal routes.
  const destination = legacyDemoDestination(request.nextUrl.pathname);
  if (destination) return NextResponse.redirect(new URL(destination, request.url));

  // The main app is a browser-local demo. Admin intake keeps its existing
  // Supabase session handling and submission path.
  if (
    request.nextUrl.pathname === "/" ||
    request.nextUrl.pathname === "/app" ||
    request.nextUrl.pathname.startsWith("/app/") ||
    request.nextUrl.pathname.startsWith("/preview")
  ) {
    return NextResponse.next();
  }
  return updateSession(request);
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
