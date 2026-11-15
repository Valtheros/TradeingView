import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";

function load(path, modules = {}, globals = {}) {
  const exports = {};
  runInNewContext(ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, {
    exports, ...globals,
    require: name => {
      assert.ok(name in modules, `Unexpected guest dependency: ${name}`);
      return modules[name];
    },
  });
  return exports;
}
const catalog = load("../lib/public-stocks.ts");

function widget(locale = "en") {
  const states = [];
  const effects = [];
  const timers = [];
  const ref = { current: null };
  const modules = {
    react: {
      useRef: () => ref,
      useMemo: callback => callback(),
      useState: initial => [initial, value => states.push(value)],
      useEffect: callback => effects.push(callback),
    },
    "react/jsx-runtime": { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    "lucide-react": { RefreshCw: "RefreshCw" },
    "@/lib/public-stocks": catalog,
    "./LanguageProvider": { useLanguage: () => ({ locale, dictionary: { guest: { explore: "Explore", marketData: "Provider data" }, daily: { retry: "Retry" } } }) },
  };
  const component = load("../components/GuestMarketData.tsx", modules, {
    setTimeout: (callback, delay) => { timers.push({ callback, delay }); return timers.length; },
    clearTimeout: id => { timers[id - 1].cleared = true; },
  });
  const tree = component.default();
  function find(node, type) {
    if (!node || typeof node !== "object") return null;
    if (Array.isArray(node)) return node.map(child => find(child, type)).find(Boolean);
    return node.type === type ? node : find(node.props?.children, type);
  }
  return { component, frame: find(tree, "iframe"), states, effects, timers, ref };
}

test("guest catalog uses provider-owned full-row tickers with the same ten stocks and reserved height", () => {
  const { component, frame } = widget();
  const html = component.guestMarketDocument("en");
  assert.match(html, /<tv-tickers[^>]+direction="vertical"[^>]+item-size="compact"[^>]+hide-chart/);
  assert.ok(html.includes(`symbols="${catalog.PUBLIC_STOCKS.map(stock => stock.tvSymbol).join(",")}"`));
  assert.match(html, /height:520px/);
  assert.match(html, /<script type="module" src="https:\/\/widgets\.tradingview-widget\.com\/w\/en\/tv-tickers\.js"/);
  assert.equal(frame.props.title, "Explore");
  assert.equal(frame.props.srcDoc, html);
  assert.doesNotMatch(html, /pointer-events:none|shadowRoot|postMessage|\/api\/|finnhub|querySelectorAll/);
});

test("each locale uses its own provider registration and symbol URL stays on the current origin", () => {
  for (const [locale, moduleLocale] of [["en", "en"], ["th", "th_TH"]]) {
    const { component } = widget(locale);
    const html = component.guestMarketDocument(locale);
    assert.ok(html.includes(`/w/${moduleLocale}/tv-tickers.js`));
    assert.ok(html.includes(`<html lang="${locale}">`));
    const inline = html.match(/<script>([\s\S]*?)<\/script>/)[1];
    for (const origin of ["https://stocks.example", "https://preview.example"]) {
      let destination;
      runInNewContext(inline, { URL, document: { baseURI: origin + "/?test=1", querySelector: selector => {
        assert.equal(selector, "tv-tickers");
        return { setAttribute(name, value) { assert.equal(name, "symbol-url"); destination = value; } };
      } } });
      assert.equal(destination, origin + "/stock-loading.html?symbol={tvsymbol}");
    }
  }
});

test("blocked or slow provider modules expose retry, late success recovers and timers clean up", () => {
  for (const defined of [false, true]) {
    const { frame, effects, states, timers, ref } = widget();
    ref.current = { contentWindow: { customElements: { get: () => defined ? class Tickers {} : undefined } } };
    const cleanup = effects[0]();
    assert.equal(timers[0].delay, 8000);
    timers[0].callback();
    assert.deepEqual(states, defined ? [] : ["en:0"]);
    frame.props.onLoad({ currentTarget: ref.current });
    assert.equal(states.at(-1), defined ? null : "en:0");
    cleanup();
    assert.equal(timers[0].cleared, true);
  }
  const { frame, states } = widget("th");
  frame.props.onLoad({ currentTarget: { contentWindow: { customElements: { get: () => class Tickers {} } } } });
  assert.deepEqual(states, [null]);
});
