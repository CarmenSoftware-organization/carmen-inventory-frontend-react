/**
 * Font scale — ผู้ใช้ปรับขนาดทั้ง UI ได้ 5 ระดับจากเมนูโปรไฟล์
 *
 * ทำงานที่ root font-size ไม่ใช่ที่ token `--text-*` เพราะทั้งแอปวัดด้วย `rem`
 * (px literal เหลือ 8 จุด และทุกจุดเป็น border/ring ที่ควรคงที่อยู่แล้ว) การขยับ
 * root จึงขยายตัวอักษร ระยะห่าง และความสูงแถวพร้อมกันเป็นสัดส่วนเดียว — ถ้าขยาย
 * เฉพาะตัวอักษร มันจะล้นเซลล์ที่ความสูงคงที่ เช่น badge ใน DataGrid ที่ fix ไว้
 * `height: 0.875rem`
 *
 * ค่า % จริงของแต่ละระดับอยู่ใน styles/globals.css — ที่นี่ถือแค่ชื่อ
 */

export const FONT_SCALES = [
  "small",
  "normal",
  "big",
  "bigger",
  "biggest",
] as const;

export type FontScale = (typeof FONT_SCALES)[number];

export const DEFAULT_FONT_SCALE: FontScale = "normal";

export const FONT_SCALE_STORAGE_KEY = "carmen.font-scale";

const isFontScale = (value: unknown): value is FontScale =>
  FONT_SCALES.includes(value as FontScale);

/** อ่านค่าที่เก็บไว้ — ค่าที่ไม่รู้จักหรือ storage ใช้ไม่ได้คืน default */
export function readStoredScale(): FontScale {
  try {
    const raw = localStorage.getItem(FONT_SCALE_STORAGE_KEY);
    if (isFontScale(raw)) return raw;
  } catch {
    // storage unavailable (private mode / quota)
  }
  return DEFAULT_FONT_SCALE;
}

/**
 * ตั้ง class บน <html> แล้วจำค่าไว้
 *
 * `normal` ไม่มี class เป็นของตัวเอง — เป็น state ที่ไม่ต้องประกาศ ผู้ใช้ที่ไม่เคย
 * แตะ setting นี้จึงได้ DOM เดิมทุกประการ
 */
export function applyScale(scale: FontScale): void {
  const root = document.documentElement;
  for (const known of FONT_SCALES) {
    root.classList.remove(`font-scale-${known}`);
  }
  if (scale !== DEFAULT_FONT_SCALE) {
    root.classList.add(`font-scale-${scale}`);
  }
  try {
    localStorage.setItem(FONT_SCALE_STORAGE_KEY, scale);
  } catch {
    // storage unavailable — มีผลเฉพาะ session นี้
  }
}
