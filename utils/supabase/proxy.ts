import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/**
 * Refreshes the Supabase session cookies for this request and reports whether
 * someone is signed in. Any redirect built from this must copy `response`'s
 * cookies, or a refreshed session would be lost.
 */
export const refreshSession = async (request: NextRequest) => {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl!, supabaseKey!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // Don't put code between createServerClient and getClaims: it refreshes an
  // expired session and validates the token.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);

  return { response, signedIn };
};

export const updateSession = async (request: NextRequest) => (await refreshSession(request)).response;
