import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";

function load(path, modules = {}) {
  const exports = {};
  runInNewContext(ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports, URL, Response, require: name => { assert.ok(name in modules); return modules[name]; },
  });
  return exports;
}
const { parseSymbols } = load("../lib/quotes.ts");
const { companyLogoUrl, handleLogoRequest } = load("../lib/company-logos.ts", { "./quotes": { parseSymbols } });
const logo = "https://static2.finnhub.io/file/publicdatany/finnhubimage/stock_logo/AAPL.png";
const request = symbols => new Request("https://stocks.example/api/company-logos", { method: "POST", body: JSON.stringify({ symbols }) });

test("company logos accept only HTTPS images from the existing provider", () => {
  assert.equal(companyLogoUrl(logo), logo);
  for (const value of [null, "", "javascript:alert(1)", "http://static2.finnhub.io/a.png", "https://static2.finnhub.io.evil.example/a.png", "https://user:password@static2.finnhub.io/a.png"]) assert.equal(companyLogoUrl(value), null);
});

test("logos authenticate and validate before upstream calls, and never cache user API responses", async () => {
  let calls = 0;
  const profile = async () => { calls++; return { logo }; };
  assert.equal((await handleLogoRequest(request(["AAPL"]), async () => false, profile)).status, 401);
  assert.equal((await handleLogoRequest(request(["../bad"]), async () => true, profile)).status, 400);
  assert.equal((await handleLogoRequest(request(Array(21).fill("AAPL")), async () => true, profile)).status, 400);
  assert.equal((await handleLogoRequest(request(["AAPL"]), async () => { throw new Error("Database unavailable"); }, profile)).status, 503);
  assert.equal(calls, 0);
  const response = await handleLogoRequest(request([" aapl ", "AAPL"]), async () => true, profile);
  assert.deepEqual(await response.json(), { logos: { AAPL: logo } });
  assert.equal(calls, 1);
  assert.match(response.headers.get("cache-control"), /private, no-store/);
});

test("missing or failed logos do not drop successful images and profile requests stay bounded", async () => {
  let active = 0;
  let maximum = 0;
  const response = await handleLogoRequest(request(["AAPL", "MISSING", "FAILED", "X1", "X2", "X3"]), async () => true, async symbol => {
    active++; maximum = Math.max(maximum, active);
    await new Promise(resolve => setTimeout(resolve, 2)); active--;
    if (symbol === "FAILED") throw new Error("Provider unavailable");
    return symbol === "MISSING" ? null : { logo };
  });
  const { logos } = await response.json();
  assert.equal(logos.AAPL, logo);
  assert.equal(logos.MISSING, null);
  assert.equal(logos.FAILED, null);
  assert.equal(Object.keys(logos).length, 6);
  assert.ok(maximum <= 4);
});
