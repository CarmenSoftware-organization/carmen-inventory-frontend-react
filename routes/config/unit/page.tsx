import UnitComponent from "./_components/unit-component";

/**
 * หน้ารายการ Unit (หน่วยนับ)
 *
 * Server Component ที่ตั้ง metadata title แล้ว render
 * `UnitComponent` (client component) ซึ่งใช้ `ConfigListTemplate`
 * ในการแสดงรายการ Unit พร้อม dialog สำหรับเพิ่ม/แก้ไข
 *
 * @returns JSX element ของหน้ารายการ Unit
 * @example
 * ```tsx
 * // route: /config/unit
 * <UnitPage />
 * ```
 */
export default function UnitPage() {
  return <UnitComponent />;
}

export const Component = UnitPage;
