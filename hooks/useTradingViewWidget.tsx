"use client";
import { useEffect, useRef, useState } from "react";
const useTradingViewWidget = (
  scriptUrl: string,
  config: Record<string, unknown>,
  height = 600
) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const wrapper = document.createElement("div");
    wrapper.className = "tradingview-widget-container";
    wrapper.style.height = `${height}px`;
    wrapper.style.width = "100%";

    const widgetContainer = document.createElement("div");
    widgetContainer.className = "tradingview-widget-container__widget";
    widgetContainer.style.height = `${height}px`;
    widgetContainer.style.width = "100%";

    const script = document.createElement("script");
    script.src = scriptUrl;
    script.async = true;
    script.innerHTML = JSON.stringify(config);
    let disposed = false;
    const deadline = setTimeout(() => { if (!disposed) setFailed(true); }, 8000);
    script.onload = () => { clearTimeout(deadline); if (!disposed) setFailed(false); };
    script.onerror = () => { clearTimeout(deadline); if (!disposed) setFailed(true); };

    // Defer injection past Strict Mode's setup/cleanup cycle. Keep a parent for
    // an in-flight embed script even if the user navigates away before it loads.
    const timer = setTimeout(() => {
      wrapper.append(widgetContainer, script);
      container.replaceChildren(wrapper);
    }, 0);
    return () => {
      clearTimeout(timer);
      disposed = true;
      clearTimeout(deadline);
      wrapper.remove();
    };
  }, [scriptUrl, config, height, attempt]);
  return { containerRef, failed, retry: () => { setFailed(false); setAttempt((value) => value + 1); } };
};

export default useTradingViewWidget;
