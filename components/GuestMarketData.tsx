"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { PUBLIC_STOCKS } from "@/lib/public-stocks";
import { useLanguage } from "./LanguageProvider";

const Widget = dynamic(() => import("./TradeingViewWidget"), { ssr: false, loading: () => <div className="skeleton-block" style={{ height: 520 }} /> });

export default function GuestMarketData() {
  const { dictionary, locale } = useLanguage();
  const config = useMemo(() => ({
    width: "100%", height: 520, locale, colorTheme: "dark", isTransparent: true, showSymbolLogo: true,
    largeChartUrl: typeof window === "undefined" ? "" : `${window.location.origin}/stocks/{tvsymbol}`,
    symbolsGroups: [{ name: dictionary.guest.catalog, symbols: PUBLIC_STOCKS.map(stock => ({ name: stock.tvSymbol, displayName: stock.name })) }],
  }), [dictionary.guest.catalog, locale]);
  return <section className="guest-market-data"><div className="section-heading"><h2 className="skeleton-text">{dictionary.guest.explore}</h2></div>
    <div className="chart-surface"><Widget scriptUrl="https://s3.tradingview.com/external-embedding/embed-widget-market-quotes.js" config={config} height={520} showAttribution /></div>
    <p className="section-meta guest-data-note">{dictionary.guest.marketData}</p>
  </section>;
}
