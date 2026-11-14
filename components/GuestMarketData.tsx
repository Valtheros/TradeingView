"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { PUBLIC_STOCKS } from "@/lib/public-stocks";
import { useLanguage } from "./LanguageProvider";

const Widget = dynamic(() => import("./TradeingViewWidget"), { ssr: false, loading: () => <div className="skeleton-block" style={{ height: 520 }} /> });

export default function GuestMarketData() {
  const { dictionary, locale } = useLanguage();
  const container = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState<boolean | null>(null);
  useEffect(() => {
    if (!container.current) return;
    // The full Market Data table needs room for its provider-owned columns.
    const observer = new ResizeObserver(([entry]) => setCompact(entry.contentRect.width < 960));
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  const config = useMemo(() => ({
    width: "100%", height: 520, locale, colorTheme: "dark", isTransparent: true, showSymbolLogo: true,
    largeChartUrl: typeof window === "undefined" ? "" : `${window.location.origin}/stock-loading.html?symbol={tvsymbol}`,
    ...(compact ? { showChart: false, tabs: [{ title: dictionary.guest.catalog, symbols: PUBLIC_STOCKS.map(stock => ({ s: stock.tvSymbol, d: stock.name })) }] }
      : { symbolsGroups: [{ name: dictionary.guest.catalog, symbols: PUBLIC_STOCKS.map(stock => ({ name: stock.tvSymbol, displayName: stock.name })) }] }),
  }), [dictionary.guest.catalog, locale, compact]);
  return <section className="guest-market-data"><div className="section-heading"><h2 className="skeleton-text">{dictionary.guest.explore}</h2></div>
    <div className="chart-surface" ref={container}>{compact === null ? <div className="skeleton-block" style={{ height: 564 }} /> : <Widget scriptUrl={`https://s3.tradingview.com/external-embedding/embed-widget-${compact ? "market-overview" : "market-quotes"}.js`} config={config} height={520} showAttribution />}</div>
    <p className="section-meta guest-data-note">{dictionary.guest.marketData}</p>
  </section>;
}
