const UNITS = ["B", "KB", "MB", "GB", "TB"] as const;

/**
 * แปลงจำนวน bytes เป็นข้อความขนาดไฟล์ (B, KB, MB, GB, TB)
 *
 * ต่ำกว่า 1 KB แสดงเป็นจำนวนเต็ม ที่เหลือทศนิยม 1 ตำแหน่ง — รูปแบบเดิมที่ตาราง
 * เอกสารใช้อยู่จึงไม่เปลี่ยน แต่ยอดรวมระดับ GB ไม่ต้องอ่านเป็น "3788.8 MB" อีก
 * (ของเดิมหยุดที่ MB เพราะเคยใช้กับไฟล์เดี่ยวเท่านั้น)
 *
 * @param bytes - ขนาดไฟล์เป็น bytes
 * @returns ข้อความแสดงขนาดไฟล์ในหน่วยที่เหมาะสม
 * @example
 * formatFileSize(1048576);    // "1.0 MB"
 * formatFileSize(3972891234); // "3.7 GB"
 * formatFileSize(0);          // "0 B"
 */
export const formatFileSize = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(1)} ${UNITS[unit]}`;
};
