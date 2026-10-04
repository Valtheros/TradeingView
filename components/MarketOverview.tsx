"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { HEATMAP_WIDGET_CONFIG, MARKET_OVERVIEW_WIDGET_CONFIG } from "@/lib/constants";
import { useLanguage } from "./LanguageProvider";

const Widget = dynamic(() => import("./TradeingViewWidget"), { ssr: false, loading: () => <div className="chart-placeholder skeleton-block" /> });
const overview = { ...MARKET_OVERVIEW_WIDGET_CONFIG, height: 420 };
const heatmap = { ...HEATMAP_WIDGET_CONFIG, height: 420 };

export default function MarketOverview() {
  const { dictionary } = useLanguage();
  const [tab, setTab] = useState("overview");
  return <section className="market-section"><div className="section-heading"><h2 className="skeleton-text">{dictionary.daily.market}</h2>
    <div className="segmented-control"><button aria-pressed={tab === "overview"} onClick={() => setTab("overview")}>{dictionary.daily.chart}</button><button aria-pressed={tab === "heatmap"} onClick={() => setTab("heatmap")}>{dictionary.daily.heatmap}</button></div>
  </div><div className="chart-surface"><Widget key={tab} scriptUrl={`https://s3.tradingview.com/external-embedding/embed-widget-${tab === "overview" ? "market-overview" : "stock-heatmap"}.js`} config={tab === "overview" ? overview : heatmap} height={420} /></div></section>;
}
