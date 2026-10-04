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
import { getWatchlistSymbolsByEmail } from "./watchlist.actions";
import { resolveTradingViewSymbol } from "../tradingview/symbol-search";
import { getFinnhubApiKey } from "../finnhub/env";

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

type SearchResultWithMetadata = FinnhubSearchResult & {
  exchange?: string;
  tradingViewSymbol?: string;
  tradingViewExchange?: string;
};

type ValidSearchResult = SearchResultWithMetadata & {
  tradingViewSymbol: string;
  tradingViewExchange: string;
};

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

async function checkFinnhubAccess(symbol: string, token: string) {
  try {
    // Check Quote (Must have valid price)
    const quoteUrl = `${FINNHUB_BASE_URL}/quote?symbol=${encodeURIComponent(
      symbol
    )}&token=${token}`;
    const quoteRes = await fetch(quoteUrl, { cache: "no-store" });

    if (!quoteRes.ok) return false;
    const quoteData = await quoteRes.json();
    // Check if 'c' (current price) exists and is not 0 (matching getStocksDetails logic)
    if (!quoteData || !quoteData.c) return false;

    // Check Profile (Must have name)
    const profileUrl = `${FINNHUB_BASE_URL}/stock/profile2?symbol=${encodeURIComponent(
      symbol
    )}&token=${token}`;
    // Cache profile check for 1 hour to save API calls
    const profileRes = await fetch(profileUrl, { next: { revalidate: 3600 } });

    if (!profileRes.ok) return false;
    const profileData = await profileRes.json();
    if (!profileData || !profileData.name) return false;

    return true;
  } catch (error) {
    console.error(`Error checking Finnhub access for ${symbol}:`, error);
    return false;
  }
}

export const searchStocks = cache(
  async (query?: string): Promise<StockWithWatchlistStatus[]> => {
    try {
      const auth = await getAuth();
      const session = await auth.api.getSession({
        headers: await headers(),
      });
      if (!session?.user) redirect("/sign-in");

      const userWatchlistSymbols = await getWatchlistSymbolsByEmail(
        session.user.email
      );

      const token = getFinnhubApiKey();
      if (!token) {
        console.error(
          "Error in stock search:",
          new Error("FINNHUB API key is not configured")
        );
        return [];
      }

      const trimmed = typeof query === "string" ? query.trim() : "";

      let results: SearchResultWithMetadata[] = [];

      if (!trimmed) {
        // Fetch top 10 popular symbols' profiles
        const top = POPULAR_STOCK_SYMBOLS.slice(0, 10);
        const profiles = await Promise.all(
          top.map(async (sym) => {
            try {
              const url = `${FINNHUB_BASE_URL}/stock/profile2?symbol=${encodeURIComponent(
                sym
              )}&token=${token}`;
              const profile = await fetchJSON<FinnhubCompanyProfile>(url, 3600);
              return { sym, profile };
            } catch (e) {
              console.error("Error fetching profile2 for", sym, e);
              return { sym, profile: null };
            }
          })
        );

        results = profiles.reduce<SearchResultWithMetadata[]>(
          (acc, { sym, profile }) => {
            const symbol = sym.toUpperCase();
            const name = profile?.name || profile?.ticker || undefined;
            if (!name) return acc;

            acc.push({
              symbol,
              description: name,
              displaySymbol: symbol,
              type: "Common Stock",
              exchange: profile?.exchange,
            });
            return acc;
          },
          []
        );
      } else {
        const url = `${FINNHUB_BASE_URL}/search?q=${encodeURIComponent(
          trimmed
        )}&token=${token}`;
        const data = await fetchJSON<FinnhubSearchResponse>(url, 1800);
        results = Array.isArray(data?.result) ? data.result : [];
      }

      // Filter results: Check both TradingView existence and Finnhub access
      // Limit to top 10 to avoid rate limits and slow response
      const candidates = results.slice(0, 10);

      const validResults = await Promise.all(
        candidates.map(async (item) => {
          const tradingViewMatch = await resolveTradingViewSymbol(
            item.symbol,
            item.description
          );
          if (!tradingViewMatch) return null;

          const hasAccess = await checkFinnhubAccess(item.symbol, token);
          if (!hasAccess) return null;

          return {
            ...item,
            tradingViewSymbol: tradingViewMatch.widgetSymbol,
            tradingViewExchange: tradingViewMatch.exchange,
          };
        })
      );

      const filteredResults = validResults.filter(
        (item): item is ValidSearchResult => item !== null
      );

      const mapped: StockWithWatchlistStatus[] = filteredResults.map((r) => {
        const upper = (r.symbol || "").toUpperCase();
        const name = r.description || upper;
        const exchange =
          r.tradingViewExchange || r.exchange || r.displaySymbol || "US";
        const type = r.type || "Stock";
        const item: StockWithWatchlistStatus = {
          symbol: upper,
          name,
          exchange,
          type,
          tradingViewSymbol: r.tradingViewSymbol,
          isInWatchlist: userWatchlistSymbols.includes(r.symbol.toUpperCase()),
        };
        return item;
      });

      return mapped;
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
