export type FinnhubQuote = {
  c: number;  // current price
  d: number;  // change
  dp: number; // percent change
  h: number;  // high
  l: number;  // low
  o: number;  // open
  pc: number; // previous close
  t: number;  // timestamp
};

export type FinnhubSymbolResult = {
  description: string;
  displaySymbol: string;
  symbol: string;
  type: string;
};

export type FinnhubCandleResponse = {
  c: number[]; // close
  t: number[]; // unix timestamps
  s: string; // status
};

export type TradingDayPoint = {
  date: string;
  close: number;
};

type FinnhubSearchResponse = {
  count: number;
  result: FinnhubSymbolResult[];
};

function getFinnhubApiKey() {
  const apiKey = process.env.FINNHUB_API_KEY;

  if (!apiKey) {
    throw new Error("Missing FINNHUB_API_KEY in .env.local");
  }

  return apiKey;
}

export async function fetchFinnhubQuote(ticker: string): Promise<FinnhubQuote> {
  const apiKey = getFinnhubApiKey();

  const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(
    ticker
  )}&token=${apiKey}`;

  const res = await fetch(url, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Finnhub request failed: ${res.status}`);
  }

  const data = (await res.json()) as FinnhubQuote;

  if (!data || data.c === 0) {
    throw new Error(`No quote returned for ${ticker}`);
  }

  return data;
}

export async function searchFinnhubSymbols(query: string): Promise<FinnhubSymbolResult[]> {
  const apiKey = getFinnhubApiKey();

  const url = `https://finnhub.io/api/v1/search?q=${encodeURIComponent(
    query
  )}&token=${apiKey}`;

  const res = await fetch(url, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Finnhub search failed: ${res.status}`);
  }

  const data = (await res.json()) as FinnhubSearchResponse;

  return (data.result ?? [])
    .filter((item) => item.symbol && item.description)
    .slice(0, 8);
}

export async function fetchFinnhubRecentTradingDays(
  ticker: string,
  tradingDays = 4
): Promise<TradingDayPoint[]> {
  const apiKey = getFinnhubApiKey();

  const nowSec = Math.floor(Date.now() / 1000);
  const fromSec = nowSec - 60 * 60 * 24 * 21;
  const url = `https://finnhub.io/api/v1/stock/candle?symbol=${encodeURIComponent(
    ticker
  )}&resolution=D&from=${fromSec}&to=${nowSec}&token=${apiKey}`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Finnhub candle request failed: ${res.status}`);
  }

  const data = (await res.json()) as FinnhubCandleResponse;
  if (!data || data.s !== "ok" || !Array.isArray(data.c) || !Array.isArray(data.t)) {
    throw new Error(`No candle data returned for ${ticker}`);
  }

  const points = data.t
    .map((ts, idx) => ({
      date: new Date(ts * 1000).toISOString().slice(0, 10),
      close: Number(data.c[idx]),
    }))
    .filter((point) => Number.isFinite(point.close) && point.close > 0);

  return points.slice(-tradingDays);
}
