export type TradingViewSearchResult = {
  symbol?: string;
  description?: string;
  exchange?: string;
  prefix?: string;
  source_id?: string;
  type?: string;
  is_primary_listing?: boolean;
};

export type TradingViewSymbolMatch = {
  symbol: string;
  widgetSymbol: string;
  exchange: string;
  description: string;
  type: string;
};

const SUPPORTED_TYPES = new Set(["stock", "dr", "fund", "etf"]);
const COMPANY_SUFFIXES = new Set([
  "a",
  "adr",
  "ag",
  "class",
  "co",
  "corp",
  "corporation",
  "group",
  "holdings",
  "inc",
  "incorporated",
  "ltd",
  "limited",
  "llc",
  "nv",
  "plc",
  "sa",
  "se",
  "spa",
  "the",
]);

const normalizeSymbol = (value: string) =>
  value.toUpperCase().replace(/[^A-Z0-9]/g, "");

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const getCompanyTokens = (company: string) =>
  normalizeText(company)
    .split(" ")
    .filter((token) => token.length > 1 && !COMPANY_SUFFIXES.has(token));

const getSymbolCandidates = (query: string) => {
  const clean = query.trim().toUpperCase();
  const candidates = new Set([clean, clean.replace(/-/g, "."), clean.replace(/\./g, "-")]);

  const suffixMatch = clean.match(/^([A-Z0-9]+)[.-][A-Z]{1,4}$/);
  if (suffixMatch) candidates.add(suffixMatch[1]);

  return [...candidates].map(normalizeSymbol).filter(Boolean);
};

const getWidgetSymbol = (result: TradingViewSearchResult) => {
  const symbol = result.symbol?.trim();
  if (!symbol) return null;

  const source =
    result.prefix?.trim() || result.source_id?.trim() || result.exchange?.trim();
  const normalizedSource = source?.replace(/\s+/g, "").toUpperCase();

  if (!normalizedSource) return symbol.toUpperCase();
  return `${normalizedSource}:${symbol.toUpperCase()}`;
};

const scoreResult = (
  query: string,
  company: string,
  result: TradingViewSearchResult
) => {
  if (!result.symbol || !result.description) return Number.NEGATIVE_INFINITY;

  const type = result.type?.toLowerCase() || "";
  if (!SUPPORTED_TYPES.has(type)) return Number.NEGATIVE_INFINITY;

  const symbolCandidates = getSymbolCandidates(query);
  const resultSymbol = normalizeSymbol(result.symbol);
  const symbolMatches = symbolCandidates.includes(resultSymbol);
  const companyTokens = getCompanyTokens(company);
  const resultDescription = normalizeText(result.description);
  const matchedTokens = companyTokens.filter((token) =>
    resultDescription.includes(token)
  );
  const companyMatchRatio =
    companyTokens.length === 0 ? 0 : matchedTokens.length / companyTokens.length;
  const strongCompanyMatch =
    companyTokens.length > 0 &&
    (companyMatchRatio >= 0.6 || resultDescription.includes(normalizeText(company)));

  if (!symbolMatches && !strongCompanyMatch) return Number.NEGATIVE_INFINITY;

  let score = 0;
  if (symbolMatches) score += 80;
  if (strongCompanyMatch) score += 60;
  if (type === "stock") score += 35;
  if (type === "dr") score += 25;
  if (type === "fund" || type === "etf") score += 10;
  if (result.is_primary_listing) score += 15;
  if (result.prefix || result.source_id) score += 5;

  return score;
};

export const selectBestTradingViewMatch = (
  query: string,
  company: string,
  results: TradingViewSearchResult[]
): TradingViewSymbolMatch | null => {
  const ranked = results
    .map((result, index) => ({
      result,
      index,
      score: scoreResult(query, company, result),
    }))
    .filter(({ score }) => Number.isFinite(score))
    .sort((a, b) => b.score - a.score || a.index - b.index);

  const best = ranked[0]?.result;
  if (!best?.symbol || !best.description) return null;

  const widgetSymbol = getWidgetSymbol(best);
  if (!widgetSymbol) return null;

  return {
    symbol: best.symbol.toUpperCase(),
    widgetSymbol,
    exchange: best.exchange || best.prefix || best.source_id || "TradingView",
    description: best.description,
    type: best.type || "stock",
  };
};
