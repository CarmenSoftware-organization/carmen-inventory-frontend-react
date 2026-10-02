/**
 * ความสูง DataGridContainer ของหน้า list — สองสูตรเดียวทั้งแอป
 * (13rem เมื่อมี ActiveFilterBar กินอีกแถว) หน้าที่มีแถบสรุปเพิ่มเหนือตาราง
 * เขียน calc เองได้ แต่ต้องมี comment บอกว่าชดเชยอะไร
 */
export const LIST_GRID_MAX_H = {
  base: "max-h-[calc(100vh-10rem-3rem)]",
  withFilters: "max-h-[calc(100vh-13rem-3rem)]",
} as const;

export function listGridMaxH(hasActiveFilters: boolean): string {
  return hasActiveFilters ? LIST_GRID_MAX_H.withFilters : LIST_GRID_MAX_H.base;
}
