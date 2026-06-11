import PcComponent from "./_components/pc-component";

/**
 * หน้ารายการ Physical Count (การนับสต็อกจริง)
 * Route entry ของ /inventory-management/physical-count render PcComponent
 *
 * @returns React element ของหน้ารายการ physical count
 * @example
 * // เข้าถึงผ่าน URL: /inventory-management/physical-count
 * export default PhysicalCountPage;
 */
export default function PhysicalCountPage() {
  return <PcComponent />;
}

export const Component = PhysicalCountPage;
