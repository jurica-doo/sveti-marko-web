import type { SVGProps } from "react";

import type { Locale } from "@/lib/i18n/config";

/**
 * Small, flat inline flags for the language switcher — not emoji. Emoji
 * flags render as a two-letter country code on plenty of desktop browsers
 * without a colour-emoji font installed (most of Windows, some Linux), which
 * would turn a "flags only, no text" switcher into exactly the text it was
 * built to avoid. An SVG always looks the same everywhere.
 *
 * Each is drawn on a 3:2 `viewBox` and meant to be cropped into a circle by
 * its wrapper (`overflow-hidden rounded-full`) — `preserveAspectRatio="xMidYMid slice"`
 * fills that circle edge-to-edge instead of letterboxing.
 */

const VIEWBOX = "0 0 30 20";

function FlagSvg({
  children,
  ...rest
}: SVGProps<SVGSVGElement> & { children: React.ReactNode }) {
  return (
    <svg
      viewBox={VIEWBOX}
      preserveAspectRatio="xMidYMid slice"
      className="h-full w-full"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

/** Croatia — the šahovnica (checkerboard) is what makes it read as Croatia rather than the Netherlands, which shares the same stripe order. */
function FlagHR() {
  const cols = 5;
  const rows = 4;
  const cellW = 7 / cols;
  const cellH = 6 / rows;
  const cells = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const isRed = (row + col) % 2 === 0;
      cells.push(
        <rect
          key={`${row}-${col}`}
          x={col * cellW}
          y={row * cellH}
          width={cellW}
          height={cellH}
          fill={isRed ? "#FF0000" : "#FFFFFF"}
        />,
      );
    }
  }

  return (
    <FlagSvg>
      <rect width="30" height="20" fill="#FFFFFF" />
      <rect width="30" height="6.4" fill="#FF0000" />
      <rect y="13.6" width="30" height="6.4" fill="#171796" />
      <g transform="translate(11.5, 7)">
        <rect width="7" height="6" fill="#FFFFFF" stroke="#171796" strokeWidth="0.25" />
        {cells}
      </g>
    </FlagSvg>
  );
}

/** United Kingdom, for English — the conventional choice in language switchers. */
function FlagEN() {
  return (
    <FlagSvg>
      <rect width="30" height="20" fill="#00247D" />
      <path d="M0 0L30 20M30 0L0 20" stroke="#FFFFFF" strokeWidth="4.4" />
      <path d="M0 0L30 20M30 0L0 20" stroke="#CF142B" strokeWidth="1.6" />
      <path d="M15 0V20M0 10H30" stroke="#FFFFFF" strokeWidth="7" />
      <path d="M15 0V20M0 10H30" stroke="#CF142B" strokeWidth="2.6" />
    </FlagSvg>
  );
}

function FlagIT() {
  return (
    <FlagSvg>
      <rect width="10" height="20" fill="#009246" />
      <rect x="10" width="10" height="20" fill="#FFFFFF" />
      <rect x="20" width="10" height="20" fill="#CE2B37" />
    </FlagSvg>
  );
}

function FlagPL() {
  return (
    <FlagSvg>
      <rect width="30" height="10" fill="#FFFFFF" />
      <rect y="10" width="30" height="10" fill="#DC143C" />
    </FlagSvg>
  );
}

export const FLAGS: Record<Locale, () => React.JSX.Element> = {
  hr: FlagHR,
  en: FlagEN,
  it: FlagIT,
  pl: FlagPL,
};
