import assert from "node:assert/strict";
import { AsyncLocalStorage } from "node:async_hooks";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";

function load(path, modules, context = {}) {
  const exports = {};
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports, Date, console: { error() {} }, ...context, require: name => { assert.ok(name in modules, `Unexpected dependency ${name}`); return modules[name]; },
  });
  return exports;
}

const { parseSymbols } = load("../lib/quotes.ts", {});

test("auth initializes once and trusts only the exact preview host without changing production", async () => {
  for (const environment of ["preview", "production"]) {
    let connections = 0;
    let options;
    const api = load("../lib/better-auth/auth.ts", {
      "better-auth": { betterAuth: config => { options = config; return { api: {} }; } },
      "better-auth/adapters/mongodb": { mongodbAdapter: db => db },
      "@/database/mongoose": { connecttoDatabase: async () => { connections++; return { connection: { db: {} } }; } },
      "better-auth/next-js": { nextCookies: () => ({}) },
      "better-auth/plugins": { emailOTP: () => ({}) },
      "../nodemailer": { sendOTPEmail: async () => {} },
      "next/server": { after: () => {} },
    }, { process: { env: { VERCEL_ENV: environment, VERCEL_URL: "stockmarket-test.vercel.app", BETTER_AUTH_URL: "https://stockmarket-fdev.vercel.app", TRUSTED_ORIGINS: "https://stockmarket-fdev.vercel.app, " } } });
    const [a, b] = await Promise.all([api.getAuth(), api.getAuth()]);
    assert.equal(a, b);
    assert.equal(connections, 1);
    assert.equal(options.baseURL, environment === "preview" ? "https://stockmarket-test.vercel.app" : "https://stockmarket-fdev.vercel.app");
    assert.equal(options.trustedOrigins.includes("https://stockmarket-test.vercel.app"), environment === "preview");
    assert.ok(!options.trustedOrigins.some(origin => origin.includes("*") || !origin));
  }
});

test("session skips the database without a cookie and shares reads only within each request", async () => {
  const requests = new AsyncLocalStorage();
  let reads = 0;
  const api = load("../lib/better-auth/session.ts", {
    "server-only": {},
    react: { cache: fn => () => {
      const store = requests.getStore();
      if (!store.memo) store.memo = fn();
      return store.memo;
    } },
    "next/headers": { headers: async () => new Headers(requests.getStore().user ? { cookie: requests.getStore().user } : {}) },
    "better-auth/cookies": { getSessionCookie: headers => headers.get("cookie") },
    "./auth": { getAuth: async () => { reads++; return { api: { getSession: async ({ headers }) => ({ user: { id: headers.get("cookie") } }) } }; } },
  });
  assert.equal(await requests.run({}, () => api.getCurrentSession()), null);
  assert.equal(reads, 0);
  const users = await Promise.all(["alice", "bob"].map(user => requests.run({ user }, async () => {
    const [a, b] = await Promise.all([api.getCurrentSession(), api.getCurrentSession()]);
    assert.equal(a.user.id, user);
    assert.equal(a, b);
    return a.user.id;
  })));
  assert.deepEqual(users, ["alice", "bob"]);
  assert.equal(reads, 2);
});

test("watchlist validates before writing, scopes users, inserts atomically and invalidates affected pages", async () => {
  let user = "alice";
  const records = new Map();
  const invalidated = [];
  let writes = 0;
  let fail = false;
  const api = load("../lib/actions/watchlist.actions.ts", {
    "../better-auth/session": { getCurrentSession: async () => user ? { user: { id: user } } : null },
    "../quotes": { parseSymbols },
    "next/navigation": { redirect: path => { throw new Error(`Redirect ${path}`); } },
    "next/cache": { revalidatePath: path => invalidated.push(path) },
    "@/database/models/watchlist.model": { Watchlist: {
      updateOne: async (filter, update, options) => {
        writes++;
        assert.equal(options.upsert, true);
        assert.equal(options.runValidators, true);
        if (fail) throw new Error("database unavailable");
        const key = `${filter.userId}:${filter.symbol}`;
        if (!records.has(key)) records.set(key, update.$setOnInsert.company);
        else throw Object.assign(new Error("concurrent duplicate"), { code: 11000 });
      },
      deleteOne: async filter => { writes++; records.delete(`${filter.userId}:${filter.symbol}`); },
      find: (filter, projection) => {
        assert.equal(projection._id, 0);
        return { sort: () => ({ lean: async () => Array.from(records).filter(([key]) => key.startsWith(`${filter.userId}:`)).map(([key, company]) => ({ symbol: key.split(":")[1], company })) }) };
      },
    } },
  });
  for (const symbol of ["../bad", null, 42]) await assert.rejects(api.addWatchlistItem(symbol, "Apple"), /Invalid stock symbol/);
  await assert.rejects(api.addWatchlistItem("AAPL", ""), /Invalid company/);
  assert.equal(writes, 0);
  await api.addWatchlistItem(" aapl ", "Apple");
  await api.addWatchlistItem("AAPL", "Do not overwrite the saved company");
  assert.equal(records.get("alice:AAPL"), "Apple");
  assert.ok(invalidated.includes("/stocks/AAPL"));
  assert.ok(invalidated.includes("/watchlist"));
  assert.equal((await api.getUserWatchlist())[0].company, "Apple");
  user = "bob";
  assert.equal((await api.getUserWatchlist()).length, 0);
  await api.removeFromWatchlist("AAPL");
  assert.equal(records.get("alice:AAPL"), "Apple");
  fail = true;
  await assert.rejects(api.addWatchlistItem("MSFT", "Microsoft"), /Failed to add/);
  user = null;
  const before = writes;
  await assert.rejects(api.addWatchlistItem("AAPL", "Apple"), /Redirect/);
  await assert.rejects(api.removeFromWatchlist("AAPL"), /Redirect/);
  await assert.rejects(api.getUserWatchlist(), /Redirect/);
  assert.equal(writes, before);
});

test("news storage propagates database failures instead of returning an empty edition", async () => {
  const api = load("../lib/actions/saveusernews.action.ts", {
    "server-only": {},
    "@/database/mongoose": { connecttoDatabase: async () => { throw new Error("Database unavailable"); } },
    "@/lib/sanitize": { sanitizeSummaryHtml: html => html },
    "@/lib/i18n": { DEFAULT_LOCALE: "en", isLocale: value => value === "en" || value === "th" },
  });
  await assert.rejects(api.getRecentNewsSummaries("alice", 1, "th"), /Failed to read news summaries/);
});
