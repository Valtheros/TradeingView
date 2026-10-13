import {
  selectBestTradingViewMatch,
  type TradingViewSearchResult,
  type TradingViewSymbolMatch,
} from "./symbol-utils";

const TRADINGVIEW_SYMBOL_SEARCH_URL =
  "https://symbol-search.tradingview.com/symbol_search/";

const fetchTradingViewResults = async (query: string) => {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const url = `${TRADINGVIEW_SYMBOL_SEARCH_URL}?text=${encodeURIComponent(
    trimmed
  )}&hl=en`;
  const response = await fetch(url, {
    headers: {
      Origin: "https://www.tradingview.com",
    },
    next: { revalidate: 3600 },
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) return [];

  const data: unknown = await response.json();
  return Array.isArray(data) ? (data as TradingViewSearchResult[]) : [];
};

export const resolveTradingViewSymbol = async (
  symbol: string,
  company: string
): Promise<TradingViewSymbolMatch | null> => {
  try {
    const [symbolResults, companyResults] = await Promise.all([
      fetchTradingViewResults(symbol),
      fetchTradingViewResults(company),
    ]);

    return selectBestTradingViewMatch(symbol, company, [
      ...symbolResults,
      ...companyResults,
    ]);
  } catch (error) {
    console.error("Error resolving TradingView symbol:", error);
    return null;
  }
};
