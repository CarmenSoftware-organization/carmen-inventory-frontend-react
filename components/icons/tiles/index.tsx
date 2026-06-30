/**
 * Carmen Tile System — illustrated SVG tiles per module + submodule
 *
 * - `AppTile` — 10 module tiles (Google Workspace style)
 * - `SubTile` — 56 submodule tiles (inherit parent module palette)
 *
 * Palette lives in `./palette`, shared SVG primitives in `./primitives`,
 * tile definitions in `./app-tiles` and `./sub-tiles`.
 */

import { AppTiles } from "./app-tiles";
import { getPalette } from "./palette";
import { TileBase } from "./primitives";
import { SubTiles } from "./sub-tiles";

export { APP_TILE_PALETTE } from "./palette";

function FallbackTile({ size }: { readonly size: number }) {
  return (
    <span
      aria-hidden
      className="bg-muted inline-block"
      style={{ width: size, height: size, borderRadius: size * 0.27 }}
    />
  );
}

interface AppTileProps {
  readonly name: string;
  readonly size?: number;
}

/** Render illustrated module tile — fallback เป็น squircle เปล่าเมื่อไม่รู้จัก name */
export function AppTile({ name, size = 44 }: AppTileProps) {
  const palette = getPalette(name);
  const Tile = AppTiles[name];
  if (!palette || !Tile) return <FallbackTile size={size} />;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      aria-hidden
      style={{ display: "block", color: "var(--tile-ink)" }}
    >
      <Tile palette={palette} />
    </svg>
  );
}

interface SubTileProps {
  readonly name: string;
  readonly parentName: string;
  readonly size?: number;
}

/** Render illustrated submodule tile — palette มาจาก parent module (fallback = config) */
export function SubTile({ name, parentName, size = 44 }: SubTileProps) {
  const palette = getPalette(parentName) ?? getPalette("config");
  const Tile = SubTiles[name];
  if (!palette || !Tile) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        aria-hidden
        style={{ display: "block", color: "var(--tile-ink)" }}
      >
        <TileBase palette={palette ?? { base: "var(--tile-surface)", accent: "var(--tile-accent)", shadow: "var(--tile-shadow)" }} />
        <circle cx="20" cy="20" r="6" fill="currentColor" opacity="0.5" />
      </svg>
    );
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      aria-hidden
      style={{ display: "block", color: "var(--tile-ink)" }}
    >
      <Tile palette={palette} />
    </svg>
  );
}
