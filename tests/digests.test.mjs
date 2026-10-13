import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const sanitizeSource = readFileSync(new URL("../lib/sanitize.ts", import.meta.url), "utf8");
const sanitizeExports = {};
runInNewContext(ts.transpileModule(sanitizeSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, { exports: sanitizeExports, require });

const source = readFileSync(new URL("../lib/actions/digest.actions.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const english = { id: "edition-en", readableDate: "October 2, 2026", newsContent: "<p>Saved news</p>", updatedAt: new Date("2026-10-02T20:00:00Z") };

function setup({ signedIn = true, en = [english], th = [], databaseError = false } = {}) {
  const reads = [];
  const events = [];
  const exports = {};
  const modules = {
    "@/lib/better-auth/session": { getCurrentSession: async () => signedIn ? { user: { id: "current-user" } } : null },
    "@/lib/sanitize": sanitizeExports,
    "./saveusernews.action": { getRecentNewsSummaries: async (user, limit, locale) => { if (databaseError) throw new Error("Database unavailable"); reads.push({ user, limit, locale }); return (locale === "th" ? th : en).slice(0, limit); } },
    "@/lib/inngest/client": { inngest: { send: async event => { events.push(event); } } },
    "@/lib/i18n": { isLocale: locale => locale === "en" || locale === "th" },
  };
  runInNewContext(compiled, { exports, Date, require: name => {
    if (!(name in modules)) throw new Error(`Unexpected dependency ${name}`);
    return modules[name];
  } });
  return { ...exports, reads, events };
}

test("missing Thai digest keeps the saved English edition and its actual date", async () => {
  const api = setup();
  const state = await api.getDigestState("th");
  assert.equal(state.pending, true);
  assert.equal(state.fallback, true);
  assert.equal(state.summaries[0].locale, "en");
  assert.equal(state.summaries[0].date, english.readableDate);
  assert.equal(state.summaries[0].html, english.newsContent);
  assert.deepEqual(api.reads.map(r => r.locale), ["th", "en"]);
  assert.equal(api.events.length, 0);
});

test("preview reads one saved edition, strips markup and preserves dates without modifying full news", async () => {
  const edition = { ...english, newsContent: `<h2>Market</h2><p>${"ข่าวทดสอบ ".repeat(300)}</p><script>alert(1)</script>` };
  const api = setup({ en: [edition, { ...edition, id: "older" }] });
  const preview = await api.getDigestState("th", "preview");
  assert.equal(preview.summaries.length, 1);
  assert.equal(preview.summaries[0].date, edition.readableDate);
  assert.equal(preview.summaries[0].locale, "en");
  assert.equal(preview.fallback, true);
  assert.ok(preview.summaries[0].html.length < edition.newsContent.length);
  assert.doesNotMatch(preview.summaries[0].html, /<|alert/);
  assert.ok(api.reads.every(read => read.limit === 1));
  assert.equal((await api.getDigestState("en")).summaries[0].html, edition.newsContent);
  await assert.rejects(api.getDigestState("en", "invalid"), /Invalid digest view/);
});

test("database failure is not mistaken for missing news and never queues generation", async () => {
  const api = setup({ databaseError: true });
  await assert.rejects(api.getDigestState("th"), /Database unavailable/);
  await assert.rejects(api.queueDigest("th"), /Database unavailable/);
  assert.equal(api.events.length, 0);
});

test("ready Thai and legacy English digests do not enter a generation loading state", async () => {
  const api = setup({ th: [{ ...english, locale: "th" }] });
  assert.equal((await api.getDigestState("th")).pending, false);
  const englishState = await api.getDigestState("en");
  assert.equal(englishState.pending, false);
  assert.equal(englishState.summaries[0].locale, "en");
  await api.queueDigest("th");
  assert.equal(api.events.length, 0);
});

test("new accounts stay pending and queue only their own requested language with a deduplication id", async () => {
  const api = setup({ en: [] });
  const state = await api.getDigestState("th");
  assert.equal(state.pending, true);
  assert.equal(state.fallback, false);
  assert.equal(state.summaries.length, 0);
  await api.queueDigest("th");
  assert.match(api.events[0].id, /^digest-current-user-th-\d+$/);
  assert.equal(api.events[0].data.userId, "current-user");
  assert.equal(api.events[0].data.locales.join(","), "th");
});

test("digest reads and generation reject invalid locales and unauthenticated users", async () => {
  const api = setup({ signedIn: false });
  await assert.rejects(api.getDigestState("th"), /Unauthorized/);
  await assert.rejects(api.queueDigest("th"), /Unauthorized/);
  await assert.rejects(api.getDigestState("invalid"), /Invalid locale/);
  await assert.rejects(api.queueDigest("invalid"), /Invalid locale/);
  assert.equal(api.reads.length, 0);
  assert.equal(api.events.length, 0);
});
