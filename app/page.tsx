"use client";

import { useEffect, useRef, useState } from "react";
import { SP500Chart } from "@/components/SP500Chart";
import { Lora, Playfair_Display } from "next/font/google";

type Sp500Point = {
  date: string;
  close: number;
};

type IndexConfig = {
  symbol: string;
  label: string;
  description: string;
};

type IndexSeries = {
  symbol: string;
  label: string;
  points: Sp500Point[];
};

const HOMEPAGE_INDEXES: IndexConfig[] = [
  {
    symbol: "^GSPC",
    label: "S&P 500",
    description: "Large-cap US companies; broad benchmark for US equity market health.",
  },
  {
    symbol: "^IXIC",
    label: "Nasdaq Composite",
    description: "Tech-heavy US index; useful for growth and risk-on sentiment.",
  },
  {
    symbol: "^DJI",
    label: "Dow Jones",
    description: "30 major US blue-chip companies; classic industrial/cyclical gauge.",
  },
  {
    symbol: "^RUT",
    label: "Russell 2000",
    description: "US small caps; often signals domestic risk appetite and financing stress.",
  },
  {
    symbol: "^VIX",
    label: "CBOE VIX",
    description: "Volatility index; higher values usually indicate rising market fear/uncertainty.",
  },
  {
    symbol: "ACWI",
    label: "MSCI ACWI ETF proxy",
    description: "Global equities proxy (developed + emerging) for international context.",
  },
];

const displayHeadingFont = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700"],
});

const supportingBodyFont = Lora({
  subsets: ["latin"],
  weight: ["400", "500"],
});

export default function HomePage() {
  const [indexSeries, setIndexSeries] = useState<IndexSeries[]>([]);
  const [timeframesBySymbol, setTimeframesBySymbol] = useState<Record<string, "month" | "year">>(
    Object.fromEntries(HOMEPAGE_INDEXES.map((item) => [item.symbol, "month"])) as Record<
      string,
      "month" | "year"
    >
  );
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const hasLoadedOnceRef = useRef(false);

  useEffect(() => {
    async function loadIndexes() {
      const showInitialLoading = !hasLoadedOnceRef.current && indexSeries.length === 0;
      if (showInitialLoading) {
        setLoading(true);
      }
      setErrorMessage("");

      try {
        const results = await Promise.all(
          HOMEPAGE_INDEXES.map(async (item) => {
            const timeframe = timeframesBySymbol[item.symbol] ?? "month";
            const res = await fetch(
              `/api/index-history?symbol=${encodeURIComponent(item.symbol)}&label=${encodeURIComponent(item.label)}&days=${
                timeframe === "month" ? 30 : 365
              }`
            );
            if (!res.ok) {
              const errorData = await res.json().catch(() => ({}));
              throw new Error(errorData.error ?? `Failed to load ${item.label}`);
            }
            const data = await res.json();
            return {
              symbol: item.symbol,
              label: item.label,
              points: (data.points ?? []) as Sp500Point[],
            };
          })
        );
        setIndexSeries(results);
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to load index data"
        );
      } finally {
        if (showInitialLoading) {
          setLoading(false);
          hasLoadedOnceRef.current = true;
        }
      }
    }

    loadIndexes();
  }, [timeframesBySymbol]);

  return (
    <div className="space-y-8">
      <section className="!shadow-none px-1 py-4 lg:px-2 lg:py-6">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
          <div className="agx-reveal agx-reveal-1">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
              Agorax
            </p>
            <h1
              className={`${displayHeadingFont.className} mt-4 text-5xl font-semibold leading-[1.05] tracking-tight text-stone-800 sm:text-6xl lg:text-7xl`}
            >
              AI workspace for investment thinking.
            </h1>
          </div>

          <div className={`${supportingBodyFont.className} agx-reveal agx-reveal-2 space-y-5 lg:pt-8`}>
            <p className="text-base leading-7 text-stone-600">
              Agorax helps you think clearly by comparing your thesis with fresh data, news,
              price movement, and market context. Tell us what you believe and why. As the market
              changes, Agorax gives you ongoing feedback on what supports your thesis, what
              challenges it, and what may need a second look.
            </p>
            <p className="text-base leading-7 text-stone-700">
              <strong>You own the decision. Agorax shows the signal.</strong>
            </p>
            <div className="h-px w-full bg-stone-300/70" />
            <p className="text-sm font-semibold uppercase tracking-wider text-stone-500">
              To start
            </p>
            <p className="text-base leading-7 text-stone-600">
              Use <strong>Dashboard</strong> to track the stocks you care about, including tickers,
              buy-in prices, outlook, and your current investment thesis.
            </p>
            <p className="text-base leading-7 text-stone-600">
              Use <strong>Analysis</strong> to generate a daily AI reflection based on fresh price
              and news data. Agorax helps you understand what changed, why it may matter, and
              whether the latest market context strengthens, weakens, or leaves your thesis
              unchanged.
            </p>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="rounded-[2rem] border border-stone-200 bg-[#f2eee6] p-8 text-stone-500">
          Loading index charts...
        </div>
      ) : errorMessage ? (
        <div className="rounded-[2rem] border border-red-200 bg-red-50 p-8 text-red-700">
          {errorMessage}
        </div>
      ) : (
        <div className="grid gap-6">
          {indexSeries.map((series) => (
            <div key={series.symbol}>
              <SP500Chart
                points={series.points}
                label={series.label}
                description={
                  HOMEPAGE_INDEXES.find((item) => item.symbol === series.symbol)?.description || ""
                }
                timeframe={timeframesBySymbol[series.symbol] ?? "month"}
                onTimeframeChange={(value) =>
                  setTimeframesBySymbol((prev) => ({ ...prev, [series.symbol]: value }))
                }
                variant={indexSeries.findIndex((item) => item.symbol === series.symbol) % 2 === 0 ? "sand" : "grey"}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
