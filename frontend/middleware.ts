import { NextRequest, NextResponse } from "next/server";
import { verifyToken, COOKIE_NAME } from "./lib/auth";

export async function middleware(req: NextRequest) {
  const password = process.env.AUTH_PASSWORD;

  // Dev mode: no password set → pass through
  if (!password) return NextResponse.next();

  const { pathname } = req.nextUrl;

  // Allow auth routes and login page
  if (pathname === "/login" || pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  const token = req.cookies.get(COOKIE_NAME)?.value;

  if (token) {
    try {
      const valid = await verifyToken(token, password);
      if (valid) return NextResponse.next();
    } catch {
      // Invalid token format — fall through to redirect
    }
  }

  const loginUrl = new URL("/login", req.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static, _next/image (Next.js internals)
     * - icon.svg (favicon)
     * - Files with extensions (e.g. .css, .js, .png)
     */
    "/((?!_next/static|_next/image|icon\\.svg|.*\\..*).*)",
  ],
};
