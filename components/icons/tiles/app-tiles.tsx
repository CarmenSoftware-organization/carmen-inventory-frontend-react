/**
 * Carmen Tile System — AppTiles (10 module tiles, Google Workspace style)
 */

import {
  BarChart,
  DashboardGrid,
  ProductCube,
  Shield,
  TileBase,
  WindowGrid,
  type TileRenderer,
} from "./primitives";

export const AppTiles: Record<string, TileRenderer> = {
  // Dashboard — mini grid of cards
  dashboard: ({ palette }) => (
    <>
      <TileBase palette={palette} />
      <DashboardGrid palette={palette} />
    </>
  ),

  // Procurement — shopping cart
  procurement: ({ palette }) => (
    <>
      <TileBase palette={palette} />
      {/* Handle — angled bar from upper-left */}
      <path
        d="M 7 11 H 11 L 14 17"
        stroke="#fff"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Basket body — trapezoid */}
      <path d="M 12 17 H 33 L 30 28 H 15 Z" fill="#fff" />
      {/* Accent rim */}
      <rect x="12" y="17" width="21" height="2.4" style={{ fill: palette.accent }} />
      {/* Vertical slats inside basket */}
      <rect x="18" y="20" width="1.2" height="7" rx="0.4" style={{ fill: palette.shadow }} opacity="0.25" />
      <rect x="22" y="20" width="1.2" height="7" rx="0.4" style={{ fill: palette.shadow }} opacity="0.25" />
      <rect x="26" y="20" width="1.2" height="7" rx="0.4" style={{ fill: palette.shadow }} opacity="0.25" />
      {/* Wheels */}
      <circle cx="18" cy="31" r="2.2" style={{ fill: palette.shadow }} />
      <circle cx="27" cy="31" r="2.2" style={{ fill: palette.shadow }} />
    </>
  ),

  // Products — package box with tape + tag
  productManagement: ({ palette }) => (
    <>
      <TileBase palette={palette} />
      <ProductCube palette={palette} />
      <circle cx="25" cy="22" r="2.2" style={{ fill: palette.shadow }} />
      <circle cx="25" cy="22" r="0.8" fill="#fff" />
    </>
  ),

  // Vendors — two buildings (handshake-ish)
  vendorManagement: ({ palette }) => (
    <>
      <TileBase palette={palette} />
      <rect x="8" y="14" width="10" height="17" rx="1.5" fill="#fff" />
      <WindowGrid fill={palette.base} x={10.5} y={17} cols={2} rows={2} colGap={3.5} rowGap={4} size={2} opacity={0.6} />
      <rect x="20" y="10" width="12" height="21" rx="1.5" style={{ fill: palette.accent }} />
      <WindowGrid fill={palette.shadow} x={22.5} y={14} cols={2} rows={3} colGap={4} rowGap={4} size={2} opacity={0.6} />
    </>
  ),

  // Store Ops — storefront with awning
  storeOperations: ({ palette }) => (
    <>
      <TileBase palette={palette} />
      <rect x="8" y="18" width="24" height="14" rx="1.5" fill="#fff" />
      <path d="M 7 12 H 33 L 31 18 H 9 Z" style={{ fill: palette.accent }} />
      <path d="M 14 12 V 18 M 20 12 V 18 M 26 12 V 18" style={{ stroke: palette.shadow }} strokeWidth="0.8" opacity="0.55" />
      <rect x="17.5" y="22" width="5" height="10" style={{ fill: palette.base }} opacity="0.85" />
      <circle cx="21.3" cy="27" r="0.5" fill="#fff" />
      <rect x="11" y="22" width="4.5" height="4" rx="0.4" style={{ fill: palette.base }} opacity="0.45" />
      <rect x="24.5" y="22" width="4.5" height="4" rx="0.4" style={{ fill: palette.base }} opacity="0.45" />
    </>
  ),

  // Inventory — stacked boxes
  inventoryManagement: ({ palette }) => (
    <>
      <TileBase palette={palette} />
      <rect x="14" y="9" width="14" height="10" rx="1.4" style={{ fill: palette.accent }} />
      <rect x="14" y="12.5" width="14" height="1" style={{ fill: palette.shadow }} opacity="0.35" />
      <rect x="8" y="20" width="12" height="11" rx="1.4" fill="#fff" />
      <rect x="8" y="23.5" width="12" height="1" style={{ fill: palette.shadow }} opacity="0.25" />
      <rect x="22" y="20" width="10" height="11" rx="1.4" fill="#fff" />
      <rect x="22" y="23.5" width="10" height="1" style={{ fill: palette.shadow }} opacity="0.25" />
    </>
  ),

  // Operations — chef hat
  operationPlan: ({ palette }) => (
    <>
      <TileBase palette={palette} />
      <path d="M 11 18 C 8 17 8 11 13 11 C 13 8 17 7 20 9 C 23 7 27 8 27 11 C 32 11 32 17 29 18 Z" fill="#fff" />
      <rect x="11" y="20" width="18" height="6" rx="1.2" style={{ fill: palette.accent }} />
      <rect x="11" y="22.5" width="18" height="0.9" style={{ fill: palette.shadow }} opacity="0.25" />
      <ellipse cx="20" cy="30" rx="9" ry="1.2" style={{ fill: palette.shadow }} opacity="0.25" />
    </>
  ),

  // Reports — document with rising bar chart
  report: ({ palette }) => (
    <>
      <TileBase palette={palette} />
      <path d="M 11 8 H 24 L 30 14 V 32 H 11 Z" fill="#fff" />
      <path d="M 24 8 V 14 H 30 L 24 8 Z" style={{ fill: palette.accent }} opacity="0.5" />
      <BarChart palette={palette} />
    </>
  ),

  // Configuration — gear
  config: ({ palette }) => (
    <>
      <TileBase palette={palette} />
      <g transform="translate(20 20)">
        <rect x="-3" y="-15" width="6" height="30" rx="1.5" fill="#fff" />
        <rect x="-3" y="-15" width="6" height="30" rx="1.5" fill="#fff" transform="rotate(60)" />
        <rect x="-3" y="-15" width="6" height="30" rx="1.5" fill="#fff" transform="rotate(120)" />
        <circle r="9.5" fill="#fff" />
        <circle r="4.5" style={{ fill: palette.base }} />
        <circle r="2.4" style={{ fill: palette.accent }} />
      </g>
    </>
  ),

  // System Admin — shield with check
  systemAdmin: ({ palette }) => (
    <>
      <TileBase palette={palette} />
      <Shield palette={palette} />
    </>
  ),
};
