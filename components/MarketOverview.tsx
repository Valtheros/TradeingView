"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { HEATMAP_WIDGET_CONFIG, MARKET_OVERVIEW_WIDGET_CONFIG } from "@/lib/constants";
import { useLanguage } from "./LanguageProvider";
import { PUBLIC_STOCKS } from "@/lib/public-stocks";

const Widget = dynamic(() => import("./TradeingViewWidget"), { ssr: false, loading: () => <div className="chart-placeholder skeleton-block" /> });
const overview = { ...MARKET_OVERVIEW_WIDGET_CONFIG, height: 420 };
const heatmap = { ...HEATMAP_WIDGET_CONFIG, height: 420 };

export default function MarketOverview({ publicOnly = false }: { publicOnly?: boolean }) {
  const { dictionary, locale } = useLanguage();
  const [tab, setTab] = useState("overview");
  const [visible, setVisible] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);
  const config = useMemo(() => {
    if (!publicOnly) return tab === "overview" ? overview : heatmap;
    return tab === "heatmap" ? { ...heatmap, locale } : { ...overview, locale,
      largeChartUrl: typeof window === "undefined" ? "" : `${window.location.origin}/stocks/{tvsymbol}`,
      tabs: [{ title: dictionary.daily.usMarket, symbols: PUBLIC_STOCKS.map(stock => ({ s: stock.tvSymbol, d: stock.name })) }],
    };
  }, [publicOnly, tab, locale, dictionary.daily.usMarket]);
  useEffect(() => {
    if (!chartRef.current) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) { setVisible(true); observer.disconnect(); }
    });
    observer.observe(chartRef.current);
    return () => observer.disconnect();
  }, []);
  return <section className="market-section"><div className="section-heading"><h2 className="skeleton-text">{dictionary.daily.market}</h2>
    <div className="segmented-control"><button aria-pressed={tab === "overview"} onClick={() => setTab("overview")}>{dictionary.daily.chart}</button><button aria-pressed={tab === "heatmap"} onClick={() => setTab("heatmap")}>{dictionary.daily.heatmap}</button></div>
  </div><div className="chart-surface" ref={chartRef}>{visible ? <Widget key={tab} scriptUrl={`https://s3.tradingview.com/external-embedding/embed-widget-${tab === "overview" ? "market-overview" : "stock-heatmap"}.js`} config={config} height={420} showAttribution={publicOnly} /> : <div className="chart-placeholder skeleton-block" />}</div></section>;
}
