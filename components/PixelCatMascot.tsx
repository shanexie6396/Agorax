"use client";

import type { HTMLAttributes } from "react";

type Pixel = "empty" | "grey" | "dark" | "white";

const PIXEL_MAP: Pixel[][] = [
  ["empty", "empty", "grey", "empty", "empty", "grey", "empty", "empty"],
  ["empty", "grey", "grey", "grey", "grey", "grey", "grey", "empty"],
  ["grey", "grey", "dark", "grey", "grey", "dark", "grey", "grey"],
  ["grey", "grey", "grey", "grey", "grey", "grey", "grey", "grey"],
  ["grey", "white", "grey", "grey", "grey", "grey", "white", "grey"],
  ["grey", "grey", "grey", "dark", "dark", "grey", "grey", "grey"],
  ["empty", "grey", "white", "grey", "grey", "white", "grey", "empty"],
  ["empty", "grey", "grey", "empty", "empty", "grey", "grey", "empty"],
  ["empty", "grey", "grey", "grey", "grey", "grey", "grey", "empty"],
  ["grey", "grey", "empty", "grey", "grey", "empty", "grey", "grey"],
];

const COLOR_BY_PIXEL: Record<Pixel, string> = {
  empty: "transparent",
  grey: "#8f98a3",
  dark: "#4b5563",
  white: "#f8fafc",
};

type PixelCatMascotProps = HTMLAttributes<HTMLDivElement>;

export function PixelCatMascot({ className = "", ...rest }: PixelCatMascotProps) {
  return (
    <div
      className={`inline-flex items-center justify-center drop-shadow-[0_6px_12px_rgba(33,24,15,0.25)] ${className}`}
      {...rest}
    >
      <div
        className="grid"
        style={{
          gridTemplateColumns: "repeat(8, 10px)",
          gridTemplateRows: "repeat(10, 10px)",
          gap: "0px",
        }}
        aria-label="Pixel cat mascot"
      >
        {PIXEL_MAP.flat().map((pixel, idx) => (
          <span
            key={idx}
            style={{
              width: 10,
              height: 10,
              backgroundColor: COLOR_BY_PIXEL[pixel],
              borderRadius: 0,
            }}
          />
        ))}
      </div>
    </div>
  );
}
