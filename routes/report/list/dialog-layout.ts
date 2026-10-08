/**
 * class ของ grid ใน dialog รายงาน — ต้องเป็น string เต็มเพราะ Tailwind สแกนหา class จากซอร์ส
 * ห้ามประกอบเป็น `sm:col-span-${n}` (class จะไม่ถูกสร้าง)
 */
export const GRID_COLS: Record<number, string> = {
  1: "sm:grid-cols-1",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
  4: "sm:grid-cols-4",
};

export const COL_SPAN: Record<number, string> = {
  1: "sm:col-span-1",
  2: "sm:col-span-2",
  3: "sm:col-span-3",
  4: "sm:col-span-4",
};

/** ความกว้าง modal ตามจำนวนคอลัมน์ — 1 คอลัมน์ใช้ค่าเดิมของ DialogContent (sm:max-w-lg) */
export const MODAL_W: Record<number, string> = {
  1: "",
  2: "sm:max-w-3xl",
  3: "sm:max-w-5xl",
  4: "sm:max-w-5xl",
};
