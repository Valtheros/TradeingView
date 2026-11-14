export type PublicStock = { symbol: string; name: string; exchange: "NASDAQ" | "NYSE"; tvSymbol: string };

export const PUBLIC_STOCKS: readonly PublicStock[] = [
  { symbol: "AAPL", name: "Apple", exchange: "NASDAQ", tvSymbol: "NASDAQ:AAPL" },
  { symbol: "MSFT", name: "Microsoft", exchange: "NASDAQ", tvSymbol: "NASDAQ:MSFT" },
  { symbol: "GOOGL", name: "Alphabet", exchange: "NASDAQ", tvSymbol: "NASDAQ:GOOGL" },
  { symbol: "AMZN", name: "Amazon", exchange: "NASDAQ", tvSymbol: "NASDAQ:AMZN" },
  { symbol: "TSLA", name: "Tesla", exchange: "NASDAQ", tvSymbol: "NASDAQ:TSLA" },
  { symbol: "META", name: "Meta Platforms", exchange: "NASDAQ", tvSymbol: "NASDAQ:META" },
  { symbol: "NVDA", name: "NVIDIA", exchange: "NASDAQ", tvSymbol: "NASDAQ:NVDA" },
  { symbol: "NFLX", name: "Netflix", exchange: "NASDAQ", tvSymbol: "NASDAQ:NFLX" },
  { symbol: "ORCL", name: "Oracle", exchange: "NYSE", tvSymbol: "NYSE:ORCL" },
  { symbol: "CRM", name: "Salesforce", exchange: "NYSE", tvSymbol: "NYSE:CRM" },
];

export function getPublicStock(symbol: string) {
  return PUBLIC_STOCKS.find(stock => stock.symbol === symbol.trim().toUpperCase());
}

export function searchPublicStocks(query: unknown): readonly PublicStock[] {
  if (typeof query !== "string" || query.length > 80) return [];
  const term = query.trim().toLowerCase();
  return PUBLIC_STOCKS.filter(stock => stock.symbol.toLowerCase().includes(term) || stock.name.toLowerCase().includes(term));
}
