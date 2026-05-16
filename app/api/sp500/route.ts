type Sp500Point = {
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
    error?: { description?: string } | null;
  };
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const daysParam = Number(searchParams.get("days"));
  const days = Number.isFinite(daysParam) && daysParam > 30 ? Math.floor(daysParam) : 365;

  const now = new Date();
  const endTimestamp = Math.floor(now.getTime() / 1000);
  const startTimestamp = endTimestamp - days * 24 * 60 * 60;

  try {
    const url = new URL("https://query1.finance.yahoo.com/v8/finance/chart/%5EGSPC");
    url.searchParams.set("period1", String(startTimestamp));
    url.searchParams.set("period2", String(endTimestamp));
    url.searchParams.set("interval", "1d");
    url.searchParams.set("events", "history");

    const response = await fetch(url.toString(), {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch S&P 500 data: ${response.status}`);
    }

    const payload = (await response.json()) as YahooChartResponse;
    const result = payload.chart?.result?.[0];
    const timestamps = result?.timestamp ?? [];
    const closes = result?.indicators?.quote?.[0]?.close ?? [];

    const points: Sp500Point[] = timestamps
      .map((timestamp, idx) => {
        const close = closes[idx];
        if (close === null || close === undefined || Number.isNaN(close)) return null;
        return {
          date: new Date(timestamp * 1000).toISOString().slice(0, 10),
          close,
        };
      })
      .filter((point): point is Sp500Point => point !== null);

    if (points.length === 0) {
      throw new Error("No S&P 500 data available for selected range");
    }

    return Response.json({
      symbol: "^GSPC",
      startDate: new Date(startTimestamp * 1000).toISOString(),
      endDate: new Date(endTimestamp * 1000).toISOString(),
      points,
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load S&P 500 history",
      },
      { status: 500 }
    );
  }
}
