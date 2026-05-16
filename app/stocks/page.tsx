"use client";

import { useEffect, useState } from "react";
import { StockCard, Stock, Quote } from "@/components/StockCard";
import { SymbolSearch, SymbolSearchResult } from "@/components/SymbolSearch";

type DashboardView = "rows" | "detail";

export default function StocksPage() {
  const [view, setView] = useState<DashboardView>("rows");
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [quotesByTicker, setQuotesByTicker] = useState<Record<string, Quote>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [ticker, setTicker] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [buyInPrice, setBuyInPrice] = useState("");
  const [sentimentStatus, setSentimentStatus] = useState("neutral");
  const [thesisNow, setThesisNow] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingQuotes, setLoadingQuotes] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingStockId, setDeletingStockId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [assistantPrompt, setAssistantPrompt] = useState("");
  const [assistantTicker, setAssistantTicker] = useState("");
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [assistantError, setAssistantError] = useState("");
  const [assistantResult, setAssistantResult] = useState<{
    ticker: string | null;
    news: Array<{
      title: string;
      url: string;
      snippet: string;
      content: string;
      publishedAt: string | null;
    }>;
    analysis: {
      marketNewsSummary: string;
      bullCase: string[];
      bearCase: string[];
      whatChangedRecently: string[];
      keyRisks: string[];
      keyQuestionsBeforeInvesting: string[];
      investmentThinkingSummary: string;
      confidenceNotes: string;
    };
  } | null>(null);
  const [showAddTickerForm, setShowAddTickerForm] = useState(false);

  function formatMoney(value?: number) {
    if (value === undefined || Number.isNaN(value)) return "—";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    }).format(value);
  }

  function formatPercent(value?: number) {
    if (value === undefined || Number.isNaN(value)) return "—";
    const sign = value > 0 ? "+" : "";
    return `${sign}${value.toFixed(2)}%`;
  }

  async function loadQuotes(stocksToLoad: Stock[]) {
    if (stocksToLoad.length === 0) {
      setQuotesByTicker({});
      return;
    }

    setLoadingQuotes(true);
    try {
      const results = await Promise.all(
        stocksToLoad.map(async (stock) => {
          const res = await fetch(`/api/quote?ticker=${encodeURIComponent(stock.ticker)}`);
          if (!res.ok) return null;
          const data = await res.json();
          return data.quote as Quote;
        })
      );

      const nextQuotes: Record<string, Quote> = {};
      for (const quote of results) {
        if (quote?.ticker) {
          nextQuotes[quote.ticker] = quote;
        }
      }
      setQuotesByTicker(nextQuotes);
    } finally {
      setLoadingQuotes(false);
    }
  }

  async function loadStocks() {
    setLoading(true);
    setErrorMessage("");

    try {
      const res = await fetch("/api/stocks");

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error ?? "Failed to load stocks");
      }

      const data = await res.json();
      const loadedStocks = data.stocks ?? [];
      setStocks(loadedStocks);
      await loadQuotes(loadedStocks);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load stocks");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStocks();
  }, []);

  function selectSymbol(result: SymbolSearchResult) {
    setTicker(result.symbol);
    setCompanyName(result.description);
    setSearchQuery(`${result.symbol} — ${result.description}`);
  }

  async function addStock() {
    const finalTicker = ticker.trim() || searchQuery.trim().toUpperCase();

    if (!finalTicker) {
      setErrorMessage("Please search or enter a ticker first.");
      return;
    }

    setSaving(true);
    setErrorMessage("");

    try {
      const res = await fetch("/api/stocks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ticker: finalTicker,
          company_name: companyName,
          buy_in_price: buyInPrice ? Number(buyInPrice) : null,
          sentiment_status: sentimentStatus,
          thesis_now: thesisNow,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error ?? "Failed to add stock");
      }

      setSearchQuery("");
      setTicker("");
      setCompanyName("");
      setBuyInPrice("");
      setSentimentStatus("neutral");
      setThesisNow("");
      await loadStocks();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to add stock");
    } finally {
      setSaving(false);
    }
  }

  async function deleteStock(stock: Stock) {
    const confirmed = window.confirm(`Delete ${stock.ticker} from your watchlist?`);
    if (!confirmed) return;
  
    setDeletingStockId(stock.id ?? stock.ticker);
    setErrorMessage("");
  
    try {
      const params = stock.id
        ? `id=${encodeURIComponent(stock.id)}`
        : `ticker=${encodeURIComponent(stock.ticker)}`;
  
      const res = await fetch(`/api/stocks?${params}`, {
        method: "DELETE",
      });
  
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error ?? "Failed to delete stock");
      }
  
      setStocks((prev) =>
        prev.filter((item) => {
          if (stock.id) return item.id !== stock.id;
          return item.ticker !== stock.ticker;
        })
      );
      setQuotesByTicker((prev) => {
        const next = { ...prev };
        delete next[stock.ticker];
        return next;
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to delete stock");
    } finally {
      setDeletingStockId(null);
    }
  }

  function handleStockUpdated(updatedStock: Stock) {
    setStocks((prev) =>
      prev.map((item) =>
        (item.id && updatedStock.id && item.id === updatedStock.id) ||
        item.ticker === updatedStock.ticker
          ? { ...item, ...updatedStock }
          : item
      )
    );
  }

  async function runInvestmentAssistant() {
    if (!assistantPrompt.trim()) {
      setAssistantError("Please write a question or investment idea first.");
      return;
    }

    setAssistantLoading(true);
    setAssistantError("");

    try {
      const res = await fetch("/api/investment-assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: assistantPrompt,
          ticker: assistantTicker.trim().toUpperCase() || undefined,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error ?? "Failed to run investment assistant");
      }

      const data = await res.json();
      setAssistantResult({
        ticker: data.ticker ?? null,
        news: data.news ?? [],
        analysis: {
          marketNewsSummary: data.analysis?.marketNewsSummary ?? "",
          bullCase: data.analysis?.bullCase ?? [],
          bearCase: data.analysis?.bearCase ?? [],
          whatChangedRecently: data.analysis?.whatChangedRecently ?? [],
          keyRisks: data.analysis?.keyRisks ?? [],
          keyQuestionsBeforeInvesting: data.analysis?.keyQuestionsBeforeInvesting ?? [],
          investmentThinkingSummary: data.analysis?.investmentThinkingSummary ?? "",
          confidenceNotes: data.analysis?.confidenceNotes ?? "",
        },
      });
    } catch (error) {
      setAssistantError(
        error instanceof Error ? error.message : "Failed to run investment assistant"
      );
    } finally {
      setAssistantLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <section>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-stone-800">Saved stocks</h2>
            <p className="mt-1 text-sm text-stone-500">
              Starts in rows. Switch to detail if you want full cards.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="inline-flex rounded-2xl border border-stone-200 bg-[#f2eee6] p-1">
              <button
                type="button"
                onClick={() => setView("rows")}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                  view === "rows"
                    ? "bg-[#fbf9f5] text-stone-800"
                    : "text-stone-600 hover:bg-[#ece6db] hover:text-stone-800"
                }`}
              >
                Rows
              </button>
              <button
                type="button"
                onClick={() => setView("detail")}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                  view === "detail"
                    ? "bg-[#fbf9f5] text-stone-800"
                    : "text-stone-600 hover:bg-[#ece6db] hover:text-stone-800"
                }`}
              >
                Detail
              </button>
            </div>
            <button onClick={loadStocks} className="rounded-2xl border border-stone-300 bg-[#fbf9f5] px-4 py-2 text-sm text-stone-700 transition hover:bg-[#ece6db]">
              Reload
            </button>
          </div>
        </div>

        {loading ? (
          <div className="rounded-3xl border border-stone-200 bg-[#f2eee6] p-6 text-stone-500">
            Loading watchlist...
          </div>
        ) : stocks.length === 0 ? (
          <div className="rounded-3xl border border-stone-200 bg-[#f2eee6] p-6 text-stone-500">
            No stocks yet. Try searching Apple, Nvidia, Tesla, or Microsoft.
          </div>
        ) : view === "rows" ? (
          <div className="overflow-hidden rounded-2xl border border-stone-200">
            <table className="min-w-full divide-y divide-stone-200 text-sm">
              <thead className="bg-[#f2eee6] text-left text-stone-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Ticker</th>
                  <th className="px-4 py-3 font-medium">Company</th>
                  <th className="px-4 py-3 font-medium">Price</th>
                  <th className="px-4 py-3 font-medium">Change</th>
                  <th className="px-4 py-3 font-medium">Buy-in</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 bg-[#fbf9f5] text-stone-700">
                {stocks.map((stock) => {
                  const quote = quotesByTicker[stock.ticker];
                  const isUp = (quote?.changePercent ?? 0) >= 0;
                  const deleting = deletingStockId === (stock.id ?? stock.ticker);
                  return (
                    <tr key={stock.id ?? stock.ticker} className="align-top transition hover:bg-[#f2eee6]">
                      <td className="px-4 py-3 font-semibold text-stone-800">{stock.ticker}</td>
                      <td className="px-4 py-3 text-stone-600">{stock.company_name || "—"}</td>
                      <td className="px-4 py-3">{formatMoney(quote?.currentPrice)}</td>
                      <td className={`px-4 py-3 ${isUp ? "text-emerald-600" : "text-rose-600"}`}>
                        {quote
                          ? `${formatPercent(quote.changePercent)} (${formatMoney(quote.changeAmount)})`
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-stone-600">{formatMoney(stock.buy_in_price ?? undefined)}</td>
                      <td className="px-4 py-3 text-stone-600">
                        {stock.sentiment_status
                          ? `${String(stock.sentiment_status).charAt(0).toUpperCase()}${String(
                              stock.sentiment_status
                            ).slice(1)}`
                          : "Neutral"}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => deleteStock(stock)}
                          disabled={deleting}
                          className="rounded-xl border border-stone-300 bg-[#fbf9f5] px-3 py-1.5 text-xs font-semibold text-stone-700 transition hover:bg-[#ece6db] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {deleting ? "Deleting..." : "Delete"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {stocks.map((stock) => (
              <StockCard
                key={stock.id ?? stock.ticker}
                stock={stock}
                onDelete={deleteStock}
                onUpdate={handleStockUpdated}
                deleting={deletingStockId === (stock.id ?? stock.ticker)}
                initialQuote={quotesByTicker[stock.ticker] ?? null}
              />
            ))}
          </div>
        )}
        {loadingQuotes ? (
          <p className="mt-3 text-xs text-stone-500">Loading latest prices for saved stocks...</p>
        ) : null}
      </section>

      <section className="rounded-[2rem] border border-stone-200 bg-[#fbf9f5] p-6">
        <p className="text-sm font-medium uppercase tracking-wider text-stone-500">Dashboard</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-stone-800">Companies you care about</h1>
        <p className="mt-3 max-w-2xl leading-7 text-stone-600">
          Search by company name or partial ticker, then save your buy-in and current thesis.
        </p>
        <button
          type="button"
          onClick={() => setShowAddTickerForm((prev) => !prev)}
          className="mt-5 rounded-2xl bg-stone-700 px-5 py-3 text-sm font-semibold text-stone-100 transition hover:bg-stone-600"
        >
          {showAddTickerForm ? "Hide add ticker" : "Add ticker"}
        </button>
      </section>

      {showAddTickerForm ? (
      <section className="rounded-[2rem] border border-stone-200 bg-[#fbf9f5] p-5">
        <h2 className="mb-4 text-xl font-semibold text-stone-800">Add a stock</h2>

        <div className="grid gap-3">
          <SymbolSearch
            value={searchQuery}
            onQueryChange={(value) => {
              setSearchQuery(value);
              setTicker("");
              setCompanyName("");
            }}
            onSelect={selectSymbol}
          />

          <div className="grid gap-3 md:grid-cols-2">
            <input
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              placeholder="Selected ticker"
              className="rounded-2xl border border-stone-200 bg-[#fffdfa] px-4 py-3 text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-[#c4a172]"
            />
            <input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Company name"
              className="rounded-2xl border border-stone-200 bg-[#fffdfa] px-4 py-3 text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-[#c4a172]"
            />
          </div>

          <input
            value={buyInPrice}
            onChange={(e) => setBuyInPrice(e.target.value)}
            placeholder="Buy-in price (optional), e.g. 183.5"
            className="rounded-2xl border border-stone-200 bg-[#fffdfa] px-4 py-3 text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-[#c4a172]"
          />
          <textarea
            value={thesisNow}
            onChange={(e) => setThesisNow(e.target.value)}
            placeholder="Thesis now: why are you bullish/bearish right now?"
            rows={3}
            className="rounded-2xl border border-stone-200 bg-[#fffdfa] px-4 py-3 text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-[#c4a172]"
          />
          <select
            value={sentimentStatus}
            onChange={(e) => setSentimentStatus(e.target.value)}
            className="rounded-2xl border border-stone-200 bg-[#fffdfa] px-4 py-3 text-stone-800 outline-none transition focus:border-[#c4a172]"
          >
            <option value="bullish">Bullish</option>
            <option value="neutral">Neutral</option>
            <option value="bearish">Bearish</option>
          </select>
          <button
            onClick={addStock}
            disabled={saving}
            className="w-fit rounded-2xl bg-stone-700 px-5 py-3 font-semibold text-stone-100 transition hover:bg-stone-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save stock"}
          </button>
        </div>

        {errorMessage ? <p className="mt-4 text-sm text-red-600">{errorMessage}</p> : null}
      </section>
      ) : null}

      <section className="rounded-[2rem] border border-stone-200 bg-[#fbf9f5] p-5">
        <h2 className="text-xl font-semibold text-stone-800">AI investment assistant</h2>
        <p className="mt-2 max-w-3xl text-sm text-stone-600">
          Ask about a ticker or idea. The assistant combines market data, recent web news, and your saved watchlist thesis notes.
        </p>

        <div className="mt-4 grid gap-3">
          <div className="grid gap-3 md:grid-cols-3">
            <input
              value={assistantTicker}
              onChange={(e) => setAssistantTicker(e.target.value.toUpperCase())}
              placeholder="Ticker (optional), e.g. NVDA"
              className="rounded-2xl border border-stone-200 bg-[#fffdfa] px-4 py-3 text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-[#c4a172]"
            />
            <input
              value={assistantPrompt}
              onChange={(e) => setAssistantPrompt(e.target.value)}
              placeholder="What should I understand before investing in this idea?"
              className="md:col-span-2 rounded-2xl border border-stone-200 bg-[#fffdfa] px-4 py-3 text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-[#c4a172]"
            />
          </div>

          <button
            onClick={runInvestmentAssistant}
            disabled={assistantLoading}
            className="w-fit rounded-2xl bg-stone-700 px-5 py-3 font-semibold text-stone-100 transition hover:bg-stone-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {assistantLoading ? "Analyzing..." : "Run AI analysis"}
          </button>
        </div>

        {assistantError ? <p className="mt-3 text-sm text-red-600">{assistantError}</p> : null}

        {assistantResult ? (
          <div className="mt-6 space-y-5">
            <div className="rounded-2xl border border-stone-200 bg-[#fffdfa] p-4">
              <p className="text-xs uppercase tracking-wider text-stone-500">Anlaysis and news summary</p>
              <p className="mt-2 text-sm leading-7 text-stone-700">
                {assistantResult.analysis.marketNewsSummary || "No summary returned."}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
                <p className="text-sm font-semibold text-emerald-800">Bull case</p>
                <ul className="mt-2 space-y-1 text-sm text-emerald-900">
                  {(assistantResult.analysis.bullCase.length > 0
                    ? assistantResult.analysis.bullCase
                    : ["No bull-case points returned."]).map((item, idx) => (
                    <li key={`bull-${idx}`}>- {item}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4">
                <p className="text-sm font-semibold text-rose-800">Bear case</p>
                <ul className="mt-2 space-y-1 text-sm text-rose-900">
                  {(assistantResult.analysis.bearCase.length > 0
                    ? assistantResult.analysis.bearCase
                    : ["No bear-case points returned."]).map((item, idx) => (
                    <li key={`bear-${idx}`}>- {item}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-stone-200 bg-[#fffdfa] p-4">
                <p className="text-sm font-semibold text-stone-800">What changed recently</p>
                <ul className="mt-2 space-y-1 text-sm text-stone-700">
                  {(assistantResult.analysis.whatChangedRecently.length > 0
                    ? assistantResult.analysis.whatChangedRecently
                    : ["No recent changes returned."]).map((item, idx) => (
                    <li key={`chg-${idx}`}>- {item}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-stone-200 bg-[#fffdfa] p-4">
                <p className="text-sm font-semibold text-stone-800">Key risks</p>
                <ul className="mt-2 space-y-1 text-sm text-stone-700">
                  {(assistantResult.analysis.keyRisks.length > 0
                    ? assistantResult.analysis.keyRisks
                    : ["No risk items returned."]).map((item, idx) => (
                    <li key={`risk-${idx}`}>- {item}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-stone-200 bg-[#fffdfa] p-4">
                <p className="text-sm font-semibold text-stone-800">Questions before investing</p>
                <ul className="mt-2 space-y-1 text-sm text-stone-700">
                  {(assistantResult.analysis.keyQuestionsBeforeInvesting.length > 0
                    ? assistantResult.analysis.keyQuestionsBeforeInvesting
                    : ["No questions returned."]).map((item, idx) => (
                    <li key={`q-${idx}`}>- {item}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-[#fffdfa] p-4">
              <p className="text-sm font-semibold text-stone-800">Investment thinking summary</p>
              <p className="mt-2 text-sm leading-7 text-stone-700">
                {assistantResult.analysis.investmentThinkingSummary || "No final summary returned."}
              </p>
              {assistantResult.analysis.confidenceNotes ? (
                <p className="mt-3 text-xs text-stone-500">
                  Confidence notes: {assistantResult.analysis.confidenceNotes}
                </p>
              ) : null}
            </div>

            <div className="rounded-2xl border border-stone-200 bg-[#fffdfa] p-4">
              <p className="text-sm font-semibold text-stone-800">News sources</p>
              {assistantResult.news.length === 0 ? (
                <p className="mt-2 text-sm text-stone-600">No news links returned.</p>
              ) : (
                <ul className="mt-2 space-y-3">
                  {assistantResult.news.map((article, idx) => (
                    <li key={`${article.url}-${idx}`} className="text-sm text-stone-700">
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-stone-800 underline decoration-stone-300 underline-offset-4"
                      >
                        {article.title}
                      </a>
                      <p className="mt-1 text-xs text-stone-500">{article.snippet || "No snippet available."}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : null}
      </section>

    </div>
  );
}
