"use client";

import { useEffect, useState } from "react";

export function useCompanyLogos(symbols: string[]) {
  const key = symbols.join(",");
  const [logos, setLogos] = useState<Record<string, string | null>>({});
  useEffect(() => {
    if (!key) return;
    const controller = new AbortController();
    const requested = key.split(",");
    fetch("/api/company-logos", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbols: requested }), signal: controller.signal,
    }).then(async response => {
      if (!response.ok) throw new Error("Logos unavailable");
      const data = await response.json();
      if (!controller.signal.aborted) setLogos(Object.fromEntries(requested.map(symbol => [symbol, typeof data.logos?.[symbol] === "string" ? data.logos[symbol] : null])));
    }).catch(() => {
      if (!controller.signal.aborted) setLogos(Object.fromEntries(requested.map(symbol => [symbol, null])));
    });
    return () => controller.abort();
  }, [key]);
  return logos;
}
