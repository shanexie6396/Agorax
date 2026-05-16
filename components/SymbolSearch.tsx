"use client";

import { useEffect, useMemo, useState } from "react";

export type SymbolSearchResult = {
  symbol: string;
  displaySymbol: string;
  description: string;
  type: string;
};

type SymbolSearchProps = {
  value: string;
  onQueryChange: (value: string) => void;
  onSelect: (result: SymbolSearchResult) => void;
};

export function SymbolSearch({ value, onQueryChange, onSelect }: SymbolSearchProps) {
  const [results, setResults] = useState<SymbolSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const cleanQuery = useMemo(() => value.trim(), [value]);

  useEffect(() => {
    if (cleanQuery.length < 1) {
      setResults([]);
      setErrorMessage("");
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setErrorMessage("");

      try {
        const res = await fetch(`/api/search-symbols?q=${encodeURIComponent(cleanQuery)}`, {
          signal: controller.signal,
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error ?? "Search failed");
        }

        const data = await res.json();
        setResults(data.results ?? []);
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
        setErrorMessage(error instanceof Error ? error.message : "Search failed");
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [cleanQuery]);

  return (
    <div className="relative">
      <input
        value={value}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder="Search company or ticker, e.g. Apple / AAPL / app"
        className="w-full rounded-2xl border border-stone-200 bg-[#fffdfa] px-4 py-3 text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-[#c4a172]"
      />

      {loading ? (
        <p className="mt-2 text-xs text-stone-500">Searching...</p>
      ) : null}

      {errorMessage ? (
        <p className="mt-2 text-xs text-red-600">{errorMessage}</p>
      ) : null}

      {results.length > 0 ? (
        <div className="absolute z-20 mt-2 max-h-72 w-full overflow-auto rounded-2xl border border-stone-200 bg-[#fffdfa] p-2 shadow-lg">
          {results.map((result) => (
            <button
              key={`${result.symbol}-${result.description}`}
              type="button"
              onClick={() => {
                onSelect(result);
                setResults([]);
              }}
              className="block w-full rounded-xl px-3 py-3 text-left transition hover:bg-[#f2eee6]"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-stone-800">{result.displaySymbol || result.symbol}</p>
                <span className="rounded-full bg-[#f2eee6] px-2 py-1 text-[10px] uppercase tracking-wider text-stone-500">
                  {result.type || "symbol"}
                </span>
              </div>
              <p className="mt-1 text-sm text-stone-500">{result.description}</p>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
