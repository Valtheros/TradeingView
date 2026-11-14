import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";

const html = readFileSync(new URL("../public/stock-loading.html", import.meta.url), "utf8");
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];

function handoff(symbol, cookie = "") {
  const elements = new Map();
  const node = key => {
    if (!elements.has(key)) elements.set(key, { dataset: { copy: key }, setAttribute(name, value) { this[name] = value; } });
    return elements.get(key);
  };
  const frames = [];
  const timers = [];
  const destinations = [];
  const document = {
    cookie, documentElement: {},
    querySelectorAll: () => [node("back"), node("loading"), node("retry")],
    querySelector: node, getElementById: node,
  };
  runInNewContext(script, {
    document, URLSearchParams, encodeURIComponent,
    location: { search: new URLSearchParams({ symbol }).toString(), replace: path => destinations.push(path) },
    requestAnimationFrame: callback => frames.push(callback),
    setTimeout: (callback, delay) => timers.push({ callback, delay }),
  });
  return { elements, document, frames, timers, destinations };
}

test("widget handoff paints a stock skeleton before replacing history with a safe internal route", () => {
  for (const symbol of ["AAPL", "ORCL", " aapl ", "BRK.B"]) {
    const { elements, frames, destinations } = handoff(symbol);
    assert.deepEqual(destinations, []);
    frames.shift()();
    assert.deepEqual(destinations, []);
    frames.shift()();
    assert.deepEqual(destinations, [`/stocks/${symbol.trim().toUpperCase()}`]);
    assert.equal(elements.get("symbol").textContent, symbol.trim().toUpperCase());
  }
});

test("widget handoff rejects external URLs, markup, paths and oversized symbols", () => {
  for (const symbol of ["", "https://evil.example", "//evil.example", "../news", "NASDAQ:AAPL", '<img src=x onerror=alert(1)>', "A".repeat(16)]) {
    const { frames, destinations } = handoff(symbol);
    frames.shift()();
    frames.shift()();
    assert.deepEqual(destinations, ["/"]);
  }
});

test("public skeleton localizes without auth/data requests and exposes a retry for slow navigation", () => {
  for (const [cookie, locale] of [["", "en"], ["other=x; stockmarket-locale=th", "th"], ["stockmarket-locale=invalid", "en"]]) {
    const { document, elements, timers } = handoff("MSFT", cookie);
    assert.equal(document.documentElement.lang, locale);
    assert.equal(elements.get("main")["aria-label"], locale === "th" ? "กำลังโหลดข้อมูลหุ้น" : "Loading stock");
    assert.equal(elements.get("retry").href, "/stocks/MSFT");
    assert.equal(timers[0].delay, 10000);
    timers[0].callback();
    assert.equal(elements.get(".recovery").hidden, false);
  }
  assert.doesNotMatch(script, /fetch\(|localStorage|sessionStorage|innerHTML|document\.write/);
  assert.match(html, /prefers-reduced-motion/);
  assert.match(html, /height: 460px/);
});

test("both public stock widgets navigate through the public shell; native loading never awaits server data", () => {
  for (const path of ["../components/GuestMarketData.tsx", "../components/MarketOverview.tsx"]) {
    assert.match(readFileSync(new URL(path, import.meta.url), "utf8"), /stock-loading\.html\?symbol=\{tvsymbol\}/);
  }
  for (const user of [null, { id: "member" }]) {
    const exports = {};
    runInNewContext(ts.transpileModule(readFileSync(new URL("../app/(root)/stocks/[symbol]/loading.tsx", import.meta.url), "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
    }).outputText, {
      exports,
      require: name => {
        if (name === "react/jsx-runtime") return { jsx: (type, props) => ({ type, props }) };
        if (name === "@/components/PageSkeleton") return { StockSkeleton: "StockSkeleton" };
        if (name === "@/components/AppAccessProvider") return { useAppAccess: () => ({ user }) };
        assert.fail(`Loading must not depend on ${name}`);
      },
    });
    assert.equal(exports.default().props.guest, !user);
  }
});
