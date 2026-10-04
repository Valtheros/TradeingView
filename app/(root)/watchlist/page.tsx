import StockList from "@/components/StockList";
import { getUserWatchlist } from "@/lib/actions/watchlist.actions";
import { getServerLocale } from "@/lib/i18n-server";
import { getDictionary } from "@/lib/i18n";

export default async function WatchlistPage() {
  const [items, locale] = await Promise.all([getUserWatchlist(), getServerLocale()]);
  const dictionary = getDictionary(locale);
  return <div className="daily-page"><div className="page-heading"><div><p className="section-meta skeleton-text">{dictionary.daily.usMarket}</p><h1 className="skeleton-text">{dictionary.watchlist.title}</h1></div></div>
    <StockList stocks={items.map((stock: { symbol: string; company: string }) => ({ symbol: stock.symbol, company: stock.company, followed: true }))} />
  </div>;
}
