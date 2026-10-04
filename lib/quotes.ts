export type StockQuote = {
  symbol: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  quoteTime: string | null;
  fetchedAt: string;
  status: "ready" | "unavailable";
};

export type QuoteBatch = { quotes: StockQuote[]; retryAfter: number };
export const QUOTE_INTERVAL = 60_000;

export function parseSymbols(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 20) return null;
  if (!value.every((s) => typeof s === "string" && /^[A-Z0-9][A-Z0-9.-]{0,14}$/i.test(s.trim()))) return null;
  return [...new Set(value.map((s: string) => s.trim().toUpperCase()))];
}

export function shouldRefreshQuotes(visible: boolean, online: boolean, lastFetch: number, now: number) {
  return visible && online && now - lastFetch >= QUOTE_INTERVAL;
}

export function mergeQuotes(previous: Record<string, StockQuote>, incoming: StockQuote[]) {
  const next = { ...previous };
  for (const quote of incoming) {
    const old = previous[quote.symbol];
    next[quote.symbol] = quote.status === "unavailable" && old && old.price !== null
      ? { ...old, status: "unavailable" }
      : quote;
  }
  return next;
}

// Shared per server process: deduplicate symbols and bound concurrent upstream requests.
export function createQuoteLoader(
  fetchQuote: (symbol: string) => Promise<{ ok: boolean; status: number; retryAfter?: number; data: Record<string, unknown> }>,
  now = Date.now,
) {
  const cache = new Map<string, { quote: StockQuote; expires: number }>();
  const pending = new Map<string, Promise<StockQuote>>();
  const waiting: Array<() => void> = [];
  let active = 0;
  let blockedUntil = 0;

  const unavailable = (symbol: string): StockQuote => ({
    symbol, price: null, change: null, changePercent: null, quoteTime: null,
    fetchedAt: new Date(now()).toISOString(), status: "unavailable",
  });

  async function load(symbol: string): Promise<StockQuote> {
    const saved = cache.get(symbol);
    if (saved && saved.expires > now()) return saved.quote;
    if (pending.has(symbol)) return pending.get(symbol)!;
    const task = (async () => {
      if (active >= 4) await new Promise<void>((resolve) => waiting.push(resolve));
      else active++;
      try {
        if (now() < blockedUntil) return unavailable(symbol);
        const response = await fetchQuote(symbol);
        if (response.status === 429) {
          blockedUntil = now() + Math.max(60, Math.min(response.retryAfter || 60, 900)) * 1000;
        }
        const { c, d, dp, t } = response.data;
        if (!response.ok || typeof c !== "number" || !Number.isFinite(c) || c <= 0) return unavailable(symbol);
        const finite = (v: unknown) => typeof v === "number" && Number.isFinite(v) ? v : null;
        const stamp = typeof t === "number" && t > 0 && t <= now() / 1000 + 300 ? t * 1000 : null;
        const quote: StockQuote = {
          symbol, price: c, change: finite(d), changePercent: finite(dp),
          quoteTime: stamp ? new Date(stamp).toISOString() : null,
          fetchedAt: new Date(now()).toISOString(), status: "ready",
        };
        if (cache.size >= 500) cache.delete(cache.keys().next().value!);
        cache.set(symbol, { quote, expires: now() + QUOTE_INTERVAL });
        return quote;
      } catch {
        return unavailable(symbol);
      } finally {
        const next = waiting.shift();
        if (next) next();
        else active--;
      }
    })();
    pending.set(symbol, task);
    try { return await task; }
    finally { pending.delete(symbol); }
  }

  return async (symbols: string[]): Promise<QuoteBatch> => ({
    quotes: await Promise.all(symbols.map(load)),
    retryAfter: Math.max(0, Math.ceil((blockedUntil - now()) / 1000)),
  });
}
