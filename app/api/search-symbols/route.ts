import { searchFinnhubSymbols } from "@/lib/finnhub";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();

  if (!query || query.length < 1) {
    return Response.json({ results: [] });
  }

  try {
    const results = await searchFinnhubSymbols(query);

    return Response.json({
      results: results.map((item) => ({
        symbol: item.symbol,
        displaySymbol: item.displaySymbol,
        description: item.description,
        type: item.type,
      })),
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to search symbols" },
      { status: 500 }
    );
  }
}
