import { parseSymbols } from "./quotes";

export function companyLogoUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "static2.finnhub.io" && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

export async function handleLogoRequest(
  request: Request,
  authenticated: () => Promise<boolean>,
  profile: (symbol: string) => Promise<{ logo?: string } | null>,
) {
  const headers = { "Cache-Control": "private, no-store" };
  try {
    if (!await authenticated()) return Response.json({ error: "Unauthorized" }, { status: 401, headers });
  } catch { return Response.json({ error: "Logo service unavailable" }, { status: 503, headers }); }
  const body = await request.json().catch(() => null);
  const symbols = parseSymbols(body?.symbols);
  if (!symbols) return Response.json({ error: "Provide between 1 and 20 valid symbols" }, { status: 400, headers });
  const logos: Record<string, string | null> = {};
  for (let i = 0; i < symbols.length; i += 4) {
    await Promise.all(symbols.slice(i, i + 4).map(async symbol => {
      try { logos[symbol] = companyLogoUrl((await profile(symbol))?.logo); }
      catch { logos[symbol] = null; }
    }));
  }
  return Response.json({ logos }, { headers });
}
