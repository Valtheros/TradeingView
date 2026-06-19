# StockMarket

StockMarket is a Next.js stock dashboard for tracking market movement, searching reliable stock symbols, saving a personal watchlist, and reading AI-generated market news summaries.

![StockMarket dashboard preview](public/assets/images/dashboard-preview.png)

## What It Does

- Shows a real-time market dashboard with TradingView widgets, including market overview, heatmap, top stories, and market quotes.
- Lets signed-in users search stocks through Finnhub and validates symbols against TradingView before showing them.
- Provides stock detail pages with TradingView charts, symbol info, technical analysis, company profile, and financial widgets.
- Saves a per-user watchlist in MongoDB and enriches watchlist rows with latest quote, market cap, P/E ratio, and price change data.
- Generates personalized daily market news summaries from each user's watchlist using Inngest and Gemini.
- Supports email/password authentication with OTP email verification through Better Auth and Nodemailer.
- Sanitizes AI-generated news HTML before displaying it in the app.

## Tech Stack

- Next.js 15 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- shadcn/ui and Radix UI primitives
- MongoDB, Mongoose, and Better Auth
- Finnhub API for stock search, quotes, profiles, metrics, and news
- TradingView embedded widgets for charts and market data
- Inngest for background jobs and scheduled news summaries
- Gemini for AI-generated welcome emails and news summaries
- Nodemailer for OTP and welcome emails

## Main Pages

| Route | Description |
| --- | --- |
| `/` | Market dashboard powered by TradingView widgets. |
| `/watchlist` | Authenticated watchlist with stock search and enriched market data. |
| `/stocks/[symbol]` | Stock detail page with charts, technical analysis, profile, and financials. |
| `/news` | Latest AI-generated daily digest for the signed-in user. |
| `/sign-in` | Sign in with email and password. |
| `/sign-up` | Create an account and provide investing preferences. |
| `/verify-email` | Verify account access with an email OTP. |

## Project Structure

```text
app/                     Next.js routes, layouts, and API handlers
components/              Reusable UI, forms, TradingView widgets, and watchlist components
database/                MongoDB connection and Mongoose models
hooks/                   Client-side React hooks
lib/actions/             Server actions for auth, Finnhub, watchlist, users, and news
lib/better-auth/         Better Auth server and client setup
lib/finnhub/             Finnhub environment helpers
lib/inngest/             Inngest client, functions, and AI prompts
lib/nodemailer/          Email transport and templates
lib/tradingview/         TradingView symbol search and matching utilities
public/assets/           App images and icons
tests/                   Node test files
types/                   Global TypeScript declarations
```

## Environment Variables

Create a `.env` file from `.env.example` and fill in the required values.

```bash
cp .env.example .env
```

| Variable | Purpose |
| --- | --- |
| `MONGODB_URI` | MongoDB connection string used by Better Auth, watchlists, rate limits, and news summaries. |
| `BETTER_AUTH_SECRET` | Secret used by Better Auth. |
| `BETTER_AUTH_URL` | Base URL for auth callbacks, usually `http://localhost:3000` locally. |
| `TRUSTED_ORIGINS` | Comma-separated list of allowed origins for Better Auth. |
| `FINNHUB_API_KEY` | Server-side Finnhub API key for stock data and market news. |
| `INNGEST_EVENT_KEY` | Inngest event key. |
| `INNGEST_SIGNING_KEY` | Inngest signing key for verifying requests. |
| `GEMINI_API_KEY` | Gemini API key used by Inngest AI steps. |
| `NODEMAILER_EMAIL` | Email address used to send OTP and welcome emails. |
| `NODEMAILER_PASSWORD` | Password or app password for the Nodemailer account. |

Keep `FINNHUB_API_KEY`, `GEMINI_API_KEY`, and email credentials server-side only.

## Getting Started

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

For local background job testing, run the app and connect Inngest according to your Inngest account setup. The app exposes the Inngest route at:

```text
/api/inngest
```

## Available Scripts

```bash
npm run dev      # Start the Next.js development server with Turbopack
npm run build    # Build the production app with Turbopack
npm run start    # Start the production server
npm run lint     # Run ESLint
npm test         # Run Node tests
```

You can also run TypeScript checking manually:

```bash
npx tsc --noEmit
```

## Data Flow

1. A user signs up, verifies their email with OTP, and stores investing preferences.
2. The user searches for stocks. Results come from Finnhub and are checked against TradingView symbol resolution before display.
3. The user adds symbols to a MongoDB-backed watchlist.
4. Watchlist pages fetch fresh quote, profile, and financial metric data from Finnhub.
5. Inngest runs the daily news summary job, fetches news for each user's watchlist symbols, asks Gemini to summarize it, and saves the sanitized result for `/news`.

## Testing Notes

The current test suite focuses on TradingView symbol matching and Finnhub environment key selection:

```bash
npm test
```

These tests help prevent unrelated TradingView search results from being accepted as valid stock symbols.

## Security Notes

- Do not expose private API keys through `NEXT_PUBLIC_` variables.
- AI-generated news HTML is sanitized before rendering.
- Watchlist entries are unique per user and stored with a compound MongoDB index.
- OTP requests use a MongoDB-backed rate limit model.
