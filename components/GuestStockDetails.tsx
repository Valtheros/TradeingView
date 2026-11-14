"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useMemo } from "react";
import dynamic from "next/dynamic";
import { useLanguage } from "./LanguageProvider";
import { authHref } from "@/lib/auth-navigation";
import { SYMBOL_INFO_WIDGET_CONFIG } from "@/lib/constants";
import type { PublicStock } from "@/lib/public-stocks";
import StockChart from "./StockChart";
import WatchlistButton from "./WatchlistButton";

const Widget = dynamic(() => import("./TradeingViewWidget"), { ssr: false, loading: () => <div className="skeleton-block" style={{ height: 170 }} /> });

export default function GuestStockDetails({ symbol, stock }: { symbol: string; stock: PublicStock | null }) {
  const { dictionary, locale } = useLanguage();
  const config = useMemo(() => ({ ...SYMBOL_INFO_WIDGET_CONFIG(stock?.tvSymbol || ""), locale }), [stock?.tvSymbol, locale]);
  return <div className="daily-page stock-details-page" data-view="guest-stock">
    <Link href="/" className="text-action"><ArrowLeft size={18} />{dictionary.daily.back}</Link>
    <div className="page-heading"><div><h1 className="skeleton-text">{symbol}</h1>{stock && <p className="page-subtitle skeleton-text">{stock.name}</p>}</div></div>
    {!stock ? <section className="guest-news"><h2>{dictionary.guest.outOfCatalog}</h2><p>{dictionary.guest.outOfCatalogDescription}</p><Link className="action-button" href={authHref("/sign-in", `/stocks/${symbol}`)}>{dictionary.signIn.submit}</Link></section> : <>
      <div className="stock-detail-actions"><WatchlistButton symbol={symbol} company={stock.name} isInWatchlist={false} /></div>
      <div className="chart-surface"><Widget scriptUrl="https://s3.tradingview.com/external-embedding/embed-widget-symbol-info.js" config={config} height={170} showAttribution /></div>
      <StockChart widgetSymbol={stock.tvSymbol} showAttribution />
    </>}
  </div>;
}
