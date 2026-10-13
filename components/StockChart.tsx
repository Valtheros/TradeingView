"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { RefreshCw } from "lucide-react";
import { CANDLE_CHART_WIDGET_CONFIG, BASELINE_WIDGET_CONFIG, COMPANY_PROFILE_WIDGET_CONFIG, COMPANY_FINANCIALS_WIDGET_CONFIG, TECHNICAL_ANALYSIS_WIDGET_CONFIG } from "@/lib/constants";
import { useLanguage } from "./LanguageProvider";

const Widget = dynamic(() => import("./TradeingViewWidget"), { ssr: false, loading: () => <div className="skeleton-block" style={{ height: 460 }} /> });
type Detail = "company" | "financials" | "technical";

export default function StockChart({ widgetSymbol }: { widgetSymbol: string | null }) {
  const { dictionary } = useLanguage();
  const copy = dictionary.daily;
  const router = useRouter();
  const [chart, setChart] = useState("candle");
  const [detail, setDetail] = useState<Detail | null>(null);
  const symbol = widgetSymbol || "";
  const config = useMemo(() => ({ ...(chart === "candle" ? CANDLE_CHART_WIDGET_CONFIG(symbol) : BASELINE_WIDGET_CONFIG(symbol)), style: chart === "candle" ? 1 : 2, height: 460, autosize: true }), [chart, symbol]);
  const detailConfig = useMemo(() => detail === "company" ? COMPANY_PROFILE_WIDGET_CONFIG(symbol) : detail === "financials" ? COMPANY_FINANCIALS_WIDGET_CONFIG(symbol) : TECHNICAL_ANALYSIS_WIDGET_CONFIG(symbol), [detail, symbol]);
  const script = "https://s3.tradingview.com/external-embedding/embed-widget-";
  if (!widgetSymbol) return <section className="chart-surface chart-unavailable" role="status"><p>{copy.marketUnavailable}</p><button className="action-button secondary" onClick={() => router.refresh()}><RefreshCw size={18} />{copy.retry}</button></section>;
  return <>
    <section className="stock-chart"><div className="section-heading"><h2>{copy.chart}</h2><div className="segmented-control"><button aria-pressed={chart === "candle"} onClick={() => setChart("candle")}>{copy.candle}</button><button aria-pressed={chart === "line"} onClick={() => setChart("line")}>{copy.line}</button></div></div><div className="chart-surface"><Widget key={chart} scriptUrl={`${script}advanced-chart.js`} config={config} height={460} /></div></section>
    <section><div className="detail-tabs">{(["company", "financials", "technical"] as const).map((name) => <button className="action-button secondary" key={name} aria-expanded={detail === name} onClick={() => setDetail(detail === name ? null : name)}>{copy[name]}</button>)}</div>{detail && <div className="chart-surface detail-widget"><Widget key={detail} scriptUrl={`${script}${detail === "company" ? "symbol-profile" : detail === "financials" ? "financials" : "technical-analysis"}.js`} config={detailConfig} height={460} /></div>}</section>
  </>;
}
