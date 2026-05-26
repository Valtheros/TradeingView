"use client";
import { useEffect, useRef } from "react";
const useTradingViewWidget = (
  scriptUrl: string,
  config: Record<string, unknown>,
  height = 600
) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (container.dataset.loaded) return;

    const widgetContainer = document.createElement("div");
    widgetContainer.className = "tradingview-widget-container__widget";
    widgetContainer.style.height = `${height}px`;
    widgetContainer.style.width = "100%";

    const script = document.createElement("script");
    script.src = scriptUrl;
    script.async = true;
    script.innerHTML = JSON.stringify(config);

    container.replaceChildren(widgetContainer, script);
    container.dataset.loaded = "true";
    return () => {
      container.replaceChildren();
      delete container.dataset.loaded;
    };
  }, [scriptUrl, config, height]);
  return containerRef;
};

export default useTradingViewWidget;
