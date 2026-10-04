"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { mergeQuotes, shouldRefreshQuotes, type QuoteBatch, type StockQuote } from "@/lib/quotes";

export function useQuotes(symbols: string[]) {
  const key = symbols.join(",");
  const [quotes, setQuotes] = useState<Record<string, StockQuote>>({});
  const [loading, setLoading] = useState(false);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState(false);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);
  const refreshRef = useRef<() => void>(() => {});
  const refresh = useCallback(() => refreshRef.current(), []);

  useEffect(() => {
    let disposed = false;
    let busy = false;
    let lastFetch = 0;
    let retryAt = 0;
    const controller = new AbortController();
    const refreshQuotes = async (force = false) => {
      const online = navigator.onLine;
      setOffline(!online);
      if (disposed || busy || !key || !online || document.hidden || Date.now() < retryAt) return;
      if (!force && !shouldRefreshQuotes(!document.hidden, online, lastFetch, Date.now())) return;
      busy = true;
      setLoading(true);
      try {
        const response = await fetch("/api/quotes", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ symbols: key.split(",") }),
          signal: controller.signal, cache: "no-store",
        });
        if (response.status === 401) {
          if (!disposed) setUnauthorized(true);
          retryAt = Infinity;
          throw new Error("Unauthorized");
        }
        if (!response.ok) throw new Error("Quotes unavailable");
        const data: QuoteBatch = await response.json();
        if (disposed) return;
        setQuotes((old) => mergeQuotes(old, data.quotes));
        setError(data.quotes.some((quote) => quote.status !== "ready"));
        lastFetch = Date.now();
        retryAt = lastFetch + data.retryAfter * 1000;
        setCheckedAt(new Date(lastFetch).toISOString());
      } catch {
        if (!disposed) {
          setError(true);
          setQuotes((old) => Object.fromEntries(Object.entries(old).map(([symbol, quote]) => [symbol, { ...quote, status: "unavailable" }])));
          retryAt = Math.max(retryAt, Date.now() + 60_000);
        }
      } finally {
        busy = false;
        if (!disposed) setLoading(false);
      }
    };
    refreshRef.current = () => { void refreshQuotes(true); };
    const check = () => { void refreshQuotes(); };
    check();
    const timer = window.setInterval(check, 60_000);
    document.addEventListener("visibilitychange", check);
    window.addEventListener("online", check);
    window.addEventListener("offline", check);
    return () => {
      disposed = true;
      controller.abort();
      clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("online", check);
      window.removeEventListener("offline", check);
    };
  }, [key]);

  return { quotes, loading, offline, error, checkedAt, unauthorized, refresh };
}
