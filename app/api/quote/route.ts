import { fetchFinnhubQuote } from "@/lib/finnhub";
import { supabase } from "@/lib/supabase";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get("ticker")?.trim().toUpperCase();

  if (!ticker) {
    return Response.json({ error: "Ticker is required" }, { status: 400 });
  }

  try {
    const raw = await fetchFinnhubQuote(ticker);

    const quote = {
      ticker,
      currentPrice: raw.c,
      changeAmount: raw.d,
      changePercent: raw.dp,
      openPrice: raw.o,
      highPrice: raw.h,
      lowPrice: raw.l,
      previousClose: raw.pc,
      fetchedAt: new Date((raw.t || Math.floor(Date.now() / 1000)) * 1000).toISOString(),
    };

    // Best-effort save price snapshot if stock exists.
    const { data: stock } = await supabase
      .from("stocks")
      .select("id")
      .eq("ticker", ticker)
      .maybeSingle();

    if (stock?.id) {
      await supabase.from("price_snapshots").insert({
        stock_id: stock.id,
        ticker,
        current_price: quote.currentPrice,
        change_amount: quote.changeAmount,
        change_percent: quote.changePercent,
        open_price: quote.openPrice,
        high_price: quote.highPrice,
        low_price: quote.lowPrice,
        previous_close: quote.previousClose,
      });
    }

    return Response.json({ quote });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to fetch quote" },
      { status: 500 }
    );
  }
}
