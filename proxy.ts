import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/utils/supabase/proxy";

export function proxy(request: NextRequest) {
  // The MVP preview is entirely local and must also work without Supabase.
  if (
    request.nextUrl.pathname === "/" ||
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
