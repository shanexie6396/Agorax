import { fetchFinnhubQuote } from "@/lib/finnhub";
import { generateInvestmentThinking } from "@/lib/openai";
import { supabase } from "@/lib/supabase";
import { searchRecentNews } from "@/lib/tavily";

type AssistantRequest = {
  prompt?: string;
  ticker?: string;
};

export async function POST(request: Request) {
  let body: AssistantRequest;
  try {
    body = (await request.json()) as AssistantRequest;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const prompt = String(body.prompt ?? "").trim();
  const ticker = String(body.ticker ?? "").trim().toUpperCase();

  if (!prompt) {
    return Response.json({ error: "Prompt is required" }, { status: 400 });
  }

  try {
    const [watchlistResult, financeContext, newsArticles] = await Promise.all([
      supabase
        .from("stocks")
        .select("id,ticker,company_name,buy_in_price,sentiment_status,thesis_now,updated_at")
        .order("created_at", { ascending: false }),
      ticker ? fetchFinnhubQuote(ticker).catch(() => null) : Promise.resolve(null),
      searchRecentNews(
        ticker
          ? `${ticker} stock market news macro economy rates inflation energy gold crypto`
          : `${prompt} market macro economy rates inflation energy gold crypto`,
        10
      ).catch(() => []),
    ]);

    const watchlist = watchlistResult.data ?? [];
    const selectedStockNote = ticker
      ? watchlist.find((item) => item.ticker?.toUpperCase() === ticker) ?? null
      : null;

    const ai = await generateInvestmentThinking({
      userPrompt: prompt,
      ticker: ticker || undefined,
      financeContext,
      newsContext: newsArticles,
      watchlistContext: {
        portfolio_watchlist_size: watchlist.length,
        selected_stock_note: selectedStockNote,
        recent_watchlist: watchlist.slice(0, 15),
      },
    });

    return Response.json({
      ticker: ticker || null,
      finance: financeContext,
      news: newsArticles,
      watchlistCount: watchlist.length,
      analysis: {
        marketNewsSummary: ai.market_news_summary ?? "",
        bullCase: ai.bull_case ?? [],
        bearCase: ai.bear_case ?? [],
        whatChangedRecently: ai.what_changed_recently ?? [],
        keyRisks: ai.key_risks ?? [],
        keyQuestionsBeforeInvesting: ai.key_questions_before_investing ?? [],
        investmentThinkingSummary: ai.investment_thinking_summary ?? "",
        confidenceNotes: ai.confidence_notes ?? "",
      },
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to generate investment analysis" },
      { status: 500 }
    );
  }
}
