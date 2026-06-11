/** ตัดสระไทย/วรรณยุกต์/ไม้ออก เก็บเฉพาะพยัญชนะ + อักษรอื่น ๆ */
function cleanThaiName(name: string): string {
  const thaiVowelsAndMarks = /[ะ-ฺ็-๎]/g;
  const leadingThaiFrontVowels = /^[เ-ไ]+/;
  return name
    .trim()
    .replace(leadingThaiFrontVowels, "")
    .replace(thaiVowelsAndMarks, "");
}

/**
 * สกัด initials สำหรับ avatar — รองรับชื่อไทยที่นำหน้าด้วยสระ
 * (ตัด สระไทย + วรรณยุกต์ก่อน แล้วค่อยหยิบพยัญชนะ)
 *
 * - first + last → ตัวแรกของแต่ละชื่อ ("จอห์น โดว์" → "จด", "JOHN DOE" → "JD")
 * - first อย่างเดียว → 2 ตัวอักษรแรกของชื่อ
 * - ว่างทั้งคู่ → "U"
 */
export function formatName(firstname?: string, lastname?: string): string {
  const f = cleanThaiName(firstname ?? "");
  const l = cleanThaiName(lastname ?? "");
  if (f && l) return (f[0] + l[0]).toUpperCase();
  if (f) return f.slice(0, 2).toUpperCase();
  return "U";
}
