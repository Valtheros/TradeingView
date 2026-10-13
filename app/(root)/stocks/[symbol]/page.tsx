import { notFound } from "next/navigation";
import StockDetails from "@/components/StockDetails";
import { getStockProfile } from "@/lib/actions/finnhub.actions";
import { getUserWatchlist } from "@/lib/actions/watchlist.actions";
import { resolveTradingViewSymbol } from "@/lib/tradingview/symbol-search";
import { parseSymbols } from "@/lib/quotes";
import { Suspense } from "react";
import StockChart from "@/components/StockChart";

async function ResolvedChart({ symbol, company }: { symbol: string; company: string }) {
  const match = await resolveTradingViewSymbol(symbol, company);
  return <StockChart key={symbol} widgetSymbol={match?.widgetSymbol || null} />;
}

export default async function StockPage({ params }: StockDetailsPageProps) {
  const { symbol: raw } = await params;
  const symbols = parseSymbols([raw]);
  if (!symbols) notFound();
  const symbol = symbols[0];
  const [profile, watchlist] = await Promise.all([getStockProfile(symbol), getUserWatchlist()]);
  const saved = watchlist.find((stock: { symbol: string }) => stock.symbol === symbol);
  const company = profile?.name || saved?.company || symbol;
  return <StockDetails symbol={symbol} company={company} followed={Boolean(saved)}><Suspense fallback={<div className="chart-surface skeleton-block" style={{ height: 460 }} aria-busy="true" />}><ResolvedChart symbol={symbol} company={company} /></Suspense></StockDetails>;
}
