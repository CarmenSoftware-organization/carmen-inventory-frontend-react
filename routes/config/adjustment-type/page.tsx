import AdjustmentTypeComponent from "./_components/adjustment-type-component";

/**
 * หน้ารายการ Adjustment Type ของโมดูล Configuration
 *
 * Server Component ตั้ง metadata title แล้ว render `AdjustmentTypeComponent`
 * ซึ่งใช้ `ConfigListTemplate` แบบ page-based
 *
 * @returns React element ของหน้ารายการ Adjustment Type
 * @example
 * ```tsx
 * // route: /config/adjustment-type
 * <AdjustmentTypePage />
 * ```
 */
export default function AdjustmentTypePage() {
  return <AdjustmentTypeComponent />;
}

export const Component = AdjustmentTypePage;
