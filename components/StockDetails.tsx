"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useQuotes } from "@/hooks/useQuotes";
import { useLanguage } from "./LanguageProvider";
import { QuoteStatus, QuoteValue } from "./StockList";
import WatchlistButton from "./WatchlistButton";

export default function StockDetails({ symbol, company, followed, children }: { symbol: string; company: string; followed: boolean; children: ReactNode }) {
  const { dictionary, locale } = useLanguage();
  const copy = dictionary.daily;
  const quotes = useQuotes([symbol]);
  const quoteTime = quotes.quotes[symbol]?.quoteTime;
  return <div className="daily-page stock-details-page">
    <Link href="/" className="text-action"><ArrowLeft size={18} />{copy.back}</Link>
    <div className="stock-detail-heading"><div><h1 className="skeleton-text">{symbol}</h1><p className="page-subtitle skeleton-text">{company}</p></div><QuoteValue quote={quotes.quotes[symbol]} loading={quotes.loading} /></div>
    <div className="stock-detail-actions"><WatchlistButton symbol={symbol} company={company} isInWatchlist={followed} /><QuoteStatus data={quotes} /></div>
    {quoteTime && <p className="section-meta">{copy.quoteTime} <time dateTime={quoteTime}>{new Date(quoteTime).toLocaleString(locale === "th" ? "th-TH" : "en-US")}</time></p>}
    {(quotes.error || quotes.unauthorized) && <p className="data-notice">{quotes.unauthorized ? <Link href="/sign-in">{copy.signInAgain}</Link> : copy.quoteError}</p>}
    {children}
  </div>;
}
