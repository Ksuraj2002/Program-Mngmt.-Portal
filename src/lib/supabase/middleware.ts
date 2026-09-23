import { createServerClient, type SetAllCookies } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

const PUBLIC_PATHS = ["/login"];

// Legacy shared-secret projects: SUPABASE_JWT_SECRET (HS256).
// New signing-keys projects: JWKS at the project's well-known endpoint
// (ES256 / RS256). `jose` caches the JWKS after the first fetch.
const jwtSecret = process.env.SUPABASE_JWT_SECRET
  ? new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET)
  : null;

const jwks = (() => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  return createRemoteJWKSet(
    new URL(`${url.replace(/\/$/, "")}/auth/v1/.well-known/jwks.json`)
  );
})();

// Supabase's ssr helper stores the session as a chunked JSON cookie whose
// name is derived from the project ref. We only need the access_token out
// of it, so parse it cheaply here and verify locally instead of calling
// supabase.auth.getUser() (a network round trip on every request).
function readAccessToken(request: NextRequest): string | null {
  const projectRef =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.match(
      /^https?:\/\/([^.]+)\.supabase\.co/
    )?.[1] ?? null;
  if (!projectRef) return null;
  const base = `sb-${projectRef}-auth-token`;

  const chunks: string[] = [];
  const primary = request.cookies.get(base)?.value;
  if (primary) chunks.push(primary);
  let i = 0;
  while (true) {
    const c = request.cookies.get(`${base}.${i}`)?.value;
    if (!c) break;
    chunks.push(c);
    i += 1;
  }
  if (!chunks.length) return null;

  let raw = chunks.join("");
  if (raw.startsWith("base64-")) {
    try {
      raw = Buffer.from(raw.slice(7), "base64").toString("utf-8");
    } catch {
      return null;
    }
  }
  try {
    const parsed = JSON.parse(raw) as { access_token?: string };
    return parsed.access_token ?? null;
  } catch {
    return null;
  }
}

async function verifyAccessTokenLocally(
  token: string
): Promise<{ userId: string } | null> {
  let payload: JWTPayload | null = null;
  try {
    if (jwtSecret) {
      ({ payload } = await jwtVerify(token, jwtSecret));
    } else if (jwks) {
      ({ payload } = await jwtVerify(token, jwks));
    } else {
      return null;
    }
  } catch {
    return null;
  }
  if (typeof payload.sub !== "string") return null;
  return { userId: payload.sub };
}

export async function updateSession(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  let response = NextResponse.next({ request: { headers: requestHeaders } });
  const isPublicPath = PUBLIC_PATHS.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  // Fast path: verify the JWT locally with SUPABASE_JWT_SECRET. Skips the
  // ~150-300ms network hop to Supabase auth on every request.
  const token = readAccessToken(request);
  if (token) {
    const verified = await verifyAccessTokenLocally(token);
    if (verified) {
      if (request.nextUrl.pathname === "/login") {
        const url = request.nextUrl.clone();
        url.pathname = "/";
        url.search = "";
        return NextResponse.redirect(url);
      }
      requestHeaders.set("x-verified-user-id", verified.userId);
      return NextResponse.next({ request: { headers: requestHeaders } });
    }
  }

  // Slow path: no valid local verification (missing secret, expired token,
  // or the cookie needs refresh). Fall back to Supabase's SSR helper, which
  // also refreshes and re-writes cookies for us.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Parameters<SetAllCookies>[0]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request: { headers: requestHeaders } });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data } = await supabase.auth.getUser();

  if (!data.user && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  if (data.user && request.nextUrl.pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (data.user) {
    requestHeaders.set("x-verified-user-id", data.user.id);
    response = NextResponse.next({ request: { headers: requestHeaders } });
  }

  return response;
}
