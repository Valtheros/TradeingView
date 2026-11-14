import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const { NonRetriableError, RetryAfterError } = require('inngest');
function load(path, dependencies = {}, globals = {}) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8');
  const exports = {};
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  runInNewContext(compiled, { exports, Date, console, process: { env: {} }, require: name => {
    if (name in dependencies) return dependencies[name];
    if (['inngest', 'mongodb', 'node:crypto'].includes(name)) return require(name);
    throw new Error(`Unexpected dependency ${name}`);
  }, ...globals });
  return exports;
}
const policy = load('../lib/news-policy.ts');
const user = { id: '507f1f77bcf86cd799439011', email: 'test@example.com', name: 'Test' };
const edition = { userId: user.id, locale: 'th', dateISO: '2026-11-14' };

test('freshness follows the daily Bangkok edition, validates dates and keeps legacy content eligible for refresh', () => {
  assert.equal(policy.expectedDigestDate(new Date('2026-11-14T11:59:59Z')), '2026-11-13');
  assert.equal(policy.expectedDigestDate(new Date('2026-11-14T12:00:00Z')), '2026-11-14');
  assert.equal(policy.expectedDigestDate(new Date('2026-11-15T00:00:00Z')), '2026-11-14');
  assert.equal(policy.digestIsCurrent({ dateISO: '2026-11-14' }, '2026-11-14'), true);
  for (const dateISO of [undefined, 'old', '2026-02-31', '2026-11-13']) assert.equal(policy.digestIsCurrent({ dateISO }, '2026-11-14'), false);
});

test('preview uses a branch environment and separate stable collection, while production keeps existing news', () => {
  const env = values => load('../lib/inngest/environment.ts', {}, { process: { env: values } });
  const production = env({ VERCEL_ENV: 'production' });
  assert.equal(production.newsCollection, 'news_summaries');
  assert.equal(production.branchEnvironment, undefined);
  const preview = env({ VERCEL_ENV: 'preview', VERCEL_GIT_COMMIT_REF: 'codex/news-reliability' });
  assert.equal(preview.branchEnvironment, 'codex/news-reliability');
  assert.match(preview.newsCollection, /^news_summaries_preview_[a-f0-9]{12}$/);
  assert.equal(preview.newsCollection, env({ VERCEL_ENV: 'preview', VERCEL_GIT_COMMIT_REF: 'codex/news-reliability' }).newsCollection);
  assert.notEqual(preview.newsCollection, env({ VERCEL_ENV: 'preview', VERCEL_GIT_COMMIT_REF: 'codex/other' }).newsCollection);
});

function pipeline({ preview = false, current = [], users = [user], articles = [{ headline: 'Source news' }], aiError, saveError, saveResult = true, databaseError } = {}) {
  const calls = []; const events = []; const saves = [];
  const functions = load('../lib/inngest/functions.ts', {
    './client': { inngest: { createFunction: (config, triggers, handler) => ({ config, triggers, handler }) } },
    './environment': { isPreview: preview }, './gemini': { NEWS_MODEL: 'gemini-3.1-flash-lite', generateGeminiText: async () => { calls.push('ai'); if (aiError) throw aiError; return '<p>Generated news</p>'; } },
    '../actions/finnhub.actions': { getNews: async () => { calls.push('provider'); return articles; } },
    '../actions/user.action': { getAllUserForNews: async () => { if (databaseError) throw databaseError; return users; } },
    '../actions/saveusernews.action': { getRecentNewsSummaries: async () => current, saveUserNewsSummary: async value => { if (saveError) throw saveError; saves.push(value); return saveResult; } },
    '../watchlist-server': { getWatchlistSymbolsByEmail: async () => ['AAPL'] },
    '../nodemailer': { sendWelcomeEmail: async () => { calls.push('email'); } },
    '../i18n': { isLocale: value => value === 'en' || value === 'th' }, '../news-policy': policy,
    './prompts': { buildNewsSummaryPrompt: locale => locale, PERSONALIZED_WELCOME_EMAIL_PROMPT: '{{userProfile}}' },
  });
  const step = { run: async (id, callback) => { calls.push(id); return callback(); }, sendEvent: async (id, payload) => { events.push(...payload); } };
  return { ...functions, calls, events, saves, step, run: (data = edition) => functions.GenerateNewsSummary.handler({ event: { data }, step }) };
}

test('daily job dispatches independent language workers and does not claim they have already been saved', async () => {
  const api = pipeline();
  const result = await api.DailyNewsSummary.handler({ event: { id: 'cron-test', ts: Date.parse('2026-11-14T12:00:00Z'), data: {} }, step: api.step });
  assert.equal(result.status, 'dispatched');
  assert.equal(result.editions, 2);
  assert.deepEqual(api.events.map(event => event.data.locale), ['en', 'th']);
  assert.ok(api.events.every(event => event.data.userId === user.id && event.data.dateISO === '2026-11-14'));
  assert.equal(api.saves.length, 0);
  assert.equal(api.calls.includes('ai'), false);
  assert.ok(api.GenerateNewsSummary.config.singleton);
  assert.equal(api.GenerateNewsSummary.config.retries, 3);
  assert.equal(api.GenerateNewsSummary.config.throttle.limit, 4);
});

test('worker validates before reading data, skips current editions and preserves the dispatched date on retries', async () => {
  const api = pipeline();
  for (const data of [{ ...edition, userId: '../bad' }, { ...edition, locale: 'xx' }, { ...edition, dateISO: '2026-02-31' }]) await assert.rejects(api.run(data), /Invalid news edition/);
  assert.equal(api.calls.length, 0);
  const fresh = pipeline({ current: [{ dateISO: edition.dateISO }] });
  assert.equal((await fresh.run()).status, 'already-current');
  assert.equal(fresh.calls.includes('ai'), false);
  const result = await api.run();
  assert.equal(result.status, 'saved');
  assert.equal(api.saves[0].dateISO, edition.dateISO);
  assert.equal(api.saves[0].locale, 'th');
  assert.equal(api.saves[0].newsContent, '<p>Generated news</p>');
});

test('AI, provider and persistence failures never report a successful saved edition or replace old news', async () => {
  const failedAI = pipeline({ aiError: new RetryAfterError('429', '1m') });
  await assert.rejects(failedAI.run(), /429/);
  assert.equal(failedAI.saves.length, 0);
  await assert.rejects(pipeline({ articles: [] }).run(), /No source articles/);
  await assert.rejects(pipeline({ saveError: new Error('Database unavailable') }).run(), /Database unavailable/);
  await assert.rejects(pipeline({ saveResult: false }).run(), /not saved/);
  const failedDB = pipeline({ databaseError: new Error('Database unavailable') });
  await assert.rejects(failedDB.DailyNewsSummary.handler({ event: { data: {} }, step: failedDB.step }), /Database unavailable/);
  assert.equal((await pipeline().run({ ...edition, locale: 'en' })).status, 'saved');
});

test('Preview does not register cron or send welcome emails', async () => {
  const api = pipeline({ preview: true });
  assert.ok(api.DailyNewsSummary.triggers.every(trigger => !trigger.cron));
  assert.equal((await api.sendSignUpEmail.handler({ event: { data: {} }, step: api.step })).status, 'skipped');
  assert.equal(api.calls.length, 0);
});

function gemini(response, env = { GEMINI_API_KEY: 'test-secret' }) {
  const requests = [];
  const api = load('../lib/inngest/gemini.ts', { 'server-only': {} }, { process: { env }, AbortSignal, fetch: async (url, options) => {
    requests.push({ url, options });
    if (response instanceof Error) throw response;
    return response;
  } });
  return { ...api, requests };
}

test('Gemini keeps credentials out of URLs, bounds output and rejects incomplete or blocked responses', async () => {
  const api = gemini(Response.json({ candidates: [{ finishReason: 'STOP', content: { parts: [{ thought: true, text: 'private thought' }, { text: '<p>News</p>' }] } }] }));
  assert.equal(await api.generateGeminiText('test'), '<p>News</p>');
  assert.doesNotMatch(api.requests[0].url, /test-secret/);
  assert.equal(api.requests[0].options.headers['x-goog-api-key'], 'test-secret');
  assert.equal(JSON.parse(api.requests[0].options.body).generationConfig.maxOutputTokens, 6144);
  for (const result of [{}, { candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [{ text: 'truncated' }] } }] }]) await assert.rejects(gemini(Response.json(result)).generateGeminiText('test'), /incomplete/);
});

test('Gemini honors rate-limit delays, avoids retrying exhausted daily quotas and bounds transient errors', async () => {
  const limited = gemini(Response.json({ error: { details: [{ retryDelay: '120s' }] } }, { status: 429, headers: { 'Retry-After': '90' } }));
  await assert.rejects(limited.generateGeminiText('test'), error => error instanceof RetryAfterError && error.retryAfter === '120');
  const exhausted = gemini(Response.json({ error: { details: [{ violations: [{ quotaId: 'GenerateRequestsPerDayPerProject' }] }] } }, { status: 429 }));
  await assert.rejects(exhausted.generateGeminiText('test'), NonRetriableError);
  await assert.rejects(gemini(Response.json({}, { status: 503 })).generateGeminiText('test'), RetryAfterError);
  await assert.rejects(gemini(new Error('network failed')).generateGeminiText('test'), RetryAfterError);
  await assert.rejects(gemini(Response.json({}, { status: 403 })).generateGeminiText('test'), NonRetriableError);
  await assert.rejects(gemini(null, {}).generateGeminiText('test'), NonRetriableError);
});

test('storage keeps separate daily editions and propagates errors instead of returning false', async () => {
  const writes = [];
  let fail = false;
  const api = load('../lib/actions/saveusernews.action.ts', {
    'server-only': {}, '../inngest/environment': { newsCollection: 'preview-test' }, '../news-policy': policy,
    '@/lib/i18n': { DEFAULT_LOCALE: 'en', isLocale: value => value === 'en' || value === 'th' },
    '@/lib/sanitize': { sanitizeSummaryHtml: html => html },
    '@/database/mongoose': { connecttoDatabase: async () => ({ connection: { db: { collection: name => ({ updateOne: async (filter, update) => { if (fail) throw new Error('db failed'); writes.push({ name, filter, update }); } }) } } }) },
  });
  await api.saveUserNewsSummary({ ...edition, email: user.email, readableDate: 'Saved date', newsContent: '<p>News</p>' });
  assert.equal(writes[0].name, 'preview-test');
  assert.equal(writes[0].filter.dateISO, edition.dateISO);
  await assert.rejects(api.saveUserNewsSummary({ ...edition, email: user.email, newsContent: ' ' }), /Invalid/);
  fail = true;
  await assert.rejects(api.saveUserNewsSummary({ ...edition, email: user.email, newsContent: '<p>News</p>' }), /Failed to save/);
});
