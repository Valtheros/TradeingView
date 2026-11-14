import { NextRequest, NextResponse } from 'next/server';
import { getSessionCookie } from "better-auth/cookies";
import { authHref } from "./lib/auth-navigation";

export async function proxy(request: NextRequest) {
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
  ],
};
