import { notFound } from "next/navigation";
import StockDetails from "@/components/StockDetails";
import { getStockProfile } from "@/lib/actions/finnhub.actions";
import { getUserWatchlist } from "@/lib/actions/watchlist.actions";
import { resolveTradingViewSymbol } from "@/lib/tradingview/symbol-search";
import { parseSymbols } from "@/lib/quotes";

export default async function StockPage({ params }: StockDetailsPageProps) {
  const { symbol: raw } = await params;
  const symbols = parseSymbols([raw]);
  if (!symbols) notFound();
  const symbol = symbols[0];
  const [profile, watchlist] = await Promise.all([getStockProfile(symbol), getUserWatchlist()]);
  const saved = watchlist.find((stock: { symbol: string }) => stock.symbol === symbol);
  const company = profile?.name || saved?.company || symbol;
  const match = await resolveTradingViewSymbol(symbol, company);
  if (!match) notFound();
  return <StockDetails symbol={symbol} company={company} widgetSymbol={match.widgetSymbol} followed={Boolean(saved)} />;
}
