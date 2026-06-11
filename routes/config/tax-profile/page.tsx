import TaxProfileComponent from "./_components/tax-profile-component";

/**
 * หน้ารายการ Tax Profile ของโมดูล Configuration ใช้เป็น route entry point
 * @returns React element ของหน้ารายการ Tax Profile
 * @example
 * // route: /config/tax-profile
 * export default function TaxProfilePage()
 */
export default function TaxProfilePage() {
  return <TaxProfileComponent />;
}

export const Component = TaxProfilePage;
