import { createQuoteLoader } from "./quotes";
import { getFinnhubApiKey } from "./finnhub/env";

export const getQuotes = createQuoteLoader(async (symbol) => {
  const token = getFinnhubApiKey();
  if (!token) throw new Error("Missing Finnhub key");
  const response = await fetch(`https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}`, {
    headers: { "X-Finnhub-Token": token },
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  return {
    ok: response.ok, status: response.status,
    retryAfter: Number(response.headers.get("retry-after")) || 60,
    data: response.ok ? await response.json() : {},
  };
});
