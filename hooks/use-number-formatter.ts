
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
 * Hook คืนฟังก์ชัน format จำนวน (quantity) ตาม `quantity_format` ของ business unit
 * fallback 3 ทศนิยม, locale en-US
 * @returns (value) => formatted string
 * @example
 * const formatQty = useQuantityFormatter();
 * formatQty(1234.5); // "1,234.500"
 */
export function useQuantityFormatter(): Formatter {
  const { defaultBu } = useProfile();
  const decimals =
    defaultBu?.config?.quantity_format?.minimumIntegerDigits ?? 3;
  const locales = defaultBu?.config?.quantity_format?.locales ?? "en-US";
  return createFormatter(decimals, locales);
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
  const decimals =
    defaultBu?.config?.recipe_format?.minimumIntegerDigits ?? 5;
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
  const locales =
    defaultBu?.config?.amount_format?.locales ?? "en-US";
  return createFormatter(resolved, locales);
}
