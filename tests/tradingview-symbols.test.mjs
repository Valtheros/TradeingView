import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import ts from "typescript";

async function importTsModule(relativePath) {
  const sourceUrl = new URL(relativePath, import.meta.url);
  const source = readFileSync(sourceUrl, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const outputPath = join(
    mkdtempSync(join(tmpdir(), "tradingview-symbols-")),
    "module.mjs"
  );

  writeFileSync(outputPath, output);
  return import(pathToFileURL(outputPath).href);
}

const { selectBestTradingViewMatch } = await importTsModule(
  "../lib/tradingview/symbol-utils.ts"
);
const { getFinnhubApiKey } = await importTsModule("../lib/finnhub/env.ts");

test("selects the company stock when a suffixed Finnhub symbol returns unrelated results", () => {
  const match = selectBestTradingViewMatch("AIR.PA", "Airbus SE", [
    {
      symbol: "AAL3938875",
      description: "US Airways Pass Thru 2012-2 4.625% 03-JUN-2025",
      exchange: "FINRA",
      type: "bond",
    },
    {
      symbol: "AIR",
      description: "Airbus SE",
      exchange: "Euronext Paris",
      prefix: "EURONEXT",
      type: "stock",
      is_primary_listing: true,
    },
  ]);

  assert.equal(match?.widgetSymbol, "EURONEXT:AIR");
  assert.equal(match?.exchange, "Euronext Paris");
});

test("rejects unrelated TradingView results instead of passing false positives", () => {
  const match = selectBestTradingViewMatch("7203.T", "Toyota Motor Corp", [
    {
      symbol: "BTCUSDT",
      description: "Bitcoin / TetherUS",
      exchange: "Binance",
      type: "spot",
    },
    {
      symbol: "TSLA",
      description: "Tesla, Inc.",
      exchange: "NASDAQ",
      type: "stock",
    },
  ]);

  assert.equal(match, null);
});

test("normalizes class-share punctuation when matching TradingView symbols", () => {
  const match = selectBestTradingViewMatch(
    "BRK-B",
    "Berkshire Hathaway Inc. Class B",
    [
      {
        symbol: "BRKY",
        description: "IncomeShares Berkshire Hathaway (BRK-B) Options ETP",
        exchange: "LSE",
        type: "fund",
      },
      {
        symbol: "BRK.B",
        description: "Berkshire Hathaway Inc. Class B",
        exchange: "NYSE",
        type: "stock",
      },
    ]
  );

  assert.equal(match?.widgetSymbol, "NYSE:BRK.B");
});

test("reads the server Finnhub key and falls back to the legacy public key", () => {
  assert.equal(
    getFinnhubApiKey({
      FINNHUB_API_KEY: "server-key",
      NEXT_PUBLIC_FINNHUB_API_KEY: "legacy-key",
    }),
    "server-key"
  );

  assert.equal(
    getFinnhubApiKey({
      NEXT_PUBLIC_FINNHUB_API_KEY: "legacy-key",
    }),
    "legacy-key"
  );
});
