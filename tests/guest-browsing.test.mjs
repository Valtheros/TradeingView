import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";

const jsx = { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }), Fragment: "Fragment" };
function load(path, modules = {}) {
  const exports = {};
  runInNewContext(ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, {
    exports, Date, URL, Response, process: { env: { NODE_ENV: "test" } },
    require: name => {
      if (name === "react/jsx-runtime") return jsx;
      assert.ok(name in modules, `Unexpected dependency ${name}`);
      return modules[name];
    },
  });
  return exports;
}
const catalog = load("../lib/public-stocks.ts");
const navigation = load("../lib/auth-navigation.ts");
const { parseSymbols } = load("../lib/quotes.ts");
const forbidden = () => { throw new Error("Guest reached private data or an external resolver"); };
const redirect = destination => { throw new Error(`Redirect ${destination}`); };
function types(node) {
  if (!node || typeof node !== "object") return [];
  if (Array.isArray(node)) return node.flatMap(types);
  return [typeof node.type === "function" ? node.type.name : node.type, ...types(node.props?.children)];
}

test("public catalog has ten fixed provider-independent stocks and instant bounded local search", () => {
  assert.equal(JSON.stringify(catalog.PUBLIC_STOCKS.map(stock => stock.symbol)), JSON.stringify(["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "META", "NVDA", "NFLX", "ORCL", "CRM"]));
  for (const [index, stock] of catalog.PUBLIC_STOCKS.entries()) {
    assert.equal(stock.exchange, index < 8 ? "NASDAQ" : "NYSE");
    assert.equal(stock.tvSymbol, `${stock.exchange}:${stock.symbol}`);
    assert.ok(parseSymbols([stock.symbol]));
  }
  assert.equal(catalog.getPublicStock(" aapl ").name, "Apple");
  assert.equal(catalog.getPublicStock("SPY"), undefined);
  assert.equal(catalog.searchPublicStocks("  Nvidia ")[0].symbol, "NVDA");
  assert.equal(catalog.searchPublicStocks("aapl")[0].name, "Apple");
  assert.equal(catalog.searchPublicStocks("").length, 10);
  for (const query of ["SPY", "NASDAQ:", null, 123, "a".repeat(81)]) assert.equal(catalog.searchPublicStocks(query).length, 0);
});

test("guest Today selects only public content and never reads watchlist/digest or renders private consumers", async () => {
  const page = load("../app/(root)/page.tsx", {
    "@/components/StockList": { default: "PrivateStockList" },
    "@/components/DigestPanel": { default: "PrivateDigest" },
    "@/components/MarketOverview": { default: "MarketOverview" },
    "@/components/GuestToday": { default: "GuestToday" },
    "@/lib/actions/watchlist.actions": { getUserWatchlist: forbidden },
    "@/lib/actions/digest.actions": { getDigestState: forbidden },
    "@/lib/better-auth/session": { getCurrentSession: async () => null },
    "@/lib/i18n-server": { getServerLocale: async () => "en" },
    "@/lib/i18n": { getDictionary: () => ({ daily: { today: "Today", usMarket: "US stocks" } }) },
    "@/lib/constants": { POPULAR_STOCK_SYMBOLS: [] },
    react: { Suspense: "Suspense" },
    "@/components/PageSkeleton": { StocksSkeleton: "StocksSkeleton", DigestSkeleton: "DigestSkeleton" },
    "@/components/SectionBoundary": { default: "SectionBoundary" },
  });
  const tree = await page.default();
  assert.equal(tree.props["data-view"], "guest-today");
  assert.ok(types(tree).includes("GuestToday"));
  for (const name of ["TodayStocks", "TodayDigest", "PrivateStockList", "PrivateDigest"]) assert.ok(!types(tree).includes(name));
});

test("guest stock routes validate before providers and use static TradingView mappings without personal data", async () => {
  let member = false;
  let profiles = 0;
  const page = load("../app/(root)/stocks/[symbol]/page.tsx", {
    "next/navigation": { notFound: () => { throw new Error("Not found"); } },
    "@/components/StockDetails": { default: "MemberStockDetails" },
    "@/components/GuestStockDetails": { default: "GuestStockDetails" },
    "@/lib/finnhub/data": { getStockProfile: async () => { if (!member) forbidden(); profiles++; return { name: "Apple" }; } },
    "@/lib/actions/watchlist.actions": { getUserWatchlist: async () => { if (!member) forbidden(); return [{ symbol: "AAPL", company: "Apple" }]; } },
    "@/lib/tradingview/symbol-search": { resolveTradingViewSymbol: forbidden },
    "@/lib/quotes": { parseSymbols },
    react: { Suspense: "Suspense" },
    "@/components/StockChart": { default: "StockChart" },
    "@/lib/company-logos": { companyLogoUrl: value => value || null },
    "@/lib/better-auth/session": { getCurrentSession: async () => member ? { user: { id: "member" } } : null },
    "@/lib/public-stocks": catalog,
  });
  for (const stock of catalog.PUBLIC_STOCKS) {
    const tree = await page.default({ params: Promise.resolve({ symbol: stock.symbol }) });
    assert.equal(tree.type, "GuestStockDetails");
    assert.equal(tree.props.stock.tvSymbol, stock.tvSymbol);
  }
  const locked = await page.default({ params: Promise.resolve({ symbol: "SPY" }) });
  assert.equal(locked.props.stock, null);
  await assert.rejects(page.default({ params: Promise.resolve({ symbol: "../bad" }) }), /Not found/);
  assert.equal(profiles, 0);
  member = true;
  const privateStock = await page.default({ params: Promise.resolve({ symbol: "AAPL" }) });
  assert.equal(privateStock.type, "MemberStockDetails");
  assert.equal(privateStock.props.followed, true);
  assert.equal(profiles, 1);
});

test("private news rejects guests before digest access and auth pages preserve safe return targets", async () => {
  const page = load("../app/(root)/news/page.tsx", {
    "@/components/DigestPanel": { default: "DigestPanel" },
    "@/lib/actions/digest.actions": { getDigestState: forbidden },
    "@/lib/i18n-server": { getServerLocale: forbidden },
    "@/lib/i18n": { getDictionary: forbidden },
    "@/lib/better-auth/session": { getCurrentSession: async () => null },
    "@/lib/auth-navigation": navigation,
    "next/navigation": { redirect },
  });
  await assert.rejects(page.default(), /Redirect \/sign-in\?returnTo=%2Fnews/);
  let signedIn = false;
  const gate = load("../components/AuthPage.tsx", {
    "@/lib/better-auth/session": { getCurrentSession: async () => signedIn ? { user: { id: "member" } } : null },
    "@/lib/auth-navigation": navigation,
    "next/navigation": { redirect },
  });
  assert.equal(await gate.default({ returnTo: "/stocks/AAPL", children: "form" }), "form");
  signedIn = true;
  await assert.rejects(gate.default({ returnTo: "/stocks/AAPL", children: "form" }), /Redirect \/stocks\/AAPL/);
  await assert.rejects(gate.default({ returnTo: "https://evil.example", children: "form" }), /^Error: Redirect \/$/);
});

test("verification keeps the validated destination both before and after a session is created", async () => {
  let session = null;
  let email = "owner@example.com";
  const page = load("../app/(auth)/verify-email/page.tsx", {
    "next/headers": { cookies: async () => ({ get: () => email ? { value: email } : undefined }) },
    "next/navigation": { redirect },
    "./VerifyEmailForm": { default: "VerifyEmailForm" },
    "@/lib/better-auth/session": { getCurrentSession: async () => session },
    "@/lib/auth-navigation": navigation,
  });
  const params = { searchParams: Promise.resolve({ returnTo: "/stocks/AAPL" }) };
  assert.equal((await page.default(params)).props.returnTo, "/stocks/AAPL");
  email = null;
  await assert.rejects(page.default(params), /Redirect \/sign-up\?returnTo=%2Fstocks%2FAAPL/);
  session = { user: { id: "member" } };
  await assert.rejects(page.default(params), /Redirect \/stocks\/AAPL/);
});

test("signup queues only the user returned by Better Auth; background and provider helpers are server-only", async () => {
  const queued = [];
  const actions = load("../lib/actions/auth.actions.ts", {
    "@/lib/better-auth/auth": { getAuth: async () => ({ api: {
      signUpEmail: async () => ({ user: { id: "new-account-from-auth" } }),
      sendVerificationOTP: async () => {},
    } }) },
    "../inngest/client": { inngest: { send: async () => {} } },
    "next/headers": { headers: async () => ({}), cookies: async () => ({ set() {} }) },
    "@/database/mongoose": {},
    "@/database/models/rateLimit.model": {},
    "./user.action": { Fetchnews: async id => queued.push(id) },
  });
  const result = await actions.signUpWithEmail({ email: "new@example.com", password: "test-password", fullName: "New User", userId: "another-user" });
  assert.equal(result.success, true);
  assert.equal(JSON.stringify(queued), '["new-account-from-auth"]');
  for (const path of ["../lib/finnhub/data.ts", "../lib/actions/user.action.ts"]) {
    const source = readFileSync(new URL(path, import.meta.url), "utf8");
    assert.match(source, /^import "server-only";/);
    assert.doesNotMatch(source, /["']use server["']/);
  }
  const signup = readFileSync(new URL("../app/(auth)/sign-up/SignUpForm.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(signup, /Fetchnews|user\.action/);
});
