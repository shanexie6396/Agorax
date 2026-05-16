# Agorax

Agora + X: a place to talk with AI about markets and your X factor (you).

This version connects:

- Supabase for saving your watchlist
- Finnhub for real stock quote data
- Finnhub symbol search for company/ticker lookup

## 1. Install

```bash
npm install
```

## 2. Create `.env.local`

Copy `.env.local.example` to `.env.local`:

```bash
cp .env.local.example .env.local
```

Then fill in:

```txt
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
FINNHUB_API_KEY=...
TAVILY_API_KEY=...
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-4o-mini
```

## 3. Create Supabase tables

Open Supabase Dashboard → SQL Editor → New query.

Paste the SQL from:

```txt
supabase/schema.sql
```

Run it.

## 4. Start

```bash
npm run dev
```

Open:

```txt
http://localhost:3000
```

## Notes

- Your watchlist is saved in Supabase.
- Prices are fetched from Finnhub through `/api/quote`, so your Finnhub key stays server-side.
- This is still single-user. No login yet.


## v4 Search

On the Watchlist page, you can now search by:

- company name, e.g. `apple`
- partial ticker, e.g. `app`
- exact ticker, e.g. `AAPL`

Search is routed through:

```txt
/api/search-symbols?q=apple
```

So your Finnhub key stays on the server.

## v5 News + AI assistant

- News/search endpoint:
  - `GET /api/news?q=nvda+ai+datacenter&max=8`
  - Uses Tavily to return recent web sources with title, link, snippet, and content when available.
- AI assistant endpoint:
  - `POST /api/investment-assistant`
  - Body example:
    ```json
    {
      "ticker": "NVDA",
      "prompt": "What changed recently and what should I pressure-test before investing?"
    }
    ```
  - Combines:
    - live finance quote context (Finnhub),
    - recent web news context (Tavily),
    - saved thesis/notes and watchlist context (Supabase),
    - then calls OpenAI to produce:
      - market/news summary
      - bull case
      - bear case
      - what changed recently
      - key risks
      - questions before investing
      - final investment-thinking summary (non-advice framing)

You can test this in the `Stocks` page under **AI investment assistant**.

## v6 Home "Generate Market Reflection" (cached)

- Endpoint: `POST /api/market-reflection`
  - Flow:
    1. loads watchlist + thesis notes from Supabase
    2. fetches fresh quote and recent trading-day candles from Finnhub for each ticker
    3. computes last 3 trading-day daily % moves and total 3-business-day % change
    4. fetches recent ticker news from Tavily
    5. sends combined context to OpenAI for reasoning only
- Cache endpoint: `GET /api/market-reflection`
  - Returns same-day cached reflection if already generated.
- Force regenerate:
  - `POST /api/market-reflection` with `{ "force": true }` bypasses same-day cache and regenerates.
- Cache storage:
  - table: `market_reflections`
  - key: `(user_id, date_key)`
  - current single-user default `user_id` is `local-single-user`.

Important behavior: the assistant does not rely on OpenAI memory for market facts. It sends fresh finance/news context first, then asks OpenAI to analyze that provided data.

### Cache management from UI

- Market page now supports:
  - **Delete today cache** (remove only current date result)
  - **Delete all history** (remove all saved reflections)
  - **Past AI daily reports** section (history list)
