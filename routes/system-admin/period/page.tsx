import PeriodComponent from "./_components/period-component";

/**
 * หน้ารายการงวดบัญชี (Period) ในโมดูล System Admin
 * @returns React element ของหน้า Period
 * @example
 * // ใช้เป็น Next.js route: /system-admin/period
 * <PeriodPage />
 */
export default function PeriodPage() {
  return <PeriodComponent />;
}

export const Component = PeriodPage;
