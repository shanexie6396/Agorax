type TavilySearchResult = {
  title?: string;
  url?: string;
  content?: string;
  raw_content?: string;
  published_date?: string;
  score?: number;
};

type TavilySearchResponse = {
  results?: TavilySearchResult[];
};

export type NewsArticle = {
  title: string;
  url: string;
  snippet: string;
  content: string;
  publishedAt: string | null;
  score: number | null;
};

function getTavilyApiKey() {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    throw new Error("Missing TAVILY_API_KEY in .env.local");
  }
  return apiKey;
}

export async function searchRecentNews(query: string, maxResults = 8): Promise<NewsArticle[]> {
  const apiKey = getTavilyApiKey();

  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      query,
      topic: "news",
      days: 7,
      max_results: maxResults,
      include_raw_content: true,
      include_answer: false,
      include_images: false,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Tavily request failed: ${response.status}`);
  }

  const data = (await response.json()) as TavilySearchResponse;
  const results = data.results ?? [];

  return results
    .filter((item) => item.url && item.title)
    .map((item) => ({
      title: item.title?.trim() || "Untitled",
      url: item.url?.trim() || "",
      snippet: item.content?.trim() || "",
      content: item.raw_content?.trim() || item.content?.trim() || "",
      publishedAt: item.published_date ?? null,
      score: typeof item.score === "number" ? item.score : null,
    }))
    .filter((item) => item.url.length > 0);
}
