import CurrencyComponent from "./_components/currency-component";

/**
 * หน้ารายการ Currency ของโมดูล Configuration ใช้เป็น route entry point
 * @returns React element ของหน้ารายการ Currency
 * @example
 * // route: /config/currency
 * export default function CurrencyPage()
 */
export default function CurrencyPage() {
  return <CurrencyComponent />;
}

export const Component = CurrencyPage;
