"use server";

import {
  getDateRange,
  validateArticle,
  formatArticle,
  formatChangePercent,
  formatMarketCapValue,
  formatPrice,
} from "@/lib/utils";
import { POPULAR_STOCK_SYMBOLS } from "@/lib/constants";
import { cache } from "react";
import { getAuth } from "../better-auth/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Watchlist } from "@/database/models/watchlist.model";
import { getFinnhubApiKey } from "../finnhub/env";
import { parseSymbols } from "../quotes";

const FINNHUB_BASE_URL = "https://finnhub.io/api/v1";

type FinnhubCompanyProfile = {
  name?: string;
  ticker?: string;
  exchange?: string;
};

export const getStockProfile = cache(async (symbol: string): Promise<FinnhubCompanyProfile | null> => {
  const token = getFinnhubApiKey();
  if (!token) return null;
  try {
    const response = await fetch(`https://finnhub.io/api/v1/stock/profile2?symbol=${encodeURIComponent(symbol)}`, {
      headers: { "X-Finnhub-Token": token }, next: { revalidate: 3600 }, signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;
    return await response.json();
  } catch { return null; }
});

async function fetchJSON<T>(
  url: string,
  revalidateSeconds?: number
): Promise<T> {
  const options: RequestInit & { next?: { revalidate?: number } } =
    revalidateSeconds
      ? { cache: "force-cache", next: { revalidate: revalidateSeconds } }
      : { cache: "no-store" };

  const res = await fetch(url, options);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Fetch failed ${res.status}: ${text}`);
  }
  return (await res.json()) as T;
}

export { fetchJSON };

export async function getNews(
  symbols?: string[]
): Promise<MarketNewsArticle[]> {
  try {
    const range = getDateRange(5);
    const token = getFinnhubApiKey();
    if (!token) {
      throw new Error("FINNHUB API key is not configured");
    }
    const cleanSymbols = (symbols || [])
      .map((s) => s?.trim().toUpperCase())
      .filter((s): s is string => Boolean(s));

    const maxArticles = 6;

    // If we have symbols, try to fetch company news per symbol and round-robin select
    if (cleanSymbols.length > 0) {
      const perSymbolArticles: Record<string, RawNewsArticle[]> = {};

      await Promise.all(
        cleanSymbols.map(async (sym) => {
          try {
            const url = `${FINNHUB_BASE_URL}/company-news?symbol=${encodeURIComponent(
              sym
            )}&from=${range.from}&to=${range.to}&token=${token}`;
            const articles = await fetchJSON<RawNewsArticle[]>(url, 300);
            perSymbolArticles[sym] = (articles || []).filter(validateArticle);
          } catch (e) {
            console.error("Error fetching company news for", sym, e);
            perSymbolArticles[sym] = [];
          }
        })
      );

      const collected: MarketNewsArticle[] = [];
      // Round-robin up to 6 picks
      for (let round = 0; round < maxArticles; round++) {
        for (let i = 0; i < cleanSymbols.length; i++) {
          const sym = cleanSymbols[i];
          const list = perSymbolArticles[sym] || [];
          if (list.length === 0) continue;
          const article = list.shift();
          if (!article || !validateArticle(article)) continue;
          collected.push(formatArticle(article, true, sym, round));
          if (collected.length >= maxArticles) break;
        }
        if (collected.length >= maxArticles) break;
      }

      if (collected.length > 0) {
        // Sort by datetime desc
        collected.sort((a, b) => (b.datetime || 0) - (a.datetime || 0));
        return collected.slice(0, maxArticles);
      }
      // If none collected, fall through to general news
    }

    // General market news fallback or when no symbols provided
    const generalUrl = `${FINNHUB_BASE_URL}/news?category=general&token=${token}`;
    const general = await fetchJSON<RawNewsArticle[]>(generalUrl, 300);

    const seen = new Set<string>();
    const unique: RawNewsArticle[] = [];
    for (const art of general || []) {
      if (!validateArticle(art)) continue;
      const key = `${art.id}-${art.url}-${art.headline}`;
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(art);
      if (unique.length >= 20) break; // cap early before final slicing
    }

    const formatted = unique
      .slice(0, maxArticles)
      .map((a, idx) => formatArticle(a, false, undefined, idx));
    return formatted;
  } catch (err) {
    console.error("getNews error:", err);
    throw new Error("Failed to fetch news");
  }
}

export const searchStocks = cache(
  async (query?: string): Promise<StockWithWatchlistStatus[]> => {
    const auth = await getAuth();
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) redirect("/sign-in");
    if (query !== undefined && typeof query !== "string") return [];
    const trimmed = query?.trim() || "";
    if (trimmed.length > 80) return [];

    try {
      const token = getFinnhubApiKey();
      if (!token) throw new Error("FINNHUB API key is not configured");

      const [userWatchlistSymbols, results] = await Promise.all([
        Watchlist.find({ userId: session.user.id }, { symbol: 1 }).lean()
          .then((items) => items.map((item) => String(item.symbol))),
        trimmed
          ? fetchJSON<FinnhubSearchResponse>(`${FINNHUB_BASE_URL}/search?q=${encodeURIComponent(trimmed)}&exchange=US&token=${token}`, 1800)
              .then((data) => Array.isArray(data?.result) ? data.result : [])
          : Promise.all(POPULAR_STOCK_SYMBOLS.slice(0, 10).map(async (symbol) => {
              const profile = await getStockProfile(symbol);
              const name = profile?.name || profile?.ticker;
              return name ? { symbol, description: name, type: "Common Stock", exchange: profile?.exchange } : null;
            })),
      ]);

      // Resolve TradingView only when opening a stock, not for every search result.
      return results.filter((item): item is FinnhubSearchResult =>
        !!item && parseSymbols([item.symbol]) !== null && /^(Common Stock|Preferred Stock|ETP|ETF|ADR|GDR|REIT)$/i.test(item.type)
      ).slice(0, 10).map((item) => ({
        symbol: item.symbol.trim().toUpperCase(),
        name: item.description || item.symbol,
        exchange: item.exchange || "US",
        type: item.type,
        isInWatchlist: userWatchlistSymbols.includes(item.symbol.trim().toUpperCase()),
      }));
    } catch (err) {
      console.error("Error in stock search:", err);
      return [];
    }
  }
);

// Fetch stock details by symbol
export const getStocksDetails = cache(async (symbol: string) => {
  const cleanSymbol = symbol.trim().toUpperCase();

  try {
    const token = getFinnhubApiKey();
    if (!token) {
      throw new Error("FINNHUB API key is not configured");
    }
    const [quote, profile, financials] = await Promise.all([
      fetchJSON(
        // Price data - no caching for accuracy
        `${FINNHUB_BASE_URL}/quote?symbol=${cleanSymbol}&token=${token}`
      ),
      fetchJSON(
        // Company info - cache 1hr (rarely changes)
        `${FINNHUB_BASE_URL}/stock/profile2?symbol=${cleanSymbol}&token=${token}`,
        3600
      ),
      fetchJSON(
        // Financial metrics (P/E, etc.) - cache 30min
        `${FINNHUB_BASE_URL}/stock/metric?symbol=${cleanSymbol}&metric=all&token=${token}`,
        1800
      ),
    ]);

    // Type cast the responses
    const quoteData = quote as QuoteData;
    const profileData = profile as ProfileData;
    const financialsData = financials as FinancialsData;

    // Check if we got valid quote and profile data
    if (!quoteData?.c || !profileData?.name) return null;

    const changePercent = quoteData.dp || 0;
    const peRatio = financialsData?.metric?.peNormalizedAnnual || null;

    return {
      symbol: cleanSymbol,
      company: profileData?.name,
      currentPrice: quoteData.c,
      changePercent,
      priceFormatted: formatPrice(quoteData.c),
      changeFormatted: formatChangePercent(changePercent),
      peRatio: peRatio?.toFixed(1) || "—",
      marketCapFormatted: formatMarketCapValue(
        profileData?.marketCapitalization || 0
      ),
    };
  } catch (error) {
    console.error(`Error fetching details for ${cleanSymbol}:`, error);
    return null;
  }
});
