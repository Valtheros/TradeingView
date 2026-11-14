import { NextRequest, NextResponse } from 'next/server';
import { getSessionCookie } from "better-auth/cookies";
import { authHref } from "./lib/auth-navigation";
import { parseSymbols } from "./lib/quotes";

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/stocks/')) {
    if (!parseSymbols([request.nextUrl.pathname.slice(8)])) {
      // Reject malformed symbols before streaming commits a 200 response.
      return NextResponse.rewrite(new URL('/_not-found', request.url), { status: 404 });
    }
    return NextResponse.next();
  }
const sessionCookie = getSessionCookie(request);

 // Check cookie presence - prevents obviously unauthorized users
  if (!sessionCookie) {
    return NextResponse.redirect(new URL(authHref('/sign-in', request.nextUrl.pathname), request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/watchlist/:path*',
    '/news/:path*',
    '/stocks/:path*',
  ],
};
