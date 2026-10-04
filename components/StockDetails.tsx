"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CANDLE_CHART_WIDGET_CONFIG, BASELINE_WIDGET_CONFIG, COMPANY_PROFILE_WIDGET_CONFIG, COMPANY_FINANCIALS_WIDGET_CONFIG, TECHNICAL_ANALYSIS_WIDGET_CONFIG } from "@/lib/constants";
import { useQuotes } from "@/hooks/useQuotes";
import { useLanguage } from "./LanguageProvider";
import { QuoteStatus, QuoteValue } from "./StockList";
import WatchlistButton from "./WatchlistButton";

const Widget = dynamic(() => import("./TradeingViewWidget"), { ssr: false, loading: () => <div className="skeleton-block" style={{ height: 460 }} /> });
type Detail = "company" | "financials" | "technical";

export default function StockDetails({ symbol, company, widgetSymbol, followed }: { symbol: string; company: string; widgetSymbol: string; followed: boolean }) {
  const { dictionary, locale } = useLanguage();
  const copy = dictionary.daily;
  const quotes = useQuotes([symbol]);
  const quoteTime = quotes.quotes[symbol]?.quoteTime;
  const [chart, setChart] = useState("candle");
  const [detail, setDetail] = useState<Detail | null>(null);
  const config = useMemo(() => ({ ...(chart === "candle" ? CANDLE_CHART_WIDGET_CONFIG(widgetSymbol) : BASELINE_WIDGET_CONFIG(widgetSymbol)), style: chart === "candle" ? 1 : 2, height: 460, autosize: true }), [chart, widgetSymbol]);
  const detailConfig = useMemo(() => detail === "company" ? COMPANY_PROFILE_WIDGET_CONFIG(widgetSymbol) : detail === "financials" ? COMPANY_FINANCIALS_WIDGET_CONFIG(widgetSymbol) : TECHNICAL_ANALYSIS_WIDGET_CONFIG(widgetSymbol), [detail, widgetSymbol]);
  const script = "https://s3.tradingview.com/external-embedding/embed-widget-";
  return <div className="daily-page stock-details-page">
    <Link href="/" className="text-action"><ArrowLeft size={18} />{copy.back}</Link>
    <div className="stock-detail-heading"><div><h1 className="skeleton-text">{symbol}</h1><p className="page-subtitle skeleton-text">{company}</p></div><QuoteValue quote={quotes.quotes[symbol]} loading={quotes.loading} /></div>
    <div className="stock-detail-actions"><WatchlistButton symbol={symbol} company={company} isInWatchlist={followed} /><QuoteStatus data={quotes} /></div>
    {quoteTime && <p className="section-meta">{copy.quoteTime} <time dateTime={quoteTime}>{new Date(quoteTime).toLocaleString(locale === "th" ? "th-TH" : "en-US")}</time></p>}
    {(quotes.error || quotes.unauthorized) && <p className="data-notice">{quotes.unauthorized ? <Link href="/sign-in">{copy.signInAgain}</Link> : copy.quoteError}</p>}
    <section className="stock-chart"><div className="section-heading"><h2>{copy.chart}</h2><div className="segmented-control"><button aria-pressed={chart === "candle"} onClick={() => setChart("candle")}>{copy.candle}</button><button aria-pressed={chart === "line"} onClick={() => setChart("line")}>{copy.line}</button></div></div>
      <div className="chart-surface"><Widget key={chart} scriptUrl={`${script}advanced-chart.js`} config={config} height={460} /></div>
    </section>
    <section><div className="detail-tabs">{(["company", "financials", "technical"] as const).map((name) => <button className="action-button secondary" key={name} aria-expanded={detail === name} onClick={() => setDetail(detail === name ? null : name)}>{copy[name]}</button>)}</div>
      {detail && <div className="chart-surface detail-widget"><Widget key={detail} scriptUrl={`${script}${detail === "company" ? "symbol-profile" : detail === "financials" ? "financials" : "technical-analysis"}.js`} config={detailConfig} height={460} /></div>}
    </section>
  </div>;
}
