"use client";
import useTradingViewWidget from "@/hooks/useTradingViewWidget";
import { cn } from "@/lib/utils";
import React, { memo } from "react";
import { useLanguage } from "./LanguageProvider";
import { RefreshCw } from "lucide-react";

interface TradingViewWidgetProps {
  title?: string;
  scriptUrl: string;
  config: Record<string, unknown>;
  height?: number;
  classname?: string;
  showAttribution?: boolean;
}

const TradingViewWidget = ({
  title,
  scriptUrl,
  config,
  height = 600,
  classname,
  showAttribution = false,
}: TradingViewWidgetProps) => {
  const { containerRef, failed, retry } = useTradingViewWidget(scriptUrl, config, height);
  const { dictionary } = useLanguage();

  return (
    <div className="w-full widget-frame">
        {title && <h3 className="font-semibold text-2xl text-gray-100 mb-5">{title}</h3> }
      <div
        className={cn("tradingview-widget-container", classname)}
        ref={containerRef}
        style={{ height, width: "100%" }}
      >
        <div
          className="tradingview-widget-container__widget"
          style={{ height, width: "100%" }}
        />
      </div>
      {failed && <div className="widget-error" role="status"><p>{dictionary.daily.marketUnavailable}</p><button className="action-button secondary" onClick={retry}><RefreshCw size={18} />{dictionary.daily.retry}</button></div>}
      {showAttribution && <div className="tradingview-widget-copyright"><a href="https://www.tradingview.com/" target="_blank" rel="noopener noreferrer">TradingView</a></div>}
    </div>
  );
};

export default memo(TradingViewWidget);
