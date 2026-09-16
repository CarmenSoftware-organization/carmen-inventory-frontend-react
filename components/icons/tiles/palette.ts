/**
 * Carmen Tile System — module palette
 *
 * Single-accent design (ตาม docs/DESIGN.md): ทุก module ใช้โทนเดียวกัน —
 * พื้น primary-tint อ่อน + ภาพในสี primary. เลิกใช้สีประจำ module รายตัว
 * (rainbow) เพื่อให้ไปทางเดียวกับ branding. ค่าทั้งหมดเป็น CSS token ที่ derive
 * จาก var(--primary) ใน styles/module-colors.css → auto-adapt dark mode.
 * ความต่างระหว่าง module สื่อด้วย "รูปทรง" ของภาพ ไม่ใช่สี.
 */

export interface Palette {
  readonly base: string;
  readonly accent: string;
  readonly shadow: string;
}

const PRIMARY_TILE: Palette = {
  base: "var(--tile-surface)",
  accent: "var(--tile-accent)",
  shadow: "var(--tile-shadow)",
};

export const APP_TILE_PALETTE: Record<string, Palette> = {
  dashboard: PRIMARY_TILE,
  procurement: PRIMARY_TILE,
  productManagement: PRIMARY_TILE,
  vendorManagement: PRIMARY_TILE,
  storeOperations: PRIMARY_TILE,
  inventoryManagement: PRIMARY_TILE,
  operationPlan: PRIMARY_TILE,
  report: PRIMARY_TILE,
  accounting: PRIMARY_TILE,
  config: PRIMARY_TILE,
  systemAdmin: PRIMARY_TILE,
};

export function getPalette(name: string): Palette | null {
  return APP_TILE_PALETTE[name] ?? null;
}
