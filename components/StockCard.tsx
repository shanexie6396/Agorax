"use client";

import { useEffect, useState } from "react";

export type Stock = {
  id?: string;
  ticker: string;
  company_name?: string | null;
  buy_in_price?: number | null;
  sentiment_status?: "bullish" | "neutral" | "bearish" | string | null;
  thesis_now?: string | null;
};

export type Quote = {
  ticker: string;
  currentPrice: number;
  changeAmount: number;
  changePercent: number;
  openPrice: number;
  highPrice: number;
  lowPrice: number;
  previousClose: number;
  fetchedAt: string;
};

type StockCardProps = {
  stock: Stock;
  onDelete?: (stock: Stock) => void;
  onUpdate?: (stock: Stock) => void;
  deleting?: boolean;
  initialQuote?: Quote | null;
};

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

export function StockCard({
  stock,
  onDelete,
  onUpdate,
  deleting = false,
  initialQuote = null,
}: StockCardProps) {
  const [quote, setQuote] = useState<Quote | null>(initialQuote);
  const [loading, setLoading] = useState(false);
  const [quoteError, setQuoteError] = useState("");
  const [editing, setEditing] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");
  const [buyInPriceInput, setBuyInPriceInput] = useState(
    stock.buy_in_price ? String(stock.buy_in_price) : ""
  );
  const [sentimentStatusInput, setSentimentStatusInput] = useState(
    stock.sentiment_status || "neutral"
  );
  const [thesisNowInput, setThesisNowInput] = useState(stock.thesis_now || "");

  useEffect(() => {
    setQuote(initialQuote);
  }, [initialQuote]);

  useEffect(() => {
    setBuyInPriceInput(stock.buy_in_price ? String(stock.buy_in_price) : "");
    setSentimentStatusInput(stock.sentiment_status || "neutral");
    setThesisNowInput(stock.thesis_now || "");
  }, [stock.buy_in_price, stock.sentiment_status, stock.thesis_now]);

  async function refreshQuote() {
    setLoading(true);
    setQuoteError("");

    try {
      const res = await fetch(`/api/quote?ticker=${encodeURIComponent(stock.ticker)}`);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error ?? "Failed to fetch quote");
      }

      const data = await res.json();
      setQuote(data.quote);
    } catch (error) {
      setQuoteError(error instanceof Error ? error.message : "Failed to fetch quote");
    } finally {
      setLoading(false);
    }
  }

  const isUp = (quote?.changePercent ?? 0) >= 0;

  async function saveEdits() {
    if (!stock.id) {
      setEditError("Cannot edit stock without id.");
      return;
    }

    setSavingEdit(true);
    setEditError("");
    try {
      const parsedBuyIn = Number(buyInPriceInput);
      const buyInPrice =
        buyInPriceInput.trim() === ""
          ? null
          : Number.isFinite(parsedBuyIn) && parsedBuyIn > 0
            ? parsedBuyIn
            : NaN;

      if (Number.isNaN(buyInPrice)) {
        throw new Error("Buy-in price must be a positive number.");
      }

      const res = await fetch("/api/stocks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: stock.id,
          buy_in_price: buyInPrice,
          sentiment_status: sentimentStatusInput,
          thesis_now: thesisNowInput,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error ?? "Failed to save edits");
      }

      const data = await res.json();
      onUpdate?.(data.stock as Stock);
      setEditing(false);
    } catch (error) {
      setEditError(error instanceof Error ? error.message : "Failed to save edits");
    } finally {
      setSavingEdit(false);
    }
  }

  return (
    <article className="group rounded-3xl border border-stone-200 bg-[#fbf9f5] p-5 transition hover:-translate-y-0.5">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-2xl font-semibold tracking-tight text-stone-800">{stock.ticker}</h3>
          {stock.company_name ? (
            <p className="mt-1 text-sm text-stone-500">{stock.company_name}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 gap-2">
  <button
    onClick={refreshQuote}
    disabled={loading}
    className="rounded-full bg-stone-700 px-3 py-1.5 text-xs font-semibold text-stone-100 transition hover:bg-stone-600 disabled:cursor-not-allowed disabled:opacity-60"
  >
    {loading ? "Loading..." : "Refresh price"}
  </button>

  {onDelete ? (
    <button
      onClick={() => onDelete(stock)}
      disabled={deleting}
      className="rounded-full border border-stone-300 bg-[#fbf9f5] px-3 py-1.5 text-xs font-semibold text-stone-600 transition hover:bg-[#ece6db] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {deleting ? "Deleting..." : "Delete"}
    </button>
  ) : null}
  <button
    onClick={() => {
      setEditing((prev) => !prev);
      setEditError("");
    }}
    className="rounded-full border border-stone-300 bg-[#fbf9f5] px-3 py-1.5 text-xs font-semibold text-stone-700 transition hover:bg-[#ece6db]"
  >
    {editing ? "Cancel" : "Edit"}
  </button>
</div>
      </div>

      <div className="mb-5 rounded-3xl bg-[#f2eee6] p-4 ring-1 ring-stone-200">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-stone-500">Current price</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight text-stone-800">
              {formatMoney(quote?.currentPrice)}
            </p>
          </div>
          <div className="text-right">
            <p className={`text-lg font-semibold ${isUp ? "text-emerald-600" : "text-rose-600"}`}>
              {quote ? formatPercent(quote.changePercent) : "—"}
            </p>
            <p className="text-xs text-stone-500">
              {quote ? formatMoney(quote.changeAmount) : "change"}
            </p>
          </div>
        </div>

        {quote ? (
          <div className="mt-4 grid grid-cols-3 gap-2 text-xs text-stone-500">
            <p>Open <span className="text-stone-700">{formatMoney(quote.openPrice)}</span></p>
            <p>High <span className="text-stone-700">{formatMoney(quote.highPrice)}</span></p>
            <p>Low <span className="text-stone-700">{formatMoney(quote.lowPrice)}</span></p>
          </div>
        ) : (
          <p className="mt-4 text-xs text-stone-500">Click refresh to fetch the latest quote.</p>
        )}

        {quoteError ? <p className="mt-3 text-xs text-red-600">{quoteError}</p> : null}
      </div>

      <div className="space-y-4 text-sm leading-6">
        <div>
          <p className="font-medium text-stone-800">Buy-in price</p>
          <p className="mt-1 text-stone-600">{formatMoney(stock.buy_in_price ?? undefined)}</p>
        </div>

        <div>
          <p className="font-medium text-stone-800">Status</p>
          <p className="mt-1 text-stone-600">
            {stock.sentiment_status
              ? `${String(stock.sentiment_status).charAt(0).toUpperCase()}${String(
                  stock.sentiment_status
                ).slice(1)}`
              : "Neutral"}
          </p>
        </div>

        <div>
          <p className="font-medium text-stone-800">Thesis now</p>
          <p className="mt-1 text-stone-600">{stock.thesis_now || "No current thesis yet."}</p>
        </div>

        {editing ? (
          <div className="rounded-2xl bg-[#f2eee6] p-3 ring-1 ring-stone-200">
            <p className="text-xs font-medium uppercase tracking-wider text-stone-500">
              Edit stock notes
            </p>
            <div className="mt-3 grid gap-3">
              <input
                value={buyInPriceInput}
                onChange={(e) => setBuyInPriceInput(e.target.value)}
                placeholder="Buy-in price, e.g. 183.5"
                className="rounded-2xl border border-stone-200 bg-[#fffdfa] px-4 py-3 text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-[#c4a172]"
              />
              <select
                value={sentimentStatusInput}
                onChange={(e) => setSentimentStatusInput(e.target.value)}
                className="rounded-2xl border border-stone-200 bg-[#fffdfa] px-4 py-3 text-stone-800 outline-none transition focus:border-[#c4a172]"
              >
                <option value="bullish">Bullish</option>
                <option value="neutral">Neutral</option>
                <option value="bearish">Bearish</option>
              </select>
              <textarea
                value={thesisNowInput}
                onChange={(e) => setThesisNowInput(e.target.value)}
                placeholder="What is your current thesis right now?"
                rows={4}
                className="rounded-2xl border border-stone-200 bg-[#fffdfa] px-4 py-3 text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-[#c4a172]"
              />
              <button
                onClick={saveEdits}
                disabled={savingEdit}
                className="w-fit rounded-2xl bg-stone-700 px-4 py-2 text-xs font-semibold text-stone-100 transition hover:bg-stone-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingEdit ? "Saving..." : "Save edits"}
              </button>
              {editError ? <p className="text-xs text-red-600">{editError}</p> : null}
            </div>
          </div>
        ) : null}
      </div>
    </article>
  );
}
