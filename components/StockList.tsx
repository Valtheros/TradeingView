"use client";

import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, ChevronLeft, ChevronRight, RefreshCw, WifiOff } from "lucide-react";
import { useState } from "react";
import { useQuotes } from "@/hooks/useQuotes";
import type { StockQuote } from "@/lib/quotes";
import { useLanguage } from "./LanguageProvider";
import WatchlistButton from "./WatchlistButton";
import SearchCommand from "./SearchCommand";
import StockLink from "./StockLink";

export type FollowedStock = { symbol: string; company: string; followed: boolean };

export function QuoteValue({ quote, loading }: { quote?: StockQuote; loading: boolean }) {
  const { dictionary } = useLanguage();
  const copy = dictionary.daily;
  const percent = quote?.changePercent;
  const signed = percent == null ? "--" : `${percent > 0 ? "+" : ""}${percent.toFixed(2)}%`;
  if (!quote && loading) return <div className="quote-value" aria-label={dictionary.common.loading}><span className="skeleton-block quote-placeholder" /><span className="skeleton-block change-placeholder" /></div>;
  return <div className="quote-value skeleton-text">
    <strong>{quote?.price != null ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(quote.price) : "--"}</strong>
    <span className={percent == null || percent === 0 ? "price-neutral" : percent > 0 ? "price-up" : "price-down"}>{percent != null && percent !== 0 && (percent > 0 ? <ArrowUpRight size={14} /> : <ArrowDownLeft size={14} />)}{signed}</span>
    {quote?.status === "unavailable" && <small className="quote-unavailable">{quote.price == null ? copy.unavailable : copy.stale}</small>}
  </div>;
}

export function QuoteStatus({ data }: { data: ReturnType<typeof useQuotes> }) {
  const { dictionary, locale } = useLanguage();
  const copy = dictionary.daily;
  return <div className="quote-toolbar">
    <p className="quote-checked">{data.offline ? <><WifiOff size={14} />{copy.offline}</> : data.checkedAt ? <>{copy.checked} <time>{new Date(data.checkedAt).toLocaleTimeString(locale === "th" ? "th-TH" : "en-US", { hour: "2-digit", minute: "2-digit" })}</time></> : copy.usMarket}</p>
    <button type="button" className="icon-button" onClick={data.refresh} disabled={data.loading || data.offline} title={copy.refresh} aria-label={copy.refresh}><RefreshCw size={18} className={data.loading ? "refreshing" : ""} /></button>
  </div>;
}

export default function StockList({ stocks, compact = false }: { stocks: FollowedStock[]; compact?: boolean }) {
  const { dictionary, locale } = useLanguage();
  const copy = dictionary.daily;
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(stocks.length / 20));
  const current = Math.min(page, pageCount - 1);
  const visible = compact ? stocks.slice(0, 6) : stocks.slice(current * 20, current * 20 + 20);
  const data = useQuotes(visible.map((stock) => stock.symbol));
  return <section className="stocks-section">
    <div className="section-heading"><h2 className="skeleton-text">{compact ? stocks.some((s) => s.followed) ? copy.yourStocks : copy.popular : dictionary.watchlist.title}<span className="count-label">{compact ? visible.length : stocks.length}</span></h2>
      {compact ? <Link href="/watchlist" className="text-action">{copy.viewAll}<ArrowUpRight size={17} /></Link> : <SearchCommand />}
    </div>
    <QuoteStatus data={data} />
    {(data.error || data.unauthorized) && <p className="data-notice" role="status">{data.unauthorized ? <Link href="/sign-in">{copy.signInAgain}</Link> : copy.quoteError}</p>}
    {stocks.length === 0 ? <div className="empty-watchlist"><p>{copy.noWatchlist}</p><SearchCommand /></div> : <>
      <div className="stock-column-labels"><span>{copy.stock}</span><span>{copy.quoteTime}</span><span>{copy.price} / {copy.change}</span><span className="sr-only">{dictionary.watchlist.table.action}</span></div>
      <ul className="daily-stock-list">{visible.map((stock) => {
        const quote = data.quotes[stock.symbol];
        return <li key={stock.symbol} className="daily-stock-row">
          <StockLink href={`/stocks/${encodeURIComponent(stock.symbol)}`} className="stock-identity"><span className="stock-monogram" aria-hidden="true">{stock.symbol.slice(0, 2)}</span><span className="stock-name skeleton-text"><strong>{stock.symbol}</strong><small>{stock.company}</small></span></StockLink>
          <span className="stock-quote-time skeleton-text">{quote?.quoteTime ? new Date(quote.quoteTime).toLocaleString(locale === "th" ? "th-TH" : "en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "--"}</span>
          <StockLink href={`/stocks/${encodeURIComponent(stock.symbol)}`} aria-label={`${stock.symbol} ${copy.price}`}><QuoteValue quote={quote} loading={data.loading || !data.checkedAt && !data.error && !data.offline} /></StockLink>
          <WatchlistButton symbol={stock.symbol} company={stock.company} isInWatchlist={stock.followed} type="icon" showTrashIcon={!compact} />
        </li>;
      })}</ul>
    </>}
    {!compact && pageCount > 1 && <div className="pagination"><span>{copy.page} {current + 1} {copy.of} {pageCount}</span><div>
      <button className="icon-button" disabled={current === 0} onClick={() => setPage(current - 1)} aria-label={copy.previous}><ChevronLeft size={20} /></button>
      <button className="icon-button" disabled={current === pageCount - 1} onClick={() => setPage(current + 1)} aria-label={copy.next}><ChevronRight size={20} /></button>
    </div></div>}
  </section>;
}
