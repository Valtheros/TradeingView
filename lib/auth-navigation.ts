export type AuthSearchParams = Promise<{ returnTo?: string | string[] }>;

export function safeReturnTo(value: unknown): string {
  if (typeof value !== "string") return "/";
  if (["/", "/watchlist", "/news"].includes(value)) return value;
  return /^\/stocks\/[A-Z0-9][A-Z0-9.-]{0,14}$/i.test(value) ? value : "/";
}

export function authHref(page: "/sign-in" | "/sign-up" | "/verify-email" | "/forgot-password", destination: unknown) {
  const returnTo = safeReturnTo(destination);
  return returnTo === "/" ? page : `${page}?returnTo=${encodeURIComponent(returnTo)}`;
}
