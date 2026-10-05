import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";

function load(path, globals) {
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  runInNewContext(compiled, { exports, ...globals });
  return exports;
}

const quotes = load("../lib/quotes.ts");

test("search uses one US lookup without per-result checks, retains watchlist status and validates access/input", async () => {
  const requests = [];
  let signedIn = true;
  let releaseWatchlist;
  const watchlist = new Promise(resolve => { releaseWatchlist = resolve; });
  const modules = {
    "@/lib/utils": {},
    "@/lib/constants": { POPULAR_STOCK_SYMBOLS: ["NVDA", "MSFT"] },
    react: { cache: fn => fn },
    "../better-auth/auth": { getAuth: async () => ({ api: { getSession: async () => signedIn ? { user: { id: "current-user" } } : null } }) },
    "next/headers": { headers: async () => new Headers() },
    "next/navigation": { redirect: path => { throw new Error(`Redirect ${path}`); } },
    "@/database/models/watchlist.model": { Watchlist: { find: filter => { assert.equal(filter.userId, "current-user"); return { lean: () => watchlist }; } } },
    "../finnhub/env": { getFinnhubApiKey: () => "test-token" },
    "../quotes": quotes,
  };
  const result = [
    ...Array.from({ length: 10 }, () => ({ symbol: "INVALID:SYMBOL", type: "Common Stock" })),
    { symbol: "NVDA", description: "NVIDIA", type: "Common Stock" },
    { symbol: "BRK.B", description: "Berkshire Hathaway", type: "Common Stock" },
    { symbol: "SPY", description: "SPDR S&P 500", type: "ETP" },
    { symbol: "FAKE", description: "Not a stock", type: "Crypto" },
    null,
    ...Array.from({ length: 12 }, (_, i) => ({ symbol: `TEST${i}`, type: "Common Stock" })),
  ];
  const api = load("../lib/actions/finnhub.actions.ts", {
    AbortSignal,
    console: { error: () => {} },
    require: name => { assert.ok(name in modules, `Unexpected dependency ${name}`); return modules[name]; },
    fetch: async (url, options) => {
      const request = new URL(url);
      requests.push({ request, options });
      if (request.pathname === "/api/v1/search") return { ok: true, json: async () => ({ result }) };
      if (request.pathname === "/api/v1/stock/profile2") return { ok: true, json: async () => request.searchParams.get("symbol") === "NVDA" ? { name: "NVIDIA", exchange: "NASDAQ" } : {} };
      throw new Error(`Unexpected upstream ${request.hostname}${request.pathname}`);
    },
  });

  const pending = api.searchStocks(" NVDA ");
  await new Promise(setImmediate);
  assert.equal(requests.length, 1, "Finnhub must start without waiting for the watchlist");
  releaseWatchlist([{ symbol: "NVDA" }]);
  const stocks = await pending;
  assert.equal(requests[0].request.searchParams.get("q"), "NVDA");
  assert.equal(requests[0].request.searchParams.get("exchange"), "US");
  assert.equal(requests[0].options.next.revalidate, 1800);
  assert.equal(requests.length, 1, "search must not fetch TradingView, quotes or profiles per result");
  assert.equal(stocks.length, 10);
  assert.equal(stocks[0].symbol, "NVDA");
  assert.equal(stocks[0].isInWatchlist, true);
  assert.equal(stocks[1].symbol, "BRK.B");
  assert.equal(stocks[1].isInWatchlist, false);
  assert.equal(stocks[2].symbol, "SPY");

  const popular = await api.searchStocks("");
  assert.equal(popular.length, 1);
  assert.equal(popular[0].exchange, "NASDAQ");
  assert.equal(requests.length, 3, "popular stocks only need their cached profiles");
  assert.equal(requests[1].options.next.revalidate, 3600);
  assert.equal((await api.searchStocks("x".repeat(81))).length, 0);
  assert.equal((await api.searchStocks(42)).length, 0);
  signedIn = false;
  await assert.rejects(api.searchStocks("NVDA"), /Redirect \/sign-in/);
  assert.equal(requests.length, 3, "invalid or unauthenticated queries must not fetch data");
});
