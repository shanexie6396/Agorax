import { searchRecentNews } from "@/lib/tavily";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();
  const max = Number(searchParams.get("max") ?? "8");

  if (!query) {
    return Response.json({ error: "Query is required" }, { status: 400 });
  }

  try {
    const articles = await searchRecentNews(query, Number.isFinite(max) ? Math.min(Math.max(max, 1), 20) : 8);
    return Response.json({ query, articles });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to fetch news" },
      { status: 500 }
    );
  }
}
