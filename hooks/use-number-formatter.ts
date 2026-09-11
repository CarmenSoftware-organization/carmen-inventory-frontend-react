import { DEFAULT_QTY_DECIMALS } from "@/components/ui/input/qty-decimals";
import { useProfile } from "@/hooks/use-profile";

type Formatter = (value: number | null | undefined) => string;

/**
 * สร้าง formatter จำนวนเลขตาม decimals + locales ที่กำหนด
 * @param decimals - จำนวนทศนิยม (fixed both min/max)
 * @param locales - locale สำหรับ Intl.NumberFormat
 * @returns ฟังก์ชัน format (value) → string ("" เมื่อ null/NaN)
 */
function createFormatter(decimals: number, locales: string): Formatter {
  return (value) => {
    if (value == null || Number.isNaN(value)) return "";
    return new Intl.NumberFormat(locales, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(Number(value));
  };
}

/**
 * Hook คืนฟังก์ชัน format จำนวน (quantity) — locale ตาม `quantity_format` ของ BU
 *
 * **ทศนิยมต้องส่งมาจาก `decimal_place` ของหน่วยที่เลือก** (`useUnitDecimals`)
 * ตัวเดียวกับที่ `capQtyDecimals` ใช้คุมว่าพิมพ์ได้กี่ตำแหน่ง — เห็นเท่าที่พิมพ์ได้
 * ไม่ส่งมา = `DEFAULT_QTY_DECIMALS` (2) ซึ่งเป็น fallback ตัวเดียวกับฝั่ง input
 *
 * ⚠️ **ห้ามกลับไปอ่าน `quantity_format.minimumIntegerDigits`** — ของ Intl คีย์นั้น
 * แปลว่า "จำนวนหลักหน้าจุด" ไม่ใช่หลังจุด ของเดิมเอามาใช้เป็นจำนวนทศนิยม (fallback 3)
 * หน่วยที่ decimal_place = 2 จึงโชว์ 2.500 ทั้งที่พิมพ์ได้แค่ 2 ตำแหน่ง · `NumberFormat`
 * ใน types/profile.ts ไม่มีคีย์ที่หมายถึงทศนิยมจริงเลย backend ส่งมาแค่นี้ (ดู
 * comment เรื่องเดียวกันใน components/ui/input/qty-decimals.ts)
 *
 * @param decimals - ทศนิยมของหน่วยนั้น (default `DEFAULT_QTY_DECIMALS`)
 * @returns (value) => formatted string
 * @example
 * const decimals = useUnitDecimals(productId, unitId); // kg → 2
 * const formatQty = useQuantityFormatter(decimals);
 * formatQty(1234.5); // "1,234.50"
 */
export function useQuantityFormatter(decimals?: number): Formatter {
  const { defaultBu } = useProfile();
  const resolved = decimals ?? DEFAULT_QTY_DECIMALS;
  const locales = defaultBu?.config?.quantity_format?.locales ?? "en-US";
  return createFormatter(resolved, locales);
}

/**
 * Hook คืนฟังก์ชัน format จำนวนสูตร (recipe) ตาม `recipe_format` ของ business unit
 * fallback 5 ทศนิยม, locale en-US
 * @returns (value) => formatted string
 * @example
 * const formatRecipe = useRecipeFormatter();
 * formatRecipe(0.12345); // "0.12345"
 */
export function useRecipeFormatter(): Formatter {
  const { defaultBu } = useProfile();
  const decimals = defaultBu?.config?.recipe_format?.minimumIntegerDigits ?? 5;
  const locales = defaultBu?.config?.recipe_format?.locales ?? "en-US";
  return createFormatter(decimals, locales);
}

/**
 * Hook คืนฟังก์ชัน format จำนวนเงิน (amount) ตาม `default_currency.decimal_places`
 * fallback 2 ทศนิยม, locale en-US — รองรับ override ต่อ call
 * @param decimals - override decimals (เช่น per-item currency)
 * @returns (value) => formatted string
 * @example
 * const formatAmount = useAmountFormatter();
 * formatAmount(1234.5); // "1,234.50"
 */
export function useAmountFormatter(decimals?: number): Formatter {
  const { defaultBu } = useProfile();
  const resolved =
    decimals ?? defaultBu?.config?.default_currency?.decimal_places ?? 2;
  const locales = defaultBu?.config?.amount_format?.locales ?? "en-US";
  return createFormatter(resolved, locales);
}
