import { supabase } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabase
    .from("stocks")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ stocks: data ?? [] });
}

export async function POST(request: Request) {
  const body = await request.json();

  const ticker = String(body.ticker ?? "").trim().toUpperCase();
  const companyName = String(body.company_name ?? "").trim();
  const thesisNow = String(body.thesis_now ?? body.thesis ?? "").trim();
  const rawSentiment = String(body.sentiment_status ?? "").trim().toLowerCase();
  const sentimentStatus =
    rawSentiment === "bullish" || rawSentiment === "neutral" || rawSentiment === "bearish"
      ? rawSentiment
      : "neutral";
  const buyInPriceRaw = Number(body.buy_in_price);
  const buyInPrice =
    Number.isFinite(buyInPriceRaw) && buyInPriceRaw > 0 ? buyInPriceRaw : null;

  if (!ticker) {
    return Response.json({ error: "Ticker is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("stocks")
    .insert({
      ticker,
      company_name: companyName || null,
      buy_in_price: buyInPrice,
      sentiment_status: sentimentStatus,
      thesis_now: thesisNow || null,
    })
    .select()
    .single();

  if (error) {
    const isDuplicate = error.message.toLowerCase().includes("duplicate");
    return Response.json(
      {
        error: isDuplicate
          ? `${ticker} is already in your watchlist.`
          : error.message,
      },
      { status: 500 }
    );
  }

  return Response.json({ stock: data }, { status: 201 });
}

export async function PATCH(request: Request) {
  const body = await request.json();
  const id = String(body.id ?? "").trim();

  if (!id) {
    return Response.json({ error: "Stock id is required" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};

  if (typeof body.company_name !== "undefined") {
    const companyName = String(body.company_name ?? "").trim();
    updates.company_name = companyName || null;
  }

  if (typeof body.thesis_now !== "undefined" || typeof body.thesis !== "undefined") {
    const thesisNow = String(body.thesis_now ?? body.thesis ?? "").trim();
    updates.thesis_now = thesisNow || null;
  }

  if (typeof body.sentiment_status !== "undefined") {
    const rawSentiment = String(body.sentiment_status ?? "").trim().toLowerCase();
    const sentimentStatus =
      rawSentiment === "bullish" || rawSentiment === "neutral" || rawSentiment === "bearish"
        ? rawSentiment
        : "neutral";
    updates.sentiment_status = sentimentStatus;
  }

  if (typeof body.buy_in_price !== "undefined") {
    const buyInPrice = Number(body.buy_in_price);
    updates.buy_in_price = Number.isFinite(buyInPrice) && buyInPrice > 0 ? buyInPrice : null;
  }

  if (Object.keys(updates).length === 0) {
    return Response.json({ error: "No updatable fields provided" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("stocks")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ stock: data });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const ticker = searchParams.get("ticker")?.trim().toUpperCase();

  if (!id && !ticker) {
    return Response.json(
      { error: "Stock id or ticker is required" },
      { status: 400 }
    );
  }

  const query = supabase.from("stocks").delete();

  const { error } = id
    ? await query.eq("id", id)
    : await query.eq("ticker", ticker);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}