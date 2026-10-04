import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
import test, { after } from "node:test";
import ts from "typescript";

const directory = mkdtempSync(join(tmpdir(), "stockmarket-quotes-"));
for (const file of ["quotes", "quote-handler"]) {
  const source = readFileSync(new URL(`../lib/${file}.ts`, import.meta.url), "utf8");
  writeFileSync(join(directory, `${file}.js`), ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText);
}
after(() => rmSync(directory, { recursive: true, force: true }));
const require = createRequire(import.meta.url);
const { parseSymbols, createQuoteLoader, mergeQuotes, shouldRefreshQuotes } = require(join(directory, "quotes.js"));
const { handleQuoteRequest } = require(join(directory, "quote-handler.js"));
const good = { ok: true, status: 200, data: { c: 120, d: 2, dp: 1.7, t: 1_700_000_000 } };

test("validates, normalizes and deduplicates symbols with a 20-symbol limit", () => {
  assert.deepEqual(parseSymbols([" aapl ", "AAPL", "BRK.B"]), ["AAPL", "BRK.B"]);
  for (const input of [null, [], ["../secret"], [1], ["a b"], Array(21).fill("AAPL")]) assert.equal(parseSymbols(input), null);
});

test("quotes API authenticates before parsing or calling the upstream service", async () => {
  let called = false;
  const response = await handleQuoteRequest(new Request("http://localhost/api/quotes", { method: "POST", body: "invalid json" }), async () => false, async () => { called = true; });
  assert.equal(response.status, 401);
  assert.equal(called, false);
  assert.match(response.headers.get("cache-control"), /no-store/);
});

test("quotes API rejects invalid input and returns only the requested normalized symbols", async () => {
  const request = (body) => new Request("http://localhost/api/quotes", { method: "POST", body: JSON.stringify(body) });
  assert.equal((await handleQuoteRequest(request({ symbols: ["bad/value"] }), async () => true, async () => { throw Error("must not fetch"); })).status, 400);
  const response = await handleQuoteRequest(request({ symbols: ["aapl"] }), async () => true, async (symbols) => ({ quotes: symbols, retryAfter: 0 }));
  assert.deepEqual(await response.json(), { quotes: ["AAPL"], retryAfter: 0 });
});

test("deduplicates concurrent quotes, caches for 60 seconds, and expires the cache", async () => {
  let calls = 0;
  let now = 1_700_000_100_000;
  const load = createQuoteLoader(async () => { calls++; return good; }, () => now);
  await Promise.all([load(["AAPL"]), load(["AAPL"])]);
  await load(["AAPL"]);
  assert.equal(calls, 1);
  now += 60_001;
  const result = await load(["AAPL"]);
  assert.equal(calls, 2);
  assert.equal(result.quotes[0].quoteTime, new Date(good.data.t * 1000).toISOString());
});

test("bounds concurrent upstream requests across batches", async () => {
  let active = 0;
  let maximum = 0;
  const load = createQuoteLoader(async () => {
    active++; maximum = Math.max(active, maximum);
    await new Promise((resolve) => setTimeout(resolve, 2));
    active--; return good;
  });
  await Promise.all([load(Array.from({ length: 10 }, (_, i) => `S${i}`)), load(["OTHER"])]);
  assert.equal(maximum, 4);
});

test("a missing symbol does not drop other quotes or invent a zero daily change", async () => {
  const load = createQuoteLoader(async (symbol) => symbol === "GOOD" ? { ...good, data: { c: 120 } } : { ok: true, status: 200, data: { c: 0 } });
  const { quotes } = await load(["GOOD", "MISSING"]);
  assert.equal(quotes[0].status, "ready");
  assert.equal(quotes[0].changePercent, null);
  assert.equal(quotes[1].status, "unavailable");
  assert.equal(quotes[1].price, null);
  const merged = mergeQuotes({ MISSING: { ...quotes[0], symbol: "MISSING" } }, [quotes[1]]);
  assert.equal(merged.MISSING.price, 120);
  assert.equal(merged.MISSING.status, "unavailable");
});

test("honors rate-limit backoff instead of immediately retrying", async () => {
  let calls = 0;
  let now = 1_700_000_100_000;
  const load = createQuoteLoader(async () => { calls++; return { ok: false, status: 429, retryAfter: 120, data: {} }; }, () => now);
  assert.equal((await load(["AAPL"])).retryAfter, 120);
  await load(["MSFT"]);
  assert.equal(calls, 1);
  now += 120_001;
  await load(["AAPL"]);
  assert.equal(calls, 2);
});

test("refresh requires a visible online app and data at least one minute old", () => {
  assert.equal(shouldRefreshQuotes(false, true, 0, 60_000), false);
  assert.equal(shouldRefreshQuotes(true, false, 0, 60_000), false);
  assert.equal(shouldRefreshQuotes(true, true, 1, 60_000), false);
  assert.equal(shouldRefreshQuotes(true, true, 0, 60_000), true);
});
