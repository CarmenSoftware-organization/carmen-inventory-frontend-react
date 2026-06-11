import CreditTermComponent from "./_components/credit-term-component";

/**
 * หน้ารายการ Credit Term ของโมดูล Configuration ใช้เป็น route entry point
 * @returns React element ของหน้ารายการ Credit Term
 * @example
 * // route: /config/credit-term
 * export default function CreditTermPage()
 */
export default function CreditTermPage() {
  return <CreditTermComponent />;
}

export const Component = CreditTermPage;
