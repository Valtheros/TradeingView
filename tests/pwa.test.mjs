import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = readFileSync(new URL("../public/sw.js", import.meta.url), "utf8");
function worker(fetcher = async () => new Response("network")) {
  const handlers = {};
  const removed = [];
  const cached = new Response("offline");
  vm.runInNewContext(source, {
    URL, Response, fetch: fetcher,
    self: { location: { origin: "https://stocks.example" }, addEventListener: (event, handler) => { handlers[event] = handler; }, skipWaiting() {}, clients: { claim: async () => {} } },
    caches: { match: async () => cached, keys: async () => ["stockmarket-shell-v0", "stockmarket-shell-v1", "unrelated-app"], delete: async (key) => { removed.push(key); } },
  });
  return { handlers, removed };
}

test("worker ignores APIs, POSTs, RSC and third-party resources", () => {
  const { handlers } = worker();
  for (const [url, method, mode] of [["/api/quotes", "POST", "cors"], ["/api/auth/session", "GET", "cors"], ["/?_rsc=test", "GET", "cors"], ["https://s3.tradingview.com/widget.js", "GET", "cors"]]) {
    let intercepted = false;
    handlers.fetch({ request: { url: new URL(url, "https://stocks.example").href, method, mode }, respondWith() { intercepted = true; } });
    assert.equal(intercepted, false);
  }
});

test("online documents are network-only and offline navigation uses the static fallback", async () => {
  for (const online of [true, false]) {
    const { handlers } = worker(async () => { if (!online) throw new Error("offline"); return new Response("network"); });
    let result;
    handlers.fetch({ request: { url: "https://stocks.example/news", method: "GET", mode: "navigate" }, respondWith(response) { result = response; } });
    assert.equal(await (await result).text(), online ? "network" : "offline");
  }
});

test("worker activation removes only obsolete StockMarket shell caches", async () => {
  const { handlers, removed } = worker();
  let finished;
  handlers.activate({ waitUntil(promise) { finished = promise; } });
  await finished;
  assert.deepEqual(removed, ["stockmarket-shell-v0"]);
});
