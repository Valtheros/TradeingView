import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { getSessionCookie } from "better-auth/cookies";
import { getAuth } from "./auth";

// React cache is request-scoped; never share a user's session across requests.
export const getCurrentSession = cache(async () => {
  const requestHeaders = await headers();
  if (!getSessionCookie(requestHeaders)) return null;
  const auth = await getAuth();
  return auth.api.getSession({ headers: requestHeaders });
});
