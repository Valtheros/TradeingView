"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { PUBLIC_STOCKS } from "@/lib/public-stocks";
import type { Locale } from "@/lib/i18n";
import { useLanguage } from "./LanguageProvider";

export function guestMarketDocument(locale: Locale) {
  const language = locale === "th" ? "th_TH" : "en";
  return `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#141414;color-scheme:dark}tv-tickers{display:block;width:100%;height:520px;--tv-widget-font-family:system-ui,sans-serif;--tv-widget-background-color:#141414;--tv-widget-text-color:#d0d3d7;--tv-widget-positive-color:#69d7ac;--tv-widget-negative-color:#ff7d86}</style></head><body>
<tv-tickers symbols="${PUBLIC_STOCKS.map(stock => stock.tvSymbol).join(",")}" direction="vertical" item-size="compact" hide-chart theme="dark"><div style="height:520px;background:#292b2e"></div></tv-tickers>
<script>document.querySelector('tv-tickers').setAttribute('symbol-url',new URL('/',document.baseURI).origin+'/stock-loading.html?symbol={tvsymbol}');</script>
<script type="module" src="https://widgets.tradingview-widget.com/w/${language}/tv-tickers.js"></script></body></html>`;
}

export default function GuestMarketData() {
  const { dictionary, locale } = useLanguage();
  const frame = useRef<HTMLIFrameElement>(null);
  const [attempt, setAttempt] = useState(0);
  const [failedKey, setFailedKey] = useState<string | null>(null);
  const key = `${locale}:${attempt}`;
  const srcDoc = useMemo(() => guestMarketDocument(locale), [locale]);
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!frame.current?.contentWindow?.customElements.get("tv-tickers")) setFailedKey(key);
    }, 8000);
    return () => clearTimeout(timeout);
  }, [key]);
  return <section className="guest-market-data"><div className="section-heading"><h2 className="skeleton-text">{dictionary.guest.explore}</h2></div>
    <div className="chart-surface"><div className="widget-frame">
      {/* Each document keeps the provider's locale registration isolated when switching EN/TH. */}
      <iframe key={key} ref={frame} srcDoc={srcDoc} title={dictionary.guest.explore} className="guest-stock-catalog" onLoad={event => setFailedKey(event.currentTarget.contentWindow?.customElements.get("tv-tickers") ? null : key)} />
      {failedKey === key && <div className="widget-error" role="status"><p>{dictionary.daily.marketUnavailable}</p><button className="action-button secondary" onClick={() => setAttempt(value => value + 1)}><RefreshCw size={18} />{dictionary.daily.retry}</button></div>}
    </div><div className="tradingview-widget-copyright"><a href="https://www.tradingview.com/" target="_blank" rel="noopener noreferrer">TradingView</a></div></div>
    <p className="section-meta guest-data-note">{dictionary.guest.marketData}</p>
  </section>;
}
