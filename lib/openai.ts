export function getOpenAiApiKey() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY in .env.local");
  }
  return apiKey;
}

function isTransientNetworkError(error: unknown) {
  return error instanceof TypeError || (error instanceof Error && /fetch failed/i.test(error.message));
}

async function fetchOpenAiWithRetry(
  url: string,
  init: RequestInit,
  maxAttempts = 2
): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetch(url, init);
      if (response.status >= 500 && attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
        continue;
      }
      return response;
    } catch (error) {
      lastError = error;
      if (!isTransientNetworkError(error) || attempt >= maxAttempts) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
    }
  }

  throw lastError instanceof Error ? lastError : new Error("OpenAI request failed");
}

export async function generateInvestmentThinking(args: {
  userPrompt: string;
  ticker?: string;
  financeContext: unknown;
  newsContext: unknown;
  watchlistContext: unknown;
}) {
  const apiKey = getOpenAiApiKey();
  const model = process.env.OPENAI_MODEL || "gpt-5.4";

  const systemPrompt = `
You are an investment thinking assistant, not a financial advisor.
Use only provided context and keep uncertainty explicit.
When watchlist has multiple companies, discuss them explicitly and separately.
In string fields, prefer line-separated company bullets like:
"AAPL: ...\nNVDA: ...\nTSLA: ..."
Output valid JSON with these exact keys:
- market_news_summary (string)
- thesis_check (string)
- thesis_check_rows (array of objects with keys: ticker, stance, price_move_summary, possible_reasons, thesis_implication, suggested_action)
- bull_case (array of strings)
- bear_case (array of strings)
- what_changed_recently (array of strings)
- confidence_notes (string)
Do not include markdown code fences.
Avoid direct buy/sell advice.
`;

  const userContent = {
    user_prompt: args.userPrompt,
    ticker: args.ticker ?? null,
    finance_context: args.financeContext,
    news_context: args.newsContext,
    watchlist_context: args.watchlistContext,
  };

  let response: Response;
  try {
    response = await fetchOpenAiWithRetry("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt.trim() },
          { role: "user", content: JSON.stringify(userContent) },
        ],
      }),
      cache: "no-store",
    });
  } catch (error) {
    if (isTransientNetworkError(error)) {
      throw new Error("OpenAI network error: fetch failed");
    }
    throw error instanceof Error ? error : new Error("OpenAI request failed");
  }

  if (!response.ok) {
    throw new Error(`OpenAI request failed: ${response.status}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI returned empty content");
  }

  try {
    return JSON.parse(content) as {
      market_news_summary?: string;
      thesis_check?: string;
      thesis_check_rows?: Array<{
        ticker?: string;
        stance?: string;
        price_move_summary?: string;
        possible_reasons?: string;
        thesis_implication?: string;
        suggested_action?: string;
      }>;
      bull_case?: string[];
      bear_case?: string[];
      what_changed_recently?: string[];
      confidence_notes?: string;
    };
  } catch {
    throw new Error("OpenAI returned invalid JSON content");
  }
}
