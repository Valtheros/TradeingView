"use server";
import { resolveTradingViewSymbol } from "./tradingview/symbol-search";

export async function formatSymbolForTV(query: string, company: string) {
  const match = await resolveTradingViewSymbol(query, company);
  return match?.widgetSymbol ?? null;
}
