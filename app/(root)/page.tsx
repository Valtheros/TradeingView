import StockList, { type FollowedStock } from "@/components/StockList";
import DigestPanel from "@/components/DigestPanel";
import MarketOverview from "@/components/MarketOverview";
import { getUserWatchlist } from "@/lib/actions/watchlist.actions";
import { getDigestState } from "@/lib/actions/digest.actions";
import { getServerLocale } from "@/lib/i18n-server";
import { getDictionary } from "@/lib/i18n";
import { POPULAR_STOCK_SYMBOLS } from "@/lib/constants";

const names: Record<string, string> = { AAPL: "Apple", MSFT: "Microsoft", GOOGL: "Alphabet", AMZN: "Amazon", NVDA: "NVIDIA", TSLA: "Tesla", META: "Meta Platforms", JPM: "JPMorgan Chase", V: "Visa", WMT: "Walmart" };

export default async function Today() {
  const locale = await getServerLocale();
  const copy = getDictionary(locale).daily;
  const [watchlist, digest] = await Promise.all([getUserWatchlist(), getDigestState(locale)]);
  const stocks: FollowedStock[] = watchlist.length
    ? watchlist.slice(0, 6).map((stock: { symbol: string; company: string }) => ({ symbol: stock.symbol, company: stock.company, followed: true }))
    : POPULAR_STOCK_SYMBOLS.slice(0, 6).map((symbol) => ({ symbol, company: names[symbol] || symbol, followed: false }));
  return <div className="daily-page">
    <div className="page-heading"><div><p className="section-meta skeleton-text">{new Date().toLocaleDateString(locale === "th" ? "th-TH" : "en-US", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Bangkok" })}</p><h1 className="skeleton-text">{copy.today}</h1><p className="page-subtitle skeleton-text">{copy.subtitle}</p></div><span className="market-label">{copy.usMarket}<span>USD</span></span></div>
    <div className="today-layout"><StockList stocks={stocks} compact /><DigestPanel key={`${locale}:${digest.summaries[0]?.updatedAt ?? "pending"}`} initial={digest} preview /></div>
    <MarketOverview />
  </div>;
}
