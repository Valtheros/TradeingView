# StockMarket Agent Guide

## Purpose and Working Rules

StockMarket is a mobile-first US-stock companion, not a trading platform or a marketing site. The first screen is Today. The primary user device is an installed iPhone/Safari PWA. Preserve public browsing, EN/TH, saved news history, and the dark gray/yellow design.

- Read the affected code and all callers before editing. Prefer existing helpers and installed dependencies; keep changes scoped.
- Do not revert unrelated changes, rewrite history, expose credentials, or copy test-account credentials from chat into the repository.
- Do not start, stop, or replace the user's dev server unless explicitly requested. Use Vercel Preview for browser QA when requested.
- Build into `.next-build` while a dev server might be using `.next`. Never delete a live server's output to resolve a build error.
- Use `apply_patch` for manual edits. Keep documentation current when changing architecture, access boundaries, or operational behavior.
- This file describes implementation, not proof that a deployment or physical-device test passed. Check the current branch and deployment.

## Verification Policy

After code changes, run the narrowest useful verification first. For this Next.js project, prefer:

- `npm run lint`
- `npm run build` when changes touch app structure, rendering, TypeScript types, imports, package versions, or production behavior.

Next.js dev/build may hit `spawn EPERM` inside a Windows sandbox. Rerun the same command with escalation when the current tool permissions allow it; this is not automatically an application failure. Never bypass a current permission restriction.

Complete verification for application changes:

```powershell
node --test tests/<affected-file>.test.mjs
npm run lint
npx tsc --noEmit --incremental false
npm test
$env:NEXT_DIST_DIR = '.next-build'
npm run build
Remove-Item Env:NEXT_DIST_DIR
```

The environment variable must be set in the same process as the build. No server is needed for these checks. When using a new shell, set it again for any command consuming that build. If a build fails, report the actual error rather than deleting unrelated outputs.

Tests use Node's built-in test runner, TypeScript `transpileModule`, and VM dependency stubs. There is no Jest, Vitest, or Playwright test dependency. Reuse this approach for focused regressions. Browser artifacts belong under ignored `output/playwright/`; CLI snapshots are ignored under `.playwright-cli/`.

## Stack and Entry Points

- Next.js App Router/Turbopack, React, TypeScript; `package.json` and lockfile are version authority.
- Tailwind CSS 4, shadcn/Radix primitives, Lucide icons. `app/globals.css` holds shared tokens/utilities; `app/daily.css` owns the app shell, daily screens, responsive styles, and skeleton geometry. Avoid adding competing override layers.
- MongoDB is the database. `database/mongoose.ts` shares a connection promise per server process and resets it after connection failure. Better Auth uses the native MongoDB adapter over that connection.
- Finnhub provides authenticated member data; TradingView embedded widgets provide public market data/charts. Inngest orchestrates Gemini news and welcome emails; Nodemailer delivers email.
- `@/*` maps to the repository root. Shared legacy types are in `types/global.d.ts`.
- `app/layout.tsx`: locale, Geist/Geist Mono and IBM Plex Sans Thai, root metadata/startup images, `LanguageProvider`, `PwaProvider`, toast host.
- `app/(root)/layout.tsx`: session-aware shell, `AppAccessProvider`, `SearchProvider`, header/sidebar, content, and mobile bottom navigation. Its boot fallback contains no private data.
- `components/PageSkeleton.tsx`, `AppBootSkeleton.tsx`, `LanguageSurface.tsx`: loading UI. Skeletons must match real sections and may extend beyond one viewport.
- `app/error.tsx`, `app/global-error.tsx`, `app/(root)/error.tsx`, `SectionBoundary.tsx`: retryable failures at different boundaries.

## Routes and Access Boundaries

| Route | Behavior |
| --- | --- |
| `/` | Guest exploration or member Today with six followed/default stocks, news preview, market overview. |
| `/stocks/[symbol]` | Public-catalog widgets for guests; profile, quotes, watchlist state and chart resolution for members. |
| `/watchlist` | Member-only, 20 stocks per page. |
| `/news` | Member-only, latest and stored historical digests. |
| `/sign-in`, `/sign-up`, `/verify-email`, `/forgot-password` | Existing auth forms, with safe internal return destinations. |
| `/api/auth/[...all]` | Better Auth GET/POST handler. |
| `/api/quotes`, `/api/company-logos` | Authenticated POST batch endpoints, private/no-store responses. |
| `/api/inngest` | Inngest function registration/execution. |

`proxy.ts` guards watchlist/news by cookie presence, not full session validity. Server pages/actions/APIs still validate the real session. It also rejects malformed stock paths with a hard HTTP 404 before streaming. Public assets, manifest, service worker, and offline/loading HTML must remain accessible without login.

`lib/better-auth/session.ts` is the single server session helper. `React.cache()` deduplicates only within a request; never introduce a cross-request user/session cache. Without a session cookie, it returns before initializing auth or MongoDB. A cookie's presence is not authorization.

### Guest Browsing

- `lib/public-stocks.ts` is the fixed catalog: AAPL, MSFT, GOOGL, AMZN, TSLA, META, NVDA, NFLX on NASDAQ; ORCL and CRM on NYSE. Do not label it a live popularity ranking.
- `GuestToday`, `GuestMarketData`, `GuestSearchDialog`, and `GuestStockDetails` must not mount quote/logo hooks, call Finnhub/search resolution, read watchlists/digests, or queue Inngest jobs.
- Guest search filters the catalog locally, instantly, by name/symbol. No debounce or Server Action is necessary.
- Valid symbols outside the catalog display a sign-in notice without provider calls; malformed symbols are 404.
- Public prices/logos stay inside provider-owned iframes. Keep TradingView branding/attribution; do not scrape, restyle internal columns, or extract provider data into native cards.
- The Guest catalog uses the provider's vertical compact `tv-tickers` Web Component, whose full rows are stock links, rather than the legacy Market Overview/Market Data symbol-only links. `GuestMarketData` renders it in an app-owned `srcDoc` iframe: each locale has its own custom-element registration (`en` / `th_TH`), preventing EN/TH constructor collisions. Reserve 520px plus attribution, preserve native touch scrolling/branding, and use only public theme tokens. Do not add coordinate overlays or inspect the provider's closed shadow root/data. Its module has an eight-second timeout and retry.
- Widget links are document/new-window navigations, not Next Links. `GuestMarketData` and public `MarketOverview` send them through `public/stock-loading.html?symbol={tvsymbol}`. This static, no-user-data skeleton paints before `location.replace()` to the validated stock path. Keep this destination internal, keep validation consistent with `parseSymbols`, use `textContent`, and retain recovery/back links. Never cache actual stock documents to make this faster.
- Native stock-route loading is a synchronous client component reading `AppAccessProvider`, not an async fallback waiting for headers/session.

### Authentication and Writes

- `AppAccessProvider` exposes nullable `user` and a sign-in dialog; `SearchProvider` chooses the appropriate guest/member dialog without another session query per button.
- `lib/auth-navigation.ts` allowlists `returnTo`: `/`, `/watchlist`, `/news`, `/stocks/<valid-symbol>`. Reject external URLs, queries/actions, traversal and malformed paths. Propagate it through login/signup/OTP/recovery.
- `AuthPage` performs signed-in redirects at page level so layouts cannot overwrite the validated destination.
- Guest follow opens sign-in, then returns to the stock page. Following requires an explicit second user confirmation; never execute pending writes from a URL.
- `lib/actions/watchlist.actions.ts`: real session checks, shared symbol validation, bounded company names, atomic/idempotent upsert with unique `(userId, symbol)` index, user-scoped delete/read. Writes revalidate Today, watchlist, and the affected stock route.
- `WatchlistButton` handles optimistic updates and rollback. Expired sessions return `AUTH_REQUIRED`; rollback before opening sign-in. Do not write without auth or add redundant `router.refresh()` after revalidation.
- `lib/better-auth/auth.ts`: email/password with required email verification; single-use six-digit hashed OTPs, five-minute expiry, three incorrect attempts; reset revokes existing sessions. Recovery responses must not reveal account existence. Email work uses Next.js `after`.
- Auth API rate limits are database-backed; the legacy verification resend action also uses `database/models/rateLimit.model.ts`. Do not confuse these two mechanisms.
- Provider helpers, news storage and background-user helpers are `server-only`. Do not turn internal exports into browser-callable `"use server"` actions without authorization. Signup queues news from Better Auth's returned user ID, never an ID supplied by the browser.

## Data and Performance

- `lib/quotes.ts`: nullable `StockQuote` domain values, `parseSymbols` (1-20, trim/normalize/deduplicate, max15 characters), stale merging, refresh eligibility, bounded loader.
- `lib/quotes-server.ts` and `lib/quote-handler.ts`: upstream quotes through an authenticated handler; 60-second per-process cache, shared in-flight requests, concurrency four, rate-limit backoff. These limits are per process, not globally shared across Vercel instances.
- `hooks/useQuotes.ts`: poll only visible displayed symbols, online and visible, every60 seconds. Manual refresh uses the same path. Preserve old values as stale on failure, never replace missing prices with zero or claim guaranteed real-time data.
- `lib/company-logos.ts` and `hooks/useCompanyLogos.ts`: separate authenticated logo lookup, approved HTTPS Finnhub CDN URLs, up to20 symbols, batches of four, existing one-hour profile cache. Missing logos use the company icon, not a ticker monogram or fabricated brand.
- `lib/actions/finnhub.actions.ts`: authenticated search, one US search query in parallel with watchlist status, bounded/validated results. `MemberSearchDialog` debounces150ms and ignores superseded requests. Do not restore per-result quote/profile/TradingView checks.
- `lib/finnhub/data.ts`: server-only provider/profile/news/legacy detail helpers, eight-second external request timeout. `getStocksDetails`, `getWatchlistWithData`, and `WatchlistTable` are older paths; check callers before editing or reusing them instead of the newer `StockList`/batch path.
- Member stock header/profile is independent of `ResolvedChart` Suspense. `lib/tradingview/symbol-search.ts` resolves TradingView names only for members. Resolver failure must not remove the rest of the stock page.
- `StockChart` owns one460px candle/line chart and mounts company/financial/technical widgets only on tab activation. Symbol Info starts at170px wide/280px phone and follows provider iframe height without clipping. `TradeingViewWidget` (existing spelling) and `useTradingViewWidget` own script lifecycle, timeout/retry and attribution.
- Market overview mounts near visibility through `IntersectionObserver`; search/install dialogs load dynamically. Keep main-menu automatic prefetch, no private prefetch for guests, and stock intent prefetch on hover/focus/touch. Prefetch/server rendering must never enqueue news.

## News Pipeline and Storage

- `lib/news-policy.ts`: latest expected edition is19:00 Asia/Bangkok (12:00UTC); stale means absent/older than that edition, not simply no document.
- `DailyNewsSummary` (`daily-news-summary`) dispatches `app/news.summary.requested` per user/language; it reports queued/dispatched editions, not saved news. Production cron is `TZ=Asia/Bangkok 0 19 * * *`; event trigger is `app/news.daily.fetched`.
- `GenerateNewsSummary` (`generate-news-summary`) validates user/locale/date, skips current editions, fetches up to six source articles, generates and persists each edition independently. Singleton key is user+locale+edition date. `saved` is valid only after successful persistence. Do not swallow DB/provider failures as a successful run.
- `lib/inngest/gemini.ts` defines `NEWS_MODEL` (currently `gemini-3.1-flash-lite`). Direct server fetch runs inside durable steps, with API key in a header and60-second timeout. News max output6144; welcome max1024.
- Workers and welcome generation share one account-scoped AI slot, throttle four/minute per function and retry three times. Transient429/5xx/network errors back off >=60 seconds and honor provider delays. Explicit daily/zero quota is non-retriable. Only complete `STOP` responses may save; empty/blocked/truncated output must not overwrite history. Do not promise a model eliminates quota errors.
- `lib/actions/saveusernews.action.ts` uses a native Mongo collection. Upsert by user+locale+date preserves previous editions; sanitize HTML on write/read. Old English documents without `locale` remain valid. No migration/backfill is required.
- `getDigestState(locale, "preview" | "full")` reads one plain-text excerpt or five full sanitized summaries. TH may use labeled EN fallback if no TH exists. DB failure is an error, not missing news.
- `queueDigest` authenticates the user and deduplicates catch-up by user/locale/expected edition/15-minute bucket. `DigestPanel` starts it after mounting, retains saved dated news, polls15 seconds for up to two minutes while online/visible, then offers manual recheck.
- `lib/inngest/environment.ts` isolates Preview news into `news_summaries_preview_<12-char branch hash>`; Production uses `news_summaries`. Preview disables cron/welcome mail and requires a specific user. Auth/watchlist still use the configured shared database: this is not full staging isolation.
- Keep Production and Preview Inngest event/signing keys in their respective existing environments. Production must sync `main`; Preview uses `VERCEL_GIT_COMMIT_REF`. Never set a shared production Inngest override on Preview. Do not trigger all-user jobs, resend mail, or mutate news during QA without appropriate scope.

## Language, Mobile and PWA

- `lib/i18n.ts`, `lib/daily-copy.ts`, `lib/guest-copy.ts`: typed EN/TH dictionaries. `stockmarket-locale=en|th` is the source of truth; absent/invalid defaults to EN. `lib/i18n-server.ts` reads it server-side.
- `LanguageProvider` updates cookie/html lang/data-locale then refreshes within a transition. `LanguageSurface` masks existing content in place so scroll/widget dimensions survive. Do not replace a long page with a one-screen spinner/skeleton.
- Keep actual company names/symbols/provider data unchanged. Do not translate stored historical AI HTML in the UI. Thai uses IBM Plex Sans Thai400/500/600/700; English uses Geist.
- Touch targets >=44px, safe-area padding, tabular numbers, signs as well as green/red, readable dark gray/yellow palette. Check360/390/402/768px and desktop; do not crop responsive provider content to hide overflow.
- `app/manifest.ts` and `app/layout.tsx` define standalone installation, icons and iPhone17 startup images. Scripts under `scripts/` regenerate brand icons/startup PNGs; inspect resulting assets visually.
- `PwaProvider` registers `/sw.js` only in secure production builds and lazy-loads install guidance. iPhone uses Share > Add to Home Screen; hide install controls in standalone.
- `public/sw.js` has an explicit allowlist: offline HTML, public stock-loading HTML, brand logo/icons/startup images only. Stock-loading query variants reuse identical static HTML. Never cache authenticated HTML, stock pages, API responses, RSC, quotes or news. Bump cache version when cached static assets change; delete only obsolete `stockmarket-shell-*` caches.
- `public/offline.html` provides bilingual reconnect/retry. Installed app behavior, iOS target-window handling and startup images require a physical-device test; browser emulation is not equivalent.

## Environment and Release

Use `.env.example` for names, never real values. Required services use `MONGODB_URI`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `TRUSTED_ORIGINS`, `FINNHUB_API_KEY`, `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`, `GEMINI_API_KEY`, `NODEMAILER_EMAIL`, `NODEMAILER_PASSWORD`. No provider secret belongs in `NEXT_PUBLIC_*`, URLs shown to users, logs or tracked files.

Preview auth uses the exact `https://${VERCEL_URL}` origin; Production uses the configured Better Auth URL/trusted origins. Do not broaden trusted origins to arbitrary previews. The linked Vercel project is StockMarket; the public production URL is `https://stockmarket-fdev.vercel.app`. Inspect the deployment commit/environment before QA.

Use `codex/` feature branches by default. Obtain an authorized share URL for protected previews; do not commit bypass links/tokens. Run checks, inspect Preview with actual widget links and slow/offline navigation, then follow the user's current merge/deploy instruction. Never label emulated tests as physical iPhone acceptance.

`next.config.ts` supports `NEXT_DIST_DIR` and disables persisted Turbopack build cache after stale CSS was observed; do not casually restore it. Service-worker headers intentionally disable its HTTP caching. Keep lockfile changes intentional; do not run `npm audit fix --force` as a generic fix.

Finnhub publication rights are unresolved for member redistribution. Login does not grant a data license. Do not expose Finnhub to guests or accept broader public distribution without confirming the appropriate rights. No Redis, region/database migration, portfolios, trading or price alerts are currently included.
