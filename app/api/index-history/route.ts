type IndexPoint = {
  date: string;
  close: number;
};

type YahooChartResponse = {
  chart?: {
    result?: Array<{
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          close?: Array<number | null>;
        }>;
      };
    }>;
  };
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = (searchParams.get("symbol") ?? "^GSPC").trim();
  const label = (searchParams.get("label") ?? symbol).trim();
  const daysParam = Number(searchParams.get("days"));
  const days = Number.isFinite(daysParam) && daysParam >= 7 ? Math.floor(daysParam) : 365;

  if (!symbol) {
    return Response.json({ error: "symbol is required" }, { status: 400 });
  }

  const now = new Date();
  const endTimestamp = Math.floor(now.getTime() / 1000);
  const startTimestamp = endTimestamp - days * 24 * 60 * 60;
  const interval = days <= 60 ? "1h" : "1d";

  try {
    const url = new URL(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`
    );
    url.searchParams.set("period1", String(startTimestamp));
    url.searchParams.set("period2", String(endTimestamp));
    url.searchParams.set("interval", interval);
    url.searchParams.set("events", "history");

    const response = await fetch(url.toString(), { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Failed to fetch ${label} data: ${response.status}`);
    }

    const payload = (await response.json()) as YahooChartResponse;
    const result = payload.chart?.result?.[0];
    const timestamps = result?.timestamp ?? [];
    const closes = result?.indicators?.quote?.[0]?.close ?? [];

    const points: IndexPoint[] = timestamps
      .map((timestamp, idx) => {
        const close = closes[idx];
        if (close === null || close === undefined || Number.isNaN(close)) return null;
        return {
          date: new Date(timestamp * 1000).toISOString().slice(0, 10),
          close,
        };
      })
      .filter((point): point is IndexPoint => point !== null);

    if (points.length === 0) {
      throw new Error(`No ${label} data available for selected range`);
    }

    return Response.json({
      symbol,
      label,
      points,
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : `Failed to load ${label} history`,
      },
      { status: 500 }
    );
  }
}
