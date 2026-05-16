"use client";

import { useEffect, useState } from "react";

type ReflectionData = {
  generatedForDate: string;
  analysis: {
    marketNewsSummary: string;
    thesisCheck: string;
    bullCase: string[];
    bearCase: string[];
    whatChangedRecently: string[];
    keyRisks: string[];
    keyQuestionsBeforeInvesting: string[];
    investmentThinkingSummary: string;
    confidenceNotes: string;
  };
  stocks: Array<{
    ticker: string;
    companyName: string | null;
    total3BusinessDayPercentChange: number | null;
    recentTradingDays: Array<{
      date: string;
      close: number;
      dailyPercentChange: number | null;
    }>;
  }>;
};

export default function MarketPage() {
  const [reflectionLoading, setReflectionLoading] = useState(false);
  const [reflectionError, setReflectionError] = useState("");
  const [reflectionGeneratedAt, setReflectionGeneratedAt] = useState("");
  const [cacheAvailable, setCacheAvailable] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [historyItems, setHistoryItems] = useState<
    Array<{
      id: string;
      dateKey: string;
      generatedAt: string;
      reflection: ReflectionData;
    }>
  >([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string>("");
  const [reflection, setReflection] = useState<ReflectionData | null>(null);

  function renderMultilineText(value: unknown) {
    const normalized =
      typeof value === "string"
        ? value
        : Array.isArray(value)
          ? value.map((item) => String(item)).join("\n")
          : value && typeof value === "object"
            ? JSON.stringify(value, null, 2)
            : "";

    const lines = normalized
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    if (lines.length <= 1) {
      return (
        <p className="mt-2 text-sm leading-7 text-stone-700">
          {normalized || "No summary returned."}
        </p>
      );
    }
    return (
      <ul className="mt-2 space-y-1 text-sm leading-7 text-stone-700">
        {lines.map((line, idx) => (
          <li key={`${line}-${idx}`}>- {line}</li>
        ))}
      </ul>
    );
  }

  async function generateMarketReflection(force = false) {
    setReflectionLoading(true);
    setReflectionError("");

    try {
      const res = await fetch("/api/market-reflection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error ?? "Failed to generate market reflection");
      }

      const data = await res.json();
      setReflection(data.reflection ?? null);
      setReflectionGeneratedAt(data.generatedAt ?? "");
      setCacheAvailable(data.cacheAvailable !== false);
      await loadHistory();
    } catch (error) {
      setReflectionError(
        error instanceof Error ? error.message : "Failed to generate market reflection"
      );
    } finally {
      setReflectionLoading(false);
    }
  }

  async function loadHistory() {
    setHistoryLoading(true);
    setHistoryError("");
    try {
      const res = await fetch("/api/market-reflection?history=1");
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error ?? "Failed to load report history");
      }
      const data = await res.json();
      setCacheAvailable(data.cacheAvailable !== false);
      const items = (data.history ?? []) as Array<{
        id: string;
        dateKey: string;
        generatedAt: string;
        reflection: ReflectionData;
      }>;
      setHistoryItems(items);
      if (items.length > 0) {
        setSelectedHistoryId((prev) => prev || items[0].id);
      } else {
        setSelectedHistoryId("");
      }
    } catch (error) {
      setHistoryError(
        error instanceof Error ? error.message : "Failed to load report history"
      );
    } finally {
      setHistoryLoading(false);
    }
  }

  async function deleteTodayCache() {
    try {
      const res = await fetch("/api/market-reflection", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "today" }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error ?? "Failed to delete today's cache");
      }
      setReflection(null);
      setReflectionGeneratedAt("");
      await loadHistory();
    } catch (error) {
      setReflectionError(
        error instanceof Error ? error.message : "Failed to delete today's cache"
      );
    }
  }

  async function deleteAllCache() {
    const confirmed = window.confirm(
      "Delete all saved AI daily report history? This cannot be undone."
    );
    if (!confirmed) return;

    try {
      const res = await fetch("/api/market-reflection", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "all" }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error ?? "Failed to delete all cache history");
      }
      setReflection(null);
      setReflectionGeneratedAt("");
      setHistoryItems([]);
      setSelectedHistoryId("");
    } catch (error) {
      setReflectionError(
        error instanceof Error ? error.message : "Failed to delete all cache history"
      );
    }
  }

  useEffect(() => {
    async function loadCachedReflection() {
      try {
        const res = await fetch("/api/market-reflection");
        if (!res.ok) return;
        const data = await res.json();
        setCacheAvailable(data.cacheAvailable !== false);
        if (data.reflection) {
          setReflection(data.reflection);
          setReflectionGeneratedAt(data.generatedAt ?? "");
        } else {
          await generateMarketReflection(false);
        }
        await loadHistory();
      } catch {
        // no-op
      }
    }

    loadCachedReflection();
  }, []);

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] border border-stone-200 bg-[#fbf9f5] p-6 lg:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="inline-flex rounded-full border border-stone-200 bg-[#f2eee6] px-3 py-1 text-sm text-stone-600">
              Daily report
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-stone-800">
              Anlaysis AI Daily Reflection
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-stone-600">
              This page is your DAILY report. It uses fresh watchlist price/news/thesis context first, then asks AI to reason from that context.
            </p>
          </div>
          <button
            type="button"
            onClick={() => generateMarketReflection(false)}
            disabled={reflectionLoading}
            className="rounded-2xl bg-stone-700 px-5 py-3 text-sm font-semibold text-stone-100 transition hover:bg-stone-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {reflectionLoading ? "Generating..." : "Generate"}
          </button>
          <button
            type="button"
            onClick={() => generateMarketReflection(true)}
            disabled={reflectionLoading}
            className="rounded-2xl border border-stone-300 bg-[#fffdfa] px-5 py-3 text-sm font-semibold text-stone-700 transition hover:bg-[#ece6db] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Regenerate
          </button>
          <button
            type="button"
            onClick={deleteTodayCache}
            disabled={reflectionLoading}
            className="rounded-2xl border border-stone-300 bg-[#fffdfa] px-5 py-3 text-sm font-semibold text-stone-700 transition hover:bg-[#ece6db] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Delete today cache
          </button>
          <button
            type="button"
            onClick={deleteAllCache}
            disabled={reflectionLoading}
            className="rounded-2xl border border-red-300 bg-red-50 px-5 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Delete all history
          </button>
        </div>

        {reflectionError ? (
          <p className="mt-4 text-sm text-red-600">{reflectionError}</p>
        ) : null}

        {reflectionGeneratedAt ? (
          <p className="mt-4 text-xs text-stone-500">
            Generated at: {new Date(reflectionGeneratedAt).toLocaleString()}
          </p>
        ) : null}

        {!cacheAvailable ? (
          <p className="mt-2 text-xs text-amber-700">
            Daily reflection works, but cache table is not available yet. Run latest SQL in Supabase to enable same-day caching.
          </p>
        ) : null}

        {reflection ? (
          <div className="mt-6 space-y-5">
            <div className="rounded-2xl border border-stone-200 bg-[#fffdfa] p-4">
              <p className="text-sm font-semibold text-stone-800">Anlaysis/news summary</p>
              {renderMultilineText(reflection.analysis.marketNewsSummary || "No summary returned.")}
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
              <p className="text-sm font-semibold text-amber-900">
                Thesis Check (Hold, Refine, or Reconsider)
              </p>
              {renderMultilineText(
                reflection.analysis.thesisCheck ||
                  "No thesis check returned. Try regenerate for a fresh thesis judgement."
              )}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
                <p className="text-sm font-semibold text-emerald-800">Bull case</p>
                <ul className="mt-2 space-y-1 text-sm text-emerald-900">
                  {(reflection.analysis.bullCase.length > 0
                    ? reflection.analysis.bullCase
                    : ["No bull-case points returned."]).map((item, idx) => (
                    <li key={`market-bull-${idx}`}>- {item}</li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4">
                <p className="text-sm font-semibold text-rose-800">Bear case</p>
                <ul className="mt-2 space-y-1 text-sm text-rose-900">
                  {(reflection.analysis.bearCase.length > 0
                    ? reflection.analysis.bearCase
                    : ["No bear-case points returned."]).map((item, idx) => (
                    <li key={`market-bear-${idx}`}>- {item}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-2xl border border-stone-200 bg-[#fffdfa] p-4">
                <p className="text-sm font-semibold text-stone-800">What changed recently</p>
                <ul className="mt-2 space-y-1 text-sm text-stone-700">
                  {(reflection.analysis.whatChangedRecently.length > 0
                    ? reflection.analysis.whatChangedRecently
                    : ["No items returned."]).map((item, idx) => (
                    <li key={`market-changed-${idx}`}>- {item}</li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-stone-200 bg-[#fffdfa] p-4">
                <p className="text-sm font-semibold text-stone-800">Key risks</p>
                <ul className="mt-2 space-y-1 text-sm text-stone-700">
                  {(reflection.analysis.keyRisks.length > 0
                    ? reflection.analysis.keyRisks
                    : ["No risks returned."]).map((item, idx) => (
                    <li key={`market-risks-${idx}`}>- {item}</li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-stone-200 bg-[#fffdfa] p-4">
                <p className="text-sm font-semibold text-stone-800">Questions before investing</p>
                <ul className="mt-2 space-y-1 text-sm text-stone-700">
                  {(reflection.analysis.keyQuestionsBeforeInvesting.length > 0
                    ? reflection.analysis.keyQuestionsBeforeInvesting
                    : ["No questions returned."]).map((item, idx) => (
                    <li key={`market-questions-${idx}`}>- {item}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-[#fffdfa] p-4">
              <p className="text-sm font-semibold text-stone-800">Investment thinking summary</p>
              {renderMultilineText(
                reflection.analysis.investmentThinkingSummary || "No final summary returned."
              )}
              {reflection.analysis.confidenceNotes ? (
                <p className="mt-3 text-xs text-stone-500">
                  Confidence notes: {reflection.analysis.confidenceNotes}
                </p>
              ) : null}
            </div>

            <div className="rounded-2xl border border-stone-200 bg-[#fffdfa] p-4">
              <p className="text-sm font-semibold text-stone-800">3-trading-day stock moves</p>
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                {reflection.stocks.map((stock) => (
                  <div key={stock.ticker} className="rounded-xl border border-stone-200 bg-white p-3">
                    <p className="text-sm font-semibold text-stone-800">
                      {stock.ticker}
                      {stock.companyName ? ` — ${stock.companyName}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-stone-500">
                      3-business-day change:{" "}
                      {stock.total3BusinessDayPercentChange === null
                        ? "N/A"
                        : `${stock.total3BusinessDayPercentChange >= 0 ? "+" : ""}${stock.total3BusinessDayPercentChange.toFixed(2)}%`}
                    </p>
                    <ul className="mt-2 space-y-1 text-xs text-stone-600">
                      {stock.recentTradingDays.map((day) => (
                        <li key={`${stock.ticker}-${day.date}`}>
                          {day.date}: ${day.close.toFixed(2)}
                          {day.dailyPercentChange === null
                            ? ""
                            : ` (${day.dailyPercentChange >= 0 ? "+" : ""}${day.dailyPercentChange.toFixed(2)}%)`}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <section className="rounded-[2rem] border border-stone-200 bg-[#fbf9f5] p-6 lg:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="inline-flex rounded-full border border-stone-200 bg-[#f2eee6] px-3 py-1 text-sm text-stone-600">
              History
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-stone-800">
              Past AI daily reports
            </h2>
            <p className="mt-2 text-sm text-stone-600">
              Keep a running list of previous analysis snapshots.
            </p>
          </div>
          <button
            type="button"
            onClick={loadHistory}
            disabled={historyLoading}
            className="rounded-2xl border border-stone-300 bg-[#fffdfa] px-4 py-2 text-sm font-semibold text-stone-700 transition hover:bg-[#ece6db] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {historyLoading ? "Refreshing..." : "Refresh history"}
          </button>
        </div>

        {historyError ? <p className="mt-4 text-sm text-red-600">{historyError}</p> : null}

        {historyItems.length === 0 ? (
          <p className="mt-4 text-sm text-stone-600">No saved reports yet.</p>
        ) : (
          <div className="mt-4 grid gap-4 lg:grid-cols-[320px_1fr]">
            <div className="rounded-2xl border border-stone-200 bg-[#fffdfa] p-3">
              <ul className="space-y-2">
                {historyItems.map((item) => {
                  const selected = item.id === selectedHistoryId;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedHistoryId(item.id)}
                        className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition ${
                          selected
                            ? "border-stone-400 bg-[#f2eee6] text-stone-800"
                            : "border-stone-200 bg-white text-stone-700 hover:bg-[#f8f4eb]"
                        }`}
                      >
                        <p className="font-medium">{item.dateKey}</p>
                        <p className="mt-1 text-xs text-stone-500">
                          {new Date(item.generatedAt).toLocaleString()}
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-[#fffdfa] p-4">
              {(() => {
                const selected =
                  historyItems.find((item) => item.id === selectedHistoryId) ?? historyItems[0];
                if (!selected?.reflection) {
                  return <p className="text-sm text-stone-600">Select a report to view details.</p>;
                }
                const summary =
                  selected.reflection.analysis?.investmentThinkingSummary ||
                  selected.reflection.analysis?.marketNewsSummary ||
                  "No summary available.";
                return (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-stone-800">
                      {selected.dateKey} report
                    </p>
                    <p className="text-sm leading-7 text-stone-700">{summary}</p>
                    <p className="text-xs text-stone-500">
                      Stocks in report: {selected.reflection.stocks?.length ?? 0}
                    </p>
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
