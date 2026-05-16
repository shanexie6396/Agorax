"use client";

import { useMemo, useState } from "react";

type IndexPoint = {
  date: string;
  close: number;
};

type SP500ChartProps = {
  points: IndexPoint[];
  label?: string;
  description?: string;
  timeframe?: "month" | "year";
  onTimeframeChange?: (value: "month" | "year") => void;
};

const CHART_WIDTH = 1200;
const CHART_HEIGHT = 460;
const PADDING = { top: 24, right: 32, bottom: 56, left: 64 };

function formatPrice(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function SP500Chart({
  points,
  label = "S&P 500",
  description = "",
  timeframe,
  onTimeframeChange,
}: SP500ChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const chart = useMemo(() => {
    if (points.length === 0) {
      return null;
    }

    const minPrice = Math.min(...points.map((point) => point.close));
    const maxPrice = Math.max(...points.map((point) => point.close));
    const range = Math.max(maxPrice - minPrice, 1);

    const plotWidth = CHART_WIDTH - PADDING.left - PADDING.right;
    const plotHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;

    const mapped = points.map((point, index) => {
      const x = PADDING.left + (index / Math.max(points.length - 1, 1)) * plotWidth;
      const y = PADDING.top + ((maxPrice - point.close) / range) * plotHeight;
      return { ...point, x, y };
    });

    const linePath = mapped
      .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
      .join(" ");

    const areaPath = [
      linePath,
      `L ${mapped[mapped.length - 1].x} ${CHART_HEIGHT - PADDING.bottom}`,
      `L ${mapped[0].x} ${CHART_HEIGHT - PADDING.bottom}`,
      "Z",
    ].join(" ");

    return {
      minPrice,
      maxPrice,
      mapped,
      linePath,
      areaPath,
      plotWidth,
      plotHeight,
    };
  }, [points]);

  if (!chart) {
    return (
      <div className="rounded-3xl border border-stone-200 bg-[#f2eee6] p-8 text-stone-500">
        No chart data available.
      </div>
    );
  }

  const activePoint =
    hoverIndex !== null ? chart.mapped[hoverIndex] : chart.mapped[chart.mapped.length - 1];

  const yTicks = 4;
  const tickValues = Array.from({ length: yTicks + 1 }, (_, idx) => {
    const t = idx / yTicks;
    return chart.maxPrice - (chart.maxPrice - chart.minPrice) * t;
  });

  const xTickIndexes = [0, Math.floor(chart.mapped.length * 0.25), Math.floor(chart.mapped.length * 0.5), Math.floor(chart.mapped.length * 0.75), chart.mapped.length - 1];

  return (
    <div className="rounded-[2rem] border border-stone-200 bg-[#fbf9f5] p-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-2xl font-semibold tracking-tight text-stone-800">{label}</h3>
          {description ? (
            <p className="mt-1 max-w-2xl text-sm leading-6 text-stone-600">{description}</p>
          ) : null}
        </div>
        <div className="flex items-end gap-3">
          {timeframe && onTimeframeChange ? (
            <div className="inline-flex rounded-2xl border border-stone-200 bg-[#f2eee6] p-1">
              <button
                type="button"
                onClick={() => onTimeframeChange("month")}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                  timeframe === "month"
                    ? "bg-[#fbf9f5] text-stone-800"
                    : "text-stone-600 hover:bg-[#ece6db] hover:text-stone-800"
                }`}
              >
                Past month
              </button>
              <button
                type="button"
                onClick={() => onTimeframeChange("year")}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                  timeframe === "year"
                    ? "bg-[#fbf9f5] text-stone-800"
                    : "text-stone-600 hover:bg-[#ece6db] hover:text-stone-800"
                }`}
              >
                Past year
              </button>
            </div>
          ) : null}
          <div className="rounded-2xl border border-stone-200 bg-[#f2eee6] px-4 py-3 text-right">
            <p className="text-xs uppercase tracking-wide text-stone-500">Selected</p>
            <p className="mt-1 text-lg font-semibold text-stone-800">{formatPrice(activePoint.close)}</p>
            <p className="text-xs text-stone-500">{formatDate(activePoint.date)}</p>
          </div>
        </div>
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          className="h-[28rem] w-full"
          onMouseLeave={() => setHoverIndex(null)}
          onMouseMove={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            const cursorX = ((event.clientX - rect.left) / rect.width) * CHART_WIDTH;
            const clampedX = Math.min(
              Math.max(cursorX, PADDING.left),
              CHART_WIDTH - PADDING.right
            );
            const ratio = (clampedX - PADDING.left) / chart.plotWidth;
            const nextIndex = Math.round(ratio * (chart.mapped.length - 1));
            setHoverIndex(nextIndex);
          }}
        >
          <rect
            x={PADDING.left}
            y={PADDING.top}
            width={chart.plotWidth}
            height={chart.plotHeight}
            fill="#f6f3ec"
            rx="20"
          />

          {tickValues.map((tickValue, index) => {
            const y =
              PADDING.top + (index / yTicks) * chart.plotHeight;
            return (
              <g key={tickValue}>
                <line
                  x1={PADDING.left}
                  y1={y}
                  x2={CHART_WIDTH - PADDING.right}
                  y2={y}
                  stroke="#d6d3d1"
                  strokeDasharray="4 6"
                />
                <text
                  x={PADDING.left - 12}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="12"
                  fill="#78716c"
                >
                  {formatPrice(tickValue)}
                </text>
              </g>
            );
          })}

          {xTickIndexes.map((tickIndex) => {
            const point = chart.mapped[tickIndex];
            if (!point) return null;
            return (
              <text
                key={`${point.date}-${tickIndex}`}
                x={point.x}
                y={CHART_HEIGHT - 20}
                textAnchor="middle"
                fontSize="12"
                fill="#78716c"
              >
                {new Date(`${point.date}T00:00:00Z`).toLocaleDateString("en-US", {
                  month: "short",
                })}
              </text>
            );
          })}

          <path d={chart.areaPath} fill="#d6c5a7" opacity="0.35" />
          <path d={chart.linePath} fill="none" stroke="#57534e" strokeWidth="3" />

          {activePoint ? (
            <>
              <line
                x1={activePoint.x}
                y1={PADDING.top}
                x2={activePoint.x}
                y2={CHART_HEIGHT - PADDING.bottom}
                stroke="#78716c"
                strokeDasharray="4 6"
              />
              <circle cx={activePoint.x} cy={activePoint.y} r="6" fill="#57534e" />
              <circle cx={activePoint.x} cy={activePoint.y} r="10" fill="transparent" stroke="#a8a29e" />
            </>
          ) : null}
        </svg>
      </div>
    </div>
  );
}
