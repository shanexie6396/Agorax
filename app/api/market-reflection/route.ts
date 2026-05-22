import { fetchFinnhubQuote, fetchFinnhubRecentTradingDays } from "@/lib/finnhub";
import { generateInvestmentThinking, translateReflection } from "@/lib/openai";
import { supabase } from "@/lib/supabase";
import { searchRecentNews } from "@/lib/tavily";

const DEFAULT_USER_ID = "local-single-user";

function todayDateKey() {
  return new Date().toISOString().slice(0, 10);
}

function pctChange(from: number, to: number) {
  if (!Number.isFinite(from) || from === 0 || !Number.isFinite(to)) return null;
  return ((to - from) / from) * 100;
}

function isCacheTableMissing(message: string) {
  const text = message.toLowerCase();
  return (
    text.includes("could not find the table") ||
    text.includes("schema cache") ||
    (text.includes("relation") &&
      text.includes("market_reflections") &&
      text.includes("does not exist"))
  );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("user_id")?.trim() || DEFAULT_USER_ID;
  const date = searchParams.get("date")?.trim() || todayDateKey();
  const wantHistory = searchParams.get("history") === "1";

  if (wantHistory) {
    const { data, error } = await supabase
      .from("market_reflections")
      .select("id,date_key,generated_at,reflection")
      .eq("user_id", userId)
      .order("date_key", { ascending: false })
      .order("generated_at", { ascending: false })
      .limit(60);

    if (error) {
      if (isCacheTableMissing(error.message)) {
        return Response.json({
          cacheAvailable: false,
          history: [],
        });
      }
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({
      cacheAvailable: true,
      history: (data ?? []).map((item) => ({
        id: item.id,
        dateKey: item.date_key,
        generatedAt: item.generated_at,
        reflection: item.reflection,
      })),
    });
  }

  const { data, error } = await supabase
    .from("market_reflections")
    .select("*")
    .eq("user_id", userId)
    .eq("date_key", date)
    .maybeSingle();

  if (error) {
    if (isCacheTableMissing(error.message)) {
      return Response.json({
        cached: false,
        reflection: null,
        generatedAt: null,
        cacheAvailable: false,
      });
    }
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({
    cached: Boolean(data),
    reflection: data?.reflection ?? null,
    generatedAt: data?.generated_at ?? null,
    cacheAvailable: true,
  });
}

export async function POST(request: Request) {
  let body: { user_id?: string; force?: boolean; translation_mode?: "en" | "both" } = {};
  try {
    body = (await request.json()) as {
      user_id?: string;
      force?: boolean;
      translation_mode?: "en" | "both";
    };
  } catch {
    // no-op
  }

  const userId = String(body.user_id ?? "").trim() || DEFAULT_USER_ID;
  const forceRegenerate = Boolean(body.force);
  const translationMode = body.translation_mode === "both" ? "both" : "en";
  const dateKey = todayDateKey();

  const { data: existing, error: existingError } = await supabase
    .from("market_reflections")
    .select("*")
    .eq("user_id", userId)
    .eq("date_key", dateKey)
    .maybeSingle();

  let cacheAvailable = true;
  if (existingError && isCacheTableMissing(existingError.message)) {
    cacheAvailable = false;
  } else if (existingError) {
    return Response.json({ error: existingError.message }, { status: 500 });
  }

  if (cacheAvailable && !forceRegenerate && existing?.reflection) {
    return Response.json({
      cached: true,
      reflection: existing.reflection,
      generatedAt: existing.generated_at,
      cacheAvailable,
    });
  }

  const { data: stocks, error: stocksError } = await supabase
    .from("stocks")
    .select("ticker,company_name,buy_in_price,sentiment_status,thesis_now")
    .order("created_at", { ascending: false });

  if (stocksError) {
    return Response.json({ error: stocksError.message }, { status: 500 });
  }

  const watchlist = stocks ?? [];
  if (watchlist.length === 0) {
    return Response.json(
      { error: "No stocks in watchlist yet. Add at least one stock first." },
      { status: 400 }
    );
  }

  const stockContexts = await Promise.all(
    watchlist.map(async (stock) => {
      const ticker = String(stock.ticker ?? "").toUpperCase();
      const [quote, tradingDays, news] = await Promise.all([
        fetchFinnhubQuote(ticker).catch(() => null),
        fetchFinnhubRecentTradingDays(ticker, 4).catch(() => []),
        searchRecentNews(
          `${ticker} ${stock.company_name ?? ""} stock market news earnings guidance macro rates inflation`,
          5
        ).catch(() => []),
      ]);

      const lastThree = tradingDays.slice(-3);
      const withDailyChange = lastThree.map((point, idx) => {
        const prev = tradingDays[tradingDays.length - (lastThree.length - idx + 1)];
        return {
          date: point.date,
          close: point.close,
          dailyPercentChange: prev ? pctChange(prev.close, point.close) : null,
        };
      });

      const total3BusinessDayPercentChange =
        tradingDays.length >= 4
          ? pctChange(tradingDays[tradingDays.length - 4].close, tradingDays[tradingDays.length - 1].close)
          : null;

      return {
        ticker,
        companyName: stock.company_name ?? null,
        quote: quote
          ? {
              currentPrice: quote.c,
              dailyPercentChange: quote.dp,
              changeAmount: quote.d,
              previousClose: quote.pc,
            }
          : null,
        recentTradingDays: withDailyChange,
        total3BusinessDayPercentChange,
        thesisNotes: {
          thesisNow: stock.thesis_now ?? null,
          buyInPrice: stock.buy_in_price ?? null,
          sentimentStatus: stock.sentiment_status ?? null,
        },
        recentNews: news,
      };
    })
  );

  try {
    const ai = await generateInvestmentThinking({
      userPrompt:
        "Generate a concise market reflection for my watchlist. For each company, explicitly reference my thesis_now and sentiment_status, explain what changed in price, and infer likely drivers from the provided recent news + market context. Add a dedicated thesis_check_rows table-ready output with one row per ticker and fields: ticker, stance (HOLD/REFINE/RECONSIDER where HOLD means hold your current thesis stance, not a buy/sell/hold trading instruction), price_move_summary, possible_reasons, thesis_implication, suggested_action. In narrative fields, format company-level points as one company per line (e.g., 'AAPL: ...'). Include key risks and key questions. This is investment thinking, not financial advice.",
      financeContext: stockContexts.map((item) => ({
        ticker: item.ticker,
        companyName: item.companyName,
        thesisNotes: item.thesisNotes,
        quote: item.quote,
        recentTradingDays: item.recentTradingDays,
        total3BusinessDayPercentChange: item.total3BusinessDayPercentChange,
      })),
      newsContext: stockContexts.map((item) => ({
        ticker: item.ticker,
        articles: item.recentNews,
      })),
      watchlistContext: {
        userId,
        dateKey,
        watchlistCount: stockContexts.length,
        stocks: stockContexts.map((item) => ({
          ticker: item.ticker,
          companyName: item.companyName,
          thesisNotes: item.thesisNotes,
        })),
      },
    });

    const reflection: Record<string, unknown> = {
      generatedForDate: dateKey,
      watchlistCount: stockContexts.length,
      stocks: stockContexts,
      analysis: {
        marketNewsSummary: ai.market_news_summary ?? "",
        thesisCheck: ai.thesis_check ?? "",
        thesisCheckRows: Array.isArray(ai.thesis_check_rows)
          ? ai.thesis_check_rows.map((row) => ({
              ticker: String(row?.ticker ?? "").trim(),
              stance: String(row?.stance ?? "").trim() || "REFINE",
              priceMoveSummary: String(row?.price_move_summary ?? "").trim(),
              possibleReasons: String(row?.possible_reasons ?? "").trim(),
              thesisImplication: String(row?.thesis_implication ?? "").trim(),
              suggestedAction: String(row?.suggested_action ?? "").trim(),
            }))
          : [],
        bullCase: ai.bull_case ?? [],
        bearCase: ai.bear_case ?? [],
        whatChangedRecently: ai.what_changed_recently ?? [],
        confidenceNotes: ai.confidence_notes ?? "",
      },
    };

    let translationWarning = "";
    if (translationMode === "both") {
      try {
        const translatedChunk = await translateReflection({
          reflection: { analysis: reflection.analysis },
          targetLanguage: "zh-CN",
        });
        const translatedAnalysis =
          translatedChunk && typeof translatedChunk === "object"
            ? (translatedChunk as { analysis?: unknown }).analysis
            : null;
        if (translatedAnalysis && typeof translatedAnalysis === "object") {
          reflection.analysisTranslations = {
            zhCN: translatedAnalysis,
          };
        } else {
          translationWarning = "Chinese translation failed validation; English report saved only.";
        }
      } catch {
        translationWarning = "Chinese translation failed; English report saved only.";
      }
    }

    const upsertPayload = {
      user_id: userId,
      date_key: dateKey,
      reflection,
      generated_at: new Date().toISOString(),
    };

    if (cacheAvailable) {
      const { error: upsertError } = await supabase
        .from("market_reflections")
        .upsert(upsertPayload, { onConflict: "user_id,date_key" });

      if (upsertError && isCacheTableMissing(upsertError.message)) {
        cacheAvailable = false;
      } else if (upsertError) {
        return Response.json({ error: upsertError.message }, { status: 500 });
      }
    }

    return Response.json({
      cached: false,
      reflection,
      generatedAt: upsertPayload.generated_at,
      cacheAvailable,
      translationMode,
      translationWarning,
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate market reflection",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  let body: { user_id?: string; mode?: "today" | "all"; date?: string } = {};
  try {
    body = (await request.json()) as {
      user_id?: string;
      mode?: "today" | "all";
      date?: string;
    };
  } catch {
    // no-op
  }

  const userId = String(body.user_id ?? "").trim() || DEFAULT_USER_ID;
  const mode = body.mode ?? "today";
  const dateKey = String(body.date ?? "").trim() || todayDateKey();

  const query = supabase.from("market_reflections").delete({ count: "exact" }).eq("user_id", userId);
  const { error, count } =
    mode === "all" ? await query : await query.eq("date_key", dateKey);

  if (error) {
    if (isCacheTableMissing(error.message)) {
      return Response.json({
        ok: false,
        cacheAvailable: false,
        deletedCount: 0,
      });
    }
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({
    ok: true,
    cacheAvailable: true,
    deletedCount: count ?? 0,
    mode,
    dateKey: mode === "all" ? null : dateKey,
  });
}
