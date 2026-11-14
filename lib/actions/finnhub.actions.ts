"use server";

import { POPULAR_STOCK_SYMBOLS } from "@/lib/constants";
import { cache } from "react";
import { getCurrentSession } from "../better-auth/session";
import { redirect } from "next/navigation";
import { Watchlist } from "@/database/models/watchlist.model";
import { getFinnhubApiKey } from "../finnhub/env";
import { parseSymbols } from "../quotes";
import { fetchJSON, getStockProfile } from "../finnhub/data";

export const searchStocks = cache(
  async (query?: string): Promise<StockWithWatchlistStatus[]> => {
    const session = await getCurrentSession();
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
          ? fetchJSON<FinnhubSearchResponse>(`https://finnhub.io/api/v1/search?q=${encodeURIComponent(trimmed)}&exchange=US&token=${token}`, 1800)
              .then((data) => Array.isArray(data?.result) ? data.result : [])
          : Promise.all(POPULAR_STOCK_SYMBOLS.slice(0, 10).map(async (symbol) => {
              const profile = await getStockProfile(symbol);
              const name = profile?.name || profile?.ticker;
              return name ? { symbol, description: name, type: "Common Stock", exchange: profile?.exchange } : null;
            })),
      ]);
      return results.filter((item): item is FinnhubSearchResult =>
        !!item && parseSymbols([item.symbol]) !== null && /^(Common Stock|Preferred Stock|ETP|ETF|ADR|GDR|REIT)$/i.test(item.type)
      ).slice(0, 10).map((item) => ({
        symbol: item.symbol.trim().toUpperCase(), name: item.description || item.symbol,
        exchange: item.exchange || "US", type: item.type,
        isInWatchlist: userWatchlistSymbols.includes(item.symbol.trim().toUpperCase()),
      }));
    } catch (err) {
      console.error("Error in stock search:", err);
      throw new Error("Stock search unavailable");
    }
  }
);
