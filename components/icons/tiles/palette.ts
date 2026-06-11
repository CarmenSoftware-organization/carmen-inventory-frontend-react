/**
 * Carmen Tile System — module palette
 *
 * Brand palette per module (base / accent / shadow) — fixed hex values
 * จาก Carmen Icon System design. Each palette ตั้งใจให้ accent มี hue ที่ต่าง
 * จาก base เพื่อความสะดุดตา (เช่น procurement: ม่วง + เหลือง)
 */

export interface Palette {
  readonly base: string;
  readonly accent: string;
  readonly shadow: string;
}

/** Module tile palette — source: Carmen Icon System (launcher-app-tiles.jsx) */
export const APP_TILE_PALETTE: Record<string, Palette> = {
  dashboard:           { base: "#1F6FEB", accent: "#9CC4FF", shadow: "#0F4FC4" },
  procurement:         { base: "#5B5BF6", accent: "#FFD466", shadow: "#3B3BC9" },
  productManagement:   { base: "#E08821", accent: "#FFE7B8", shadow: "#A35B0E" },
  vendorManagement:    { base: "#0FA76B", accent: "#7BE3B0", shadow: "#0A7E50" },
  storeOperations:     { base: "#0FB5A1", accent: "#FFD7B3", shadow: "#0A8074" },
  inventoryManagement: { base: "#EF6A1A", accent: "#FFC79B", shadow: "#B14507" },
  operationPlan:       { base: "#E5365A", accent: "#FFD6DD", shadow: "#A91E40" },
  report:              { base: "#5C6B7E", accent: "#9DF0B9", shadow: "#374454" },
  config:              { base: "#3D3D3D", accent: "#A8A8A8", shadow: "#1A1A1A" },
  systemAdmin:         { base: "#171717", accent: "#A6E550", shadow: "#000000" },
};

export function getPalette(name: string): Palette | null {
  return APP_TILE_PALETTE[name] ?? null;
}
