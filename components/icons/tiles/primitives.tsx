/**
 * Carmen Tile System — shared SVG primitives
 *
 * 40×40 viewBox. ใช้ร่วมกันทั้ง AppTiles และ SubTiles.
 */

import type { Palette } from "./palette";

export type TileRenderer = (props: {
  readonly palette: Palette;
}) => React.JSX.Element;

/** Squircle path (superellipse-ish) — 40×40 viewBox, ~27% rounded */
const SQ = (size = 40, r = 11) =>
  `M ${r} 0 H ${size - r} Q ${size} 0 ${size} ${r} V ${size - r} Q ${size} ${size} ${size - r} ${size} H ${r} Q 0 ${size} 0 ${size - r} V ${r} Q 0 0 ${r} 0 Z`;

/** Filled base squircle + subtle top-edge highlight (ใช้ทั้ง AppTile + SubTile) */
export function TileBase({ palette }: { readonly palette: Palette }) {
  return (
    <>
      <path d={SQ()} style={{ fill: palette.base }} />
      <path
        d="M 0 0 H 40 V 22 Q 30 16 20 16 T 0 22 Z"
        fill="#fff"
        opacity="0.08"
      />
    </>
  );
}

/* ───────── Paper / Box / surfaces ───────── */

interface PaperProps {
  readonly palette: Palette;
  readonly x?: number;
  readonly y?: number;
  readonly w?: number;
  readonly h?: number;
  readonly fold?: number;
  readonly accent?: boolean;
}
export function Paper({
  palette,
  x = 11,
  y = 8,
  w = 19,
  h = 24,
  fold = 6,
  accent = true,
}: PaperProps) {
  const right = x + w;
  const bottom = y + h;
  const foldX = right - fold;
  const foldY = y + fold;
  return (
    <>
      <path
        d={`M ${x} ${y} H ${foldX} L ${right} ${foldY} V ${bottom} H ${x} Z`}
        fill="#fff"
      />
      {accent && (
        <path
          d={`M ${foldX} ${y} V ${foldY} H ${right} Z`}
          style={{ fill: palette.accent }}
          opacity="0.5"
        />
      )}
    </>
  );
}

interface BoxProps {
  readonly palette: Palette;
  readonly x?: number;
  readonly y?: number;
  readonly w?: number;
  readonly h?: number;
  readonly accentTop?: boolean;
}
export function Box({
  palette,
  x = 9,
  y = 12,
  w = 22,
  h = 18,
  accentTop = true,
}: BoxProps) {
  return (
    <>
      <rect x={x} y={y} width={w} height={h} rx="1.6" fill="#fff" />
      {accentTop && (
        <rect
          x={x}
          y={y + h * 0.18}
          width={w}
          height="1.2"
          style={{ fill: palette.shadow }}
          opacity="0.25"
        />
      )}
    </>
  );
}

export function Clipboard({ palette }: { readonly palette: Palette }) {
  return (
    <>
      <rect x="10" y="11" width="20" height="22" rx="2" fill="#fff" />
      <rect
        x="15"
        y="8"
        width="10"
        height="5"
        rx="1.2"
        style={{ fill: palette.accent }}
      />
      <rect
        x="17"
        y="9.5"
        width="6"
        height="2"
        rx="0.8"
        style={{ fill: palette.shadow }}
        opacity="0.5"
      />
    </>
  );
}

export function Calendar({ palette }: { readonly palette: Palette }) {
  return (
    <>
      <rect x="9" y="10" width="22" height="22" rx="2" fill="#fff" />
      <rect
        x="9"
        y="10"
        width="22"
        height="6"
        rx="2"
        style={{ fill: palette.accent }}
      />
      <rect
        x="12.5"
        y="7"
        width="2.4"
        height="6"
        rx="1"
        style={{ fill: palette.shadow }}
      />
      <rect
        x="25.1"
        y="7"
        width="2.4"
        height="6"
        rx="1"
        style={{ fill: palette.shadow }}
      />
    </>
  );
}

interface CheckBadgeProps {
  readonly palette: Palette;
  readonly cx?: number;
  readonly cy?: number;
  readonly r?: number;
}
export function CheckBadge({ palette, cx = 28, cy = 28, r = 5 }: CheckBadgeProps) {
  return (
    <>
      <circle cx={cx} cy={cy} r={r} style={{ fill: palette.accent }} />
      <path
        d={`M ${cx - 2.4} ${cy + 0.2} L ${cx - 0.4} ${cy + 2.2} L ${cx + 2.6} ${cy - 1.4}`}
        style={{ stroke: palette.shadow }}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </>
  );
}

interface LinesProps {
  readonly palette: Palette;
  readonly x?: number;
  readonly y?: number;
  readonly lengths?: readonly number[];
  readonly gap?: number;
}
export function Lines({
  palette,
  x = 14,
  y = 17,
  lengths = [11, 9, 7],
  gap = 3.4,
}: LinesProps) {
  return (
    <>
      {lengths.map((len, i) => (
        <rect
          key={i}
          x={x}
          y={y + i * gap}
          width={len}
          height="1.4"
          rx="0.7"
          style={{ fill: palette.base }}
          opacity="0.35"
        />
      ))}
    </>
  );
}

/* ───────── Shared shapes (dedup across tiles) ───────── */

/** Shield outline + accent check — ใช้ใน systemAdmin (AppTile) และ role (SubTile) */
export function Shield({ palette }: { readonly palette: Palette }) {
  return (
    <>
      <path
        d="M 20 7 L 31 11 V 19 C 31 25.5 26.5 30 20 33 C 13.5 30 9 25.5 9 19 V 11 Z"
        fill="#fff"
      />
      <path
        d="M 14.5 19.5 L 18.5 23.5 L 25.5 16"
        style={{ stroke: palette.accent }}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </>
  );
}

/** White map-marker body — contents (icon ข้างใน) ส่งผ่าน children */
export function Pin({ children }: { readonly children?: React.ReactNode }) {
  return (
    <>
      <path
        d="M 20 8 C 14 8 11 13 11 17 C 11 23 20 32 20 32 C 20 32 29 23 29 17 C 29 13 26 8 20 8 Z"
        fill="#fff"
      />
      {children}
    </>
  );
}

/** Isometric product cube (white body + accent top + shadow edge) */
export function ProductCube({ palette }: { readonly palette: Palette }) {
  return (
    <>
      <path d="M 20 9 L 31 13.5 V 26 L 20 30.5 L 9 26 V 13.5 Z" fill="#fff" />
      <path
        d="M 20 9 L 31 13.5 L 20 18 L 9 13.5 Z"
        style={{ fill: palette.accent }}
      />
      <rect
        x="18.6"
        y="9"
        width="2.8"
        height="21.5"
        style={{ fill: palette.shadow }}
        opacity="0.35"
      />
    </>
  );
}

/** Rising bar chart + trend line — ใช้ใน report (AppTile) และ reportList (SubTile) */
export function BarChart({ palette }: { readonly palette: Palette }) {
  return (
    <>
      <rect x="14" y="24" width="2.6" height="5" rx="0.4" style={{ fill: palette.accent }} />
      <rect x="18" y="21" width="2.6" height="8" rx="0.4" style={{ fill: palette.accent }} />
      <rect x="22" y="17" width="2.6" height="12" rx="0.4" style={{ fill: palette.accent }} />
      <path
        d="M 14.5 22 L 19 19 L 23 15"
        style={{ stroke: palette.base }}
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </>
  );
}

/** Mini dashboard grid (4 cards) — ใช้ใน dashboard tile ทั้ง App/Sub (rx ต่างกัน) */
export function DashboardGrid({
  palette,
  rx = 1.8,
}: {
  readonly palette: Palette;
  readonly rx?: number;
}) {
  return (
    <>
      <rect x="9" y="9" width="9" height="14" rx={rx} fill="#fff" />
      <rect x="9" y="25" width="9" height="6" rx={rx} style={{ fill: palette.accent }} />
      <rect x="20" y="9" width="11" height="7" rx={rx} style={{ fill: palette.accent }} />
      <rect x="20" y="18" width="11" height="13" rx={rx} fill="#fff" />
    </>
  );
}

interface WindowGridProps {
  /** resolved color string (e.g. palette.base / palette.shadow) */
  readonly fill: string;
  readonly x: number;
  readonly y: number;
  readonly cols: number;
  readonly rows: number;
  readonly colGap?: number;
  readonly rowGap?: number;
  readonly size?: number;
  readonly opacity?: number;
}
/** Grid of small square building windows — ใช้ใน vendor/department/vendorManagement */
export function WindowGrid({
  fill,
  x,
  y,
  cols,
  rows,
  colGap = 4.3,
  rowGap = 4.5,
  size = 2.4,
  opacity = 0.55,
}: WindowGridProps) {
  const cells = Array.from({ length: rows * cols }, (_, i) => ({
    row: Math.floor(i / cols),
    col: i % cols,
  }));
  return (
    <>
      {cells.map(({ row, col }) => (
        <rect
          key={`${row}-${col}`}
          x={x + col * colGap}
          y={y + row * rowGap}
          width={size}
          height={size}
          style={{ fill }}
          opacity={opacity}
        />
      ))}
    </>
  );
}

interface GlyphProps {
  readonly children: React.ReactNode;
  readonly x: number;
  readonly y: number;
  readonly size: number;
  /** resolved color string (e.g. palette.base / palette.shadow) */
  readonly fill: string;
  readonly anchor?: "start" | "middle";
  readonly opacity?: number;
}
/** Bold sans-serif symbol glyph ($, €, %, #) — ใช้ใน config / pricing tiles */
export function Glyph({ children, x, y, size, fill, anchor, opacity }: GlyphProps) {
  return (
    <text
      x={x}
      y={y}
      fontSize={size}
      fontWeight="700"
      fontFamily="sans-serif"
      style={{ fill }}
      textAnchor={anchor}
      opacity={opacity}
    >
      {children}
    </text>
  );
}
