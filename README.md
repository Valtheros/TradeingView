# StockMarket

A Next.js dashboard for market widgets, stock search, authenticated watchlists, and AI-generated news summaries.

## Stack

- Next.js 15, React 19, TypeScript, Tailwind CSS
- Better Auth with MongoDB
- Finnhub for stock search, quotes, profiles, and market news
- TradingView embedded widgets for charts and symbol data
- Inngest + Gemini for personalized emails and news summaries
- Nodemailer for OTP and welcome emails

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env` from `.env.example` and fill in the required keys.

3. Run the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

```bash
npm run lint
npx tsc --noEmit
npm test
npm run build
```

## Notes

- Use `FINNHUB_API_KEY` only on the server. Do not expose it as a `NEXT_PUBLIC_` variable.
- Search results are filtered through TradingView symbol resolution before being shown.
- AI-generated news summary HTML is sanitized before display.
